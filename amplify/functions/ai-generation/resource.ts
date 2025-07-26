import { defineFunction } from '@aws-amplify/backend';

export const AIGenerationFunction = defineFunction({
  name: 'ai-generation',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for complex AI operations
  memoryMB: 1024,
  runtime: 20, // Node.js 20
  environment: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.VITE_OPENAI_MODEL || 'gpt-4',
    BEDROCK_REGION: process.env.AWS_REGION || 'us-east-1',
    ENABLE_CACHE: 'true',
    LOG_LEVEL: process.env.AMPLIFY_ENV === 'prod' ? 'INFO' : 'DEBUG',
    MAX_RETRIES: '3',
    RETRY_DELAY: '1000',
    NODE_OPTIONS: '--enable-source-maps'
  }
}); 