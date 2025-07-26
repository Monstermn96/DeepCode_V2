import { defineFunction } from '@aws-amplify/backend';

export const AIConversationFunction = defineFunction({
  name: 'ai-conversation',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 1024,
  runtime: 20,
  environment: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.VITE_OPENAI_MODEL || 'gpt-4',
    BEDROCK_REGION: process.env.AWS_REGION || 'us-east-1',
    LOG_LEVEL: process.env.AMPLIFY_ENV === 'prod' ? 'INFO' : 'DEBUG',
    NODE_OPTIONS: '--enable-source-maps'
  }
}); 