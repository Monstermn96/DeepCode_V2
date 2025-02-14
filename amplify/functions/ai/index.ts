import { defineFunction } from '@aws-amplify/backend';
import { type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import OpenAI from 'openai';

export const aiHandler = defineFunction((scope) => ({
  environment: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
  },
  async handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const { prompt, type = 'challenge' } = JSON.parse(event.body || '{}');

      if (!prompt) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Prompt is required' })
        };
      }

      let systemPrompt = '';
      switch (type) {
        case 'challenge':
          systemPrompt = 'You are an expert programming instructor. Create a coding challenge that helps improve programming skills.';
          break;
        case 'feedback':
          systemPrompt = 'You are an expert code reviewer. Provide detailed, constructive feedback on the code.';
          break;
        default:
          systemPrompt = 'You are an expert programming instructor.';
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          response: completion.choices[0].message.content,
          usage: completion.usage
        })
      };

    } catch (error) {
      console.error('Error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      };
    }
  }
})); 