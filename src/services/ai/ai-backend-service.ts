import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../amplify/data/resource';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';

const client = generateClient<Schema>();

export interface GenerateChallengeParams {
  topic: string;
  languages: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  useEmptyMethods?: boolean; // If true (default), provides empty method stubs; if false, provides complete starter code
  learningPathId?: string; // Optional learning path context for better problem generation
  userSkillLevels?: Record<string, number>; // User's skill levels for fallback generation
}

export interface EvaluateCodeParams {
  code: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  language: string;
}

export interface AIResponse {
  data: any;
  metadata: {
    type: string;
    model: string;
    duration_ms: number;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      estimated_cost: number;
    };
  };
}

class AIBackendService {
  private async getUserId(): Promise<string> {
    try {
      const user = await getCurrentUser();
      return user.userId;
    } catch {
      return 'anonymous';
    }
  }

  private isLocalDevelopment(): boolean {
    return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  private async callLambdaFunction(functionName: string, payload: any): Promise<any> {
    // In local development, Lambda functions aren't available
    if (this.isLocalDevelopment()) {
      throw new Error('Lambda functions not available in local development');
    }

    try {
      // Get auth session for authenticated requests
      const session = await fetchAuthSession();
      
      // Call the Lambda function through API Gateway
      const response = await post({
        apiName: 'myRestApi',
        path: `/ai/${functionName}`,
        options: {
          body: payload,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      });

      return response.body;
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      throw error;
    }
  }

  async generateChallenge(params: GenerateChallengeParams): Promise<AIResponse> {
    // In local development, immediately throw error to use frontend fallback
    if (this.isLocalDevelopment()) {
      throw new Error('Backend AI service not available in local development - using frontend fallback');
    }

    try {
      const userId = await this.getUserId();
      
      // Create AI request record
      const { data: aiRequest } = await client.models.AIRequest.create({
        userId,
        type: 'challenge',
        status: 'pending',
        input: params
      });

      if (!aiRequest?.id) {
        throw new Error('Failed to create AI request');
      }

      // Call Lambda function
      const response = await this.callLambdaFunction('generate-challenge', {
        requestId: aiRequest.id,
        ...params
      });

      // Poll for completion
      const result = await this.pollForCompletion(aiRequest.id);
      
      // Store the challenge if successful
      if (result.status === 'completed' && result.response) {
        const challengeData = result.response;
        const { data: challenge } = await client.models.Challenge.create({
          userId,
          title: challengeData.title,
          description: challengeData.description,
          language: challengeData.language,
          difficulty: challengeData.difficulty,
          starterCode: challengeData.starterCode,
          testCases: challengeData.testCases,
          hints: challengeData.hints,
          solution: challengeData.solution
        });

        return {
          data: { ...challengeData, problem: challengeData, id: challenge?.id },
          metadata: {
            type: 'challenge',
            model: result.modelUsed || 'unknown',
            duration_ms: result.processingTime || 0,
            usage: result.tokenUsage
          }
        };
      }

      throw new Error(result.error || 'Failed to generate challenge');
    } catch (error) {
      console.error('Failed to generate challenge:', error);
      throw error;
    }
  }

  async evaluateCode(params: EvaluateCodeParams): Promise<AIResponse> {
    try {
      // Create AI request record
      const { data: aiRequest } = await client.models.AIRequest.create({
        type: 'evaluation',
        status: 'pending',
        input: params
      });

      if (!aiRequest?.id) {
        throw new Error('Failed to create AI request');
      }

      // Call Lambda function
      const response = await this.callLambdaFunction('evaluate-code', {
        requestId: aiRequest.id,
        ...params
      });

      // Poll for completion
      const result = await this.pollForCompletion(aiRequest.id);
      
      if (result.status === 'completed' && result.response) {
        return {
          data: result.response,
          metadata: {
            type: 'evaluation',
            model: result.modelUsed || 'unknown',
            duration_ms: result.processingTime || 0,
            usage: result.tokenUsage
          }
        };
      }

      throw new Error(result.error || 'Failed to evaluate code');
    } catch (error) {
      console.error('Failed to evaluate code:', error);
      throw error;
    }
  }

  async getCodeFeedback(code: string, language: string): Promise<AIResponse> {
    try {
      // Create AI request record
      const { data: aiRequest } = await client.models.AIRequest.create({
        type: 'feedback',
        status: 'pending',
        input: { code, language }
      });

      if (!aiRequest?.id) {
        throw new Error('Failed to create AI request');
      }

      // Call Lambda function
      const response = await this.callLambdaFunction('get-feedback', {
        requestId: aiRequest.id,
        code,
        language
      });

      // Poll for completion
      const result = await this.pollForCompletion(aiRequest.id);
      
      if (result.status === 'completed' && result.response) {
        return {
          data: result.response,
          metadata: {
            type: 'feedback',
            model: result.modelUsed || 'unknown',
            duration_ms: result.processingTime || 0,
            usage: result.tokenUsage
          }
        };
      }

      throw new Error(result.error || 'Failed to get feedback');
    } catch (error) {
      console.error('Failed to get code feedback:', error);
      throw error;
    }
  }

  private async pollForCompletion(requestId: string, maxAttempts = 30): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data } = await client.models.AIRequest.get({ id: requestId });
        
        if (!data) {
          throw new Error('Request not found');
        }

        if (data.status === 'completed') {
          return data;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Request failed');
        }

        // Wait before polling again (exponential backoff)
        const delay = Math.min(1000 * Math.pow(1.5, i), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }

    throw new Error('Request timeout - maximum polling attempts exceeded');
  }

  // Conversation methods for interactive help
  async startConversation(topic: string): Promise<string> {
    try {
      const { data: conversation } = await client.models.ConversationHistory.create({
        conversationId: crypto.randomUUID(),
        messages: [{
          role: 'system',
          content: `Help user with: ${topic}`
        }],
        metadata: { topic }
      });

      return conversation?.conversationId || '';
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }

  async sendMessage(conversationId: string, message: string): Promise<string> {
    try {
      const response = await this.callLambdaFunction('conversation', {
        conversationId,
        message
      });

      return response.content?.[0]?.text || '';
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiBackendService = new AIBackendService(); 