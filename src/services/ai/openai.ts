import { post } from '@aws-amplify/api';

export type AIRequestType = 'challenge' | 'feedback' | 'evaluation';

interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ChallengeResponse {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
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
  usage: AIUsage;
}

export const aiService = {
  async generateResponse<T extends AIResponseData>(
    type: AIRequestType,
    inputData: Record<string, any>
  ): Promise<AIResponse & { data: T }> {
    try {
      const response = await post({
        apiName: 'ai',
        path: '/ai',
        options: {
          body: {
            type,
            ...inputData
          }
        }
      }) as unknown as AIResponse & { data: T };

      if (!response || !response.data) {
        throw new Error('Invalid response format from AI service');
      }

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to generate AI response');
    }
  },

  async generateChallenge(topic: string, languages: string[] = []): Promise<AIResponse & { data: ChallengeResponse }> {
    return this.generateResponse<ChallengeResponse>('challenge', {
      topic,
      languages
    });
  },

  async getCodeFeedback(code: string): Promise<AIResponse & { data: FeedbackResponse }> {
    return this.generateResponse<FeedbackResponse>('feedback', {
      code
    });
  },

  async evaluateCode(
    submission: string,
    testCases: Array<{ input: string; expectedOutput: string }>
  ): Promise<AIResponse & { data: EvaluationResponse }> {
    return this.generateResponse<EvaluationResponse>('evaluation', {
      submission,
      testCases
    });
  }
}; 