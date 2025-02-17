import { type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import OpenAI from 'openai';

const CACHE_DURATION = 3600; // 1 hour cache for successful responses
const SUPPORTED_LANGUAGES = ['C#', 'Java', 'Python'];

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
  }
};

function calculateCost(usage: OpenAI.CompletionUsage | undefined): number {
  if (!usage) return 0;
  // GPT-4 pricing: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
  const promptCost = (usage.prompt_tokens / 1000) * 0.03;
  const completionCost = (usage.completion_tokens / 1000) * 0.06;
  return Number((promptCost + completionCost).toFixed(4));
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  console.log('Request details:', {
    method: event.requestContext?.http?.method,
    path: event.requestContext?.http?.path,
    body: event.body,
    timestamp: new Date().toISOString()
  });

  try {
    // Verify OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    if (!event.body) {
      console.error('Request body is missing');
      throw new Error('Request body is required');
    }

    // Parse the request body
    const parsedBody = JSON.parse(event.body);
    console.log('Parsed request body:', {
      type: parsedBody.type,
      languages: parsedBody.languages,
    });

    const { type = 'challenge', languages = [], description = '', ...inputData } = parsedBody;
    
    // Validate languages
    const validLanguages = languages.filter((lang: string) => 
      SUPPORTED_LANGUAGES.includes(lang)
    );
    
    if (validLanguages.length === 0) {
      validLanguages.push(SUPPORTED_LANGUAGES[0]); // Default to first supported language
    }
    
    const config = PROMPT_CONFIGS[type as keyof typeof PROMPT_CONFIGS];

    if (!config) {
      throw new Error(`Unsupported prompt type: ${type}`);
    }

    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: config.systemPrompt },
        { 
          role: "user", 
          content: JSON.stringify({
            ...inputData,
            description,
            languages: validLanguages
          })
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });
    const duration = Date.now() - startTime;

    const cost = calculateCost(completion.usage);
    
    // Log detailed usage metrics
    console.log('Request metrics:', {
      type,
      duration_ms: duration,
      tokens: completion.usage,
      estimated_cost: cost,
      model: "gpt-4-turbo-preview",
      languages: validLanguages
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Cache-Control": `public, max-age=${CACHE_DURATION}`,
        "X-Response-Time": `${duration}ms`,
        "X-Token-Usage": JSON.stringify(completion.usage)
      },
      body: JSON.stringify({
        data: JSON.parse(completion.choices[0]?.message?.content || '{}'),
        metadata: {
          type,
          model: "gpt-4-turbo-preview",
          duration_ms: duration,
          languages: validLanguages,
          usage: {
            prompt_tokens: completion.usage?.prompt_tokens || 0,
            completion_tokens: completion.usage?.completion_tokens || 0,
            total_tokens: completion.usage?.total_tokens || 0,
            estimated_cost: cost
          }
        }
      })
    };
  } catch (error: any) {
    console.error('Error processing request:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    const statusCode = error.message === 'Request body is required' ? 400 : 
                      error.message.includes('API key') ? 503 :
                      error.message.includes('rate limit') ? 429 : 500;

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.type || 'UnknownError',
        timestamp: new Date().toISOString(),
        request_id: event.requestContext?.requestId
      })
    };
  }
} 