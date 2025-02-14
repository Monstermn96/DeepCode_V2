import { defineFunction } from '@aws-amplify/backend';

/**
 * Define and configure your function resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/functions
 */
export const ai = defineFunction({
  name: 'ai',
  entry: 'handler.ts',
  environment: {
    REGION: process.env.AWS_REGION || 'us-east-1'
  },
  memoryMB: 1024,
  timeoutSeconds: 30
}); 