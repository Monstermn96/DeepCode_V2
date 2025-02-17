import OpenAI from 'openai';

export type AIRequestType = 'challenge' | 'feedback' | 'evaluation';

export const SUPPORTED_LANGUAGES = ['C#', 'Java', 'Python'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
}

interface ChallengeResponse {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  starterCode: string;
  solution: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    description: string;
  }>;
  hints: string[];
}

interface FeedbackResponse {
  overallAssessment: string;
  codeQuality: number;
  strengths: string[];
  improvements: string[];
  bestPractices: string[];
  securityConcerns: string[];
  performanceSuggestions: string[];
}

interface EvaluationResponse {
  passed: boolean;
  results: boolean[];
  explanations: string[];
  performance: {
    timeComplexity: string;
    spaceComplexity: string;
    suggestions: string[];
  };
}

type AIResponseData = ChallengeResponse | FeedbackResponse | EvaluationResponse;

interface AIResponse {
  data: AIResponseData;
  metadata: {
    type: AIRequestType;
    model: string;
    duration_ms: number;
    languages: string[];
    usage: AIUsage;
  };
}

function calculateCost(usage: OpenAI.CompletionUsage | undefined): number {
  if (!usage) return 0;
  // GPT-4 pricing: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
  const promptCost = (usage.prompt_tokens / 1000) * 0.03;
  const completionCost = (usage.completion_tokens / 1000) * 0.06;
  return Number((promptCost + completionCost).toFixed(4));
}

const PROMPT_CONFIGS = {
  challenge: {
    systemPrompt: `You are a coding problem generator that creates well-structured programming challenges.
    Create diverse and unique problems each time. Always respond with valid JSON only.
    Focus on real-world scenarios and practical coding challenges.
    Include clear test cases and helpful hints.
    IMPORTANT: Only generate problems for these languages: ${SUPPORTED_LANGUAGES.join(', ')}.
    Ensure the code examples and solutions are idiomatic for the chosen language.`,
    responseFormat: {
      title: "Problem title",
      description: "Detailed problem description",
      difficulty: "easy|medium|hard",
      language: SUPPORTED_LANGUAGES.join('|'),
      starterCode: "Code template",
      solution: "Complete solution",
      testCases: [{
        input: "Test input",
        expectedOutput: "Expected output",
        description: "Test case description"
      }],
      hints: ["Hint 1", "Hint 2"]
    }
  },
  evaluation: {
    systemPrompt: `You are a code evaluator that tests submitted solutions against provided test cases.
    Provide detailed feedback on code quality, performance, and potential improvements.
    Always respond with valid JSON only.
    IMPORTANT: Only evaluate code for these languages: ${SUPPORTED_LANGUAGES.join(', ')}.
    Ensure feedback is specific to the language's best practices.`,
    responseFormat: {
      passed: "boolean",
      results: ["Array of test results"],
      feedback: "Detailed feedback",
      suggestions: ["Array of improvement suggestions"]
    }
  },
  feedback: {
    systemPrompt: `You are a code reviewer providing detailed feedback on code quality and best practices.
    Focus on actionable improvements and specific suggestions.
    Always respond with valid JSON only.
    Consider language-specific conventions and patterns.
    Provide a balanced view of strengths and areas for improvement.`,
    responseFormat: {
      overallAssessment: "Overall code assessment",
      codeQuality: "Numeric score (1-10)",
      strengths: ["Array of code strengths"],
      improvements: ["Array of suggested improvements"],
      bestPractices: ["Array of best practice recommendations"],
      securityConcerns: ["Array of security considerations"],
      performanceSuggestions: ["Array of performance optimization suggestions"]
    }
  }
};

export const aiService = {
  openai: null as OpenAI | null,

  getClient() {
    if (!this.openai) {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured. Please check your .env file.');
      }
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    }
    return this.openai;
  },

  async generateResponse<T extends AIResponseData>(
    type: AIRequestType,
    inputData: Record<string, any>
  ): Promise<AIResponse & { data: T }> {
    try {
      const config = PROMPT_CONFIGS[type];
      if (!config) {
        throw new Error(`Unsupported prompt type: ${type}`);
      }

      const startTime = Date.now();
      const completion = await this.getClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: config.systemPrompt },
          { 
            role: "user", 
            content: JSON.stringify(inputData)
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const duration = Date.now() - startTime;
      const cost = calculateCost(completion.usage);

      return {
        data: JSON.parse(completion.choices[0]?.message?.content || '{}') as T,
        metadata: {
          type,
          model: "gpt-4o-mini",
          duration_ms: duration,
          languages: inputData.languages || [],
          usage: {
            prompt_tokens: completion.usage?.prompt_tokens || 0,
            completion_tokens: completion.usage?.completion_tokens || 0,
            total_tokens: completion.usage?.total_tokens || 0,
            estimated_cost: cost
          }
        }
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('OpenAI API key is not configured correctly. Please check your environment variables.');
      }
      throw new Error('Failed to generate AI response');
    }
  },

  async generateChallenge(topic: string, languages: SupportedLanguage[] = []): Promise<AIResponse & { data: ChallengeResponse }> {
    const validLanguages = languages.filter(lang => SUPPORTED_LANGUAGES.includes(lang));
    if (validLanguages.length === 0) {
      validLanguages.push(SUPPORTED_LANGUAGES[0]); // Default to first supported language
    }

    return this.generateResponse<ChallengeResponse>('challenge', {
      topic,
      languages: validLanguages
    });
  },

  async getCodeFeedback(code: string, language: SupportedLanguage): Promise<AIResponse & { data: FeedbackResponse }> {
    return this.generateResponse<FeedbackResponse>('feedback', {
      code,
      language
    });
  },

  async evaluateCode(
    submission: string,
    testCases: Array<{ input: string; expectedOutput: string }>,
    language: SupportedLanguage
  ): Promise<AIResponse & { data: EvaluationResponse }> {
    return this.generateResponse<EvaluationResponse>('evaluation', {
      submission,
      testCases,
      language
    });
  }
}; 