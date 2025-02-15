import { type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import OpenAI from 'openai';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({ region: process.env.AWS_REGION });

const PROMPT_CONFIGS = {
  challenge: {
    systemPrompt: `You are a coding problem generator that creates well-structured programming challenges. 
    Create diverse and unique problems each time. Always respond with valid JSON only.`,
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

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
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

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        data: JSON.parse(completion.choices[0]?.message?.content || '{}'),
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0
        }
      })
    };
  } catch (error: any) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: error.message === 'Request body is required' ? 400 : 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.type || 'UnknownError',
        timestamp: new Date().toISOString()
      })
    };
  }
} 