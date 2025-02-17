import { defineFunction } from '@aws-amplify/backend';

/**
 * Define and configure your function resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/functions
 */
export const ai = defineFunction({
  name: 'ai',
  entry: 'handler.ts',
  environment: {
    REGION: process.env.AWS_REGION || 'us-east-1',
    // The OpenAI API key will be set in the Amplify Console
    // This is a placeholder to indicate the required environment variable
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'placeholder-will-be-set-in-console'
  },
  memoryMB: 1024,
  timeoutSeconds: 30
}); 