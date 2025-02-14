import { post } from '@aws-amplify/api';

export type AIRequestType = 'challenge' | 'feedback';

interface AIRequest {
  prompt: string;
  type?: AIRequestType;
}

export interface AIResponse {
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const aiService = {
  async generateResponse({ prompt, type = 'challenge' }: AIRequest): Promise<AIResponse> {
    try {
      const response = await post({
        apiName: 'ai',
        path: '/ai',
        options: {
          body: {
            prompt,
            type
          }
        }
      });

      return response as unknown as AIResponse;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to generate AI response');
    }
  },

  async generateChallenge(topic: string): Promise<AIResponse> {
    return this.generateResponse({
      prompt: `Create a coding challenge about ${topic}. Include:
        1. Problem description
        2. Input/Output examples
        3. Constraints
        4. Starter code
        5. Hints (optional)`,
      type: 'challenge'
    });
  },

  async getCodeFeedback(code: string): Promise<AIResponse> {
    return this.generateResponse({
      prompt: `Review this code and provide detailed feedback:
      ${code}
      
      Please include:
      1. Code quality assessment
      2. Potential improvements
      3. Best practices suggestions
      4. Performance considerations`,
      type: 'feedback'
    });
  }
}; 