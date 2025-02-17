import { type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import OpenAI from 'openai';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({ region: process.env.AWS_REGION });
const CACHE_DURATION = 3600; // 1 hour cache for successful responses

const PROMPT_CONFIGS = {
  challenge: {
    systemPrompt: `You are a coding problem generator that creates well-structured programming challenges. 
    Create diverse and unique problems each time. Always respond with valid JSON only.
    Focus on real-world scenarios and practical coding challenges.
    Include clear test cases and helpful hints.`,
    responseFormat: {
      title: "Problem title",
      description: "Detailed problem description",
      difficulty: "easy|medium|hard",
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
    Always respond with valid JSON only.`,
    responseFormat: {
      passed: "boolean",
      results: ["Array of test results"],
      feedback: "Detailed feedback",
      suggestions: ["Array of improvement suggestions"]
    }
  }
};

async function getOpenAIKey(): Promise<string> {
  try {
    const secret = await secretsManager.getSecretValue({ SecretId: 'openai-api-key' });
    if (!secret.SecretString) {
      throw new Error('Secret value is empty');
    }
    return secret.SecretString;
  } catch (error) {
    console.error('Error retrieving OpenAI API key:', error);
    throw new Error('Failed to retrieve OpenAI API key');
  }
}

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
  console.log('Processing request:', {
    method: event.requestContext.http.method,
    path: event.requestContext.http.path,
    timestamp: new Date().toISOString()
  });

  try {
    const openaiKey = await getOpenAIKey();
    const openai = new OpenAI({
      apiKey: openaiKey
    });

    if (!event.body) {
      throw new Error('Request body is required');
    }

    const { type = 'challenge', ...inputData } = JSON.parse(event.body);
    const config = PROMPT_CONFIGS[type as keyof typeof PROMPT_CONFIGS];

    if (!config) {
      throw new Error(`Unsupported prompt type: ${type}`);
    }

    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: JSON.stringify(inputData) }
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
      model: "gpt-4-turbo-preview"
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
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
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.type || 'UnknownError',
        timestamp: new Date().toISOString(),
        request_id: event.requestContext.requestId
      })
    };
  }
} 