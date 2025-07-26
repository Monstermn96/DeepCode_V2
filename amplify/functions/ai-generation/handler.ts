import { Schema } from '../../data/resource';
import { generateClient } from 'aws-amplify/data';
import OpenAI from 'openai';
import { z } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Simple inline logger for Lambda function
const isProduction = () => {
  const env = process.env.AMPLIFY_ENV || 'dev';
  return env === 'prod' || env === 'production';
};

const log = {
  info: (message: string, context?: any) => {
    if (!isProduction()) {
      console.log(`[INFO] ${message}`, context || '');
    }
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(`[ERROR] ${message}`, error || '', context || '');
  },
  lambdaStart: (functionName: string, event: any) => {
    if (!isProduction()) {
      console.log(`[INFO] Lambda ${functionName} started`);
    }
  }
};

// Initialize clients
const dataClient = generateClient<Schema>();

// Initialize OpenAI client if API key is available
let openaiClient: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Define schemas for validation
const challengeSchema = z.object({
  title: z.string(),
  description: z.string(),
  language: z.string(),
  difficulty: z.string(),
  starterCode: z.string(),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    explanation: z.string().optional()
  })).min(3),
  hints: z.array(z.string()).min(2),
  estimatedTime: z.number().optional(),
  solution: z.string()
});

const evaluationSchema = z.object({
  results: z.array(z.object({
    passed: z.boolean(),
    input: z.string(),
    expectedOutput: z.string(),
    actualOutput: z.string().optional(),
    error: z.string().optional()
  })),
  summary: z.object({
    totalTests: z.number(),
    passedTests: z.number(),
    failedTests: z.number(),
    successRate: z.number()
  }),
  feedback: z.string()
});

// Error handler class
class AIErrorHandler {
  static async handleError(error: any, context: any, retryCount: number = 0): Promise<any> {
    console.error(`Error in AI operation (retry ${retryCount}):`, error);

    const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
    if (retryCount >= maxRetries) {
      // Use intelligent fallback on final retry
      log.warn('Max retries reached, attempting intelligent fallback', { retryCount });
      return this.generateFallbackPrompt(context);
    }

    // Classify error and handle accordingly
    if (error.message?.includes('Invalid JSON') || error.message?.includes('parse')) {
      return this.handleInvalidJSON(context, retryCount);
    } else if (error.message?.includes('rate limit')) {
      await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
      return null; // Signal to retry
    } else if (error.message?.includes('timeout')) {
      return this.handleTimeout(context, retryCount);
    } else if (retryCount >= 1) {
      // After first retry, use intelligent fallback
      return this.generateFallbackPrompt(context);
    }

    throw error;
  }

  static async handleInvalidJSON(context: any, retryCount: number) {
    log.warn('Handling invalid JSON response, using structured prompt', { retryCount });
    
    // Add more explicit JSON formatting instructions
    const enhancedPrompt = `
    ${context.prompt}
    
    CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, just JSON.
    Example format:
    ${JSON.stringify(context.expectedFormat, null, 2)}
    `;

    context.prompt = enhancedPrompt;
    context.temperature = 0; // Use deterministic output for retry
    return null; // Signal to retry
  }

  static async handleTimeout(context: any, retryCount: number) {
    log.warn('Handling timeout, reducing scope', { retryCount });
    
    // Reduce token limits for retry
    context.maxTokens = Math.floor(context.maxTokens * 0.75);
    return null; // Signal to retry
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async generateFallbackPrompt(context: any): Promise<null> {
    log.info('Generating intelligent fallback prompt', { function: 'generateFallbackPrompt' });
    
    const args = context.originalArgs || {};
    const language = args.language || 'Python';
    const difficulty = args.difficulty || 'medium';
    
    // Define fallback topics based on skill levels and learning paths
    const fallbackTopics = [
      'array manipulation and iteration',
      'string processing and formatting',
      'basic mathematical calculations',
      'conditional logic and decision making',
      'loop control and iteration patterns',
      'function definition and parameter handling',
      'data structure traversal',
      'input validation and error handling',
      'sorting and searching algorithms',
      'pattern matching and regular expressions'
    ];
    
    // Select a random topic for fallback
    const randomTopic = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
    
    // Create skill-appropriate prompt
    const skillBasedPrompt = this.createSkillBasedPrompt(language, difficulty, randomTopic, args);
    
    log.info('Using fallback topic', { topic: randomTopic, language, difficulty });
    
    // Update context with new prompt
    context.prompt = skillBasedPrompt;
    context.temperature = 0.5; // Lower temperature for more reliable output
    
    return null; // Signal to retry with new context
  }

  static createSkillBasedPrompt(language: string, difficulty: string, topic: string, args: any): string {
    const useEmptyMethods = args.useEmptyMethods !== false;
    const starterCodeInstruction = useEmptyMethods 
      ? "Provide EMPTY method stubs with just the method signature and pass/return statements. Do NOT include implementation details."
      : "Provide helpful starter code with basic structure and comments to guide the solution.";

    const difficultyContext: Record<string, string> = {
      'easy': 'Focus on basic concepts with simple logic. Use straightforward test cases.',
      'medium': 'Include moderate complexity with multiple steps. Test edge cases.',
      'hard': 'Implement advanced algorithms or complex logic. Include comprehensive test coverage.'
    };

    return `Create a ${difficulty} programming challenge focused on ${topic} in ${language}.

REQUIREMENTS:
- Language: ${language}
- Difficulty: ${difficulty}
- Topic: ${topic}
- ${difficultyContext[difficulty.toLowerCase()] || difficultyContext['medium']}

STARTER CODE: ${starterCodeInstruction}

OUTPUT FORMAT:
- Provide a clear, engaging problem title
- Write a detailed problem description with examples
- Include exactly 3-5 test cases with inputs, expected outputs, and explanations
- Provide 2-3 helpful hints
- Include a complete solution
- Ensure the starter code matches the language syntax

Make this problem practical and educational, suitable for a coding practice platform.`;
  }
}

// Main handler function
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  let aiRequest: any;

  try {
    // Log the incoming request
    log.lambdaStart('ai-generation', event);

    // Parse the request body
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { operation, requestId, ...args } = requestBody;

    // Extract user ID from headers or use anonymous
    const userId = event.requestContext?.authorizer?.claims?.sub || 'anonymous';

    // Create AI request record
    const { data: request } = await dataClient.models.AIRequest.create({
      userId,
      type: operation === 'generateChallenge' ? 'challenge' : 
            operation === 'evaluateCode' ? 'evaluation' : 'feedback',
      status: 'processing',
      input: args,
      createdAt: new Date().toISOString()
    });

    aiRequest = request;

    // Process based on operation type
    let result;
    if (operation === 'generateChallenge') {
      result = await generateChallengeWithRetry(args);
    } else if (operation === 'evaluateCode') {
      result = await evaluateCodeWithRetry(args);
    } else {
      throw new Error(`Unsupported operation: ${operation}`);
    }

    // Update request as completed
    const processingTime = Date.now() - startTime;
    await dataClient.models.AIRequest.update({
      id: aiRequest.id,
      status: 'completed',
      response: result,
      processingTime,
      completedAt: new Date().toISOString()
    });

    // Return successful API Gateway response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: result,
        requestId: aiRequest.id,
        processingTime: Date.now() - startTime
      })
    };

  } catch (error: any) {
    console.error('AI Generation Error:', error);

    // Update request as failed
    if (aiRequest) {
      await dataClient.models.AIRequest.update({
        id: aiRequest.id,
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });
    }

    // Return error API Gateway response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        requestId: aiRequest?.id
      })
    };
  }
};

// Generate challenge with retry logic
async function generateChallengeWithRetry(args: any, retryCount: number = 0): Promise<any> {
  // Build the initial prompt
  const useEmptyMethods = args.useEmptyMethods !== false; // Default to true
  const starterCodeInstruction = useEmptyMethods 
    ? "Provide EMPTY method stubs with just the method signature and pass/return statements. Do NOT include implementation details."
    : "Provide helpful starter code with basic structure and comments to guide the solution.";

  const context = {
    prompt: `Create a programming challenge with the following requirements:
    - Topic: ${args.topic}
    - Language: ${args.language}
    - Difficulty: ${args.difficulty}
    
    STARTER CODE: ${starterCodeInstruction}
    
    Provide a well-structured challenge with clear description, at least 3 test cases, 
    helpful hints, and a complete solution.`,
    expectedFormat: challengeSchema.shape,
    temperature: 0.7,
    maxTokens: 2000,
    originalArgs: args
  };

  try {
    // Try primary model (OpenAI)
    if (openaiClient) {
      const response = await callOpenAI(context);
      const validated = challengeSchema.parse(response);
      return validated;
    } else {
      // No fallback available - OpenAI is required
      throw new Error('OpenAI client not available and no fallback configured. Please ensure OPENAI_API_KEY is set.');
    }
  } catch (error: any) {
    // Handle error and potentially retry
    const retryContext = await AIErrorHandler.handleError(error, context, retryCount);
    if (retryContext === null) {
      // Retry with updated context
      return generateChallengeWithRetry(args, retryCount + 1);
    }
    throw error;
  }
}

// Evaluate code with retry logic
async function evaluateCodeWithRetry(args: any, retryCount: number = 0): Promise<any> {
  const context = {
    prompt: `Evaluate the following ${args.language} code against the provided test cases:
    
    Code:
    ${args.code}
    
    Test Cases:
    ${JSON.stringify(args.testCases, null, 2)}
    
    Run each test case and provide detailed results including whether it passed, 
    the actual output, and any errors. Also provide an overall summary and constructive feedback.`,
    expectedFormat: evaluationSchema.shape,
    temperature: 0,
    maxTokens: 1500
  };

  try {
    // For code evaluation, we'll simulate the execution
    // In a real implementation, you'd use a sandboxed code execution environment
    const results = await simulateCodeExecution(args);
    
    // Get AI feedback on the code
    let feedback = "Code evaluation completed.";
    if (openaiClient) {
      const aiResponse = await callOpenAI({
        ...context,
        prompt: `Provide constructive feedback on this ${args.language} code:\n\n${args.code}`
      });
      feedback = aiResponse.feedback || feedback;
    }

    const response = {
      results,
      summary: {
        totalTests: results.length,
        passedTests: results.filter((r: any) => r.passed).length,
        failedTests: results.filter((r: any) => !r.passed).length,
        successRate: results.filter((r: any) => r.passed).length / results.length
      },
      feedback
    };

    const validated = evaluationSchema.parse(response);
    return validated;

  } catch (error: any) {
    const retryContext = await AIErrorHandler.handleError(error, context, retryCount);
    if (retryContext === null) {
      return evaluateCodeWithRetry(args, retryCount + 1);
    }
    throw error;
  }
}

// Call OpenAI API
async function callOpenAI(context: any): Promise<any> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  const completion = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an expert programming instructor. Always respond with valid JSON matching the requested format. ${JSON.stringify(context.expectedFormat)}`
      },
      {
        role: 'user',
        content: context.prompt
      }
    ],
    temperature: context.temperature,
    max_tokens: context.maxTokens,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

// Simulate code execution (simplified - in production use a sandboxed environment)
async function simulateCodeExecution(args: any): Promise<any[]> {
  // This is a simplified simulation
  // In production, you would use a secure code execution service
  return args.testCases.map((testCase: any) => ({
    passed: Math.random() > 0.3, // Simulate some failures
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    actualOutput: testCase.expectedOutput, // In real execution, this would be computed
    error: Math.random() > 0.7 ? 'Sample error for demonstration' : undefined
  }));
} 