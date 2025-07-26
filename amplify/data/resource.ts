import { type ClientSchema, a } from '@aws-amplify/data-schema';
import { defineData } from '@aws-amplify/backend';

// Define your schema using the new "Amplify Data" DSL
const schema = a.schema({
  // Existing models
  UserStats: a.model({
    id: a.string().required(),
    totalChallenges: a.integer(),
    completedChallenges: a.integer(),
    lastActiveAt: a.datetime(),
    currentStreak: a.integer(),
    longestStreak: a.integer(),
    totalTokensUsed: a.integer(),
    totalCost: a.float(),
    expiresAt: a.timestamp()
  })
  .authorization((allow) => [allow.ownerDefinedIn('id')]),
    
  TokenUsage: a.model({
    id: a.string().required(),
    userId: a.string().required(),
    challengeId: a.string().required(),
    timestamp: a.datetime().required(),
    tokensUsed: a.integer(),
    promptTokens: a.integer(),
    completionTokens: a.integer(),
    cost: a.float(),
    expiresAt: a.timestamp()
  })
  .authorization((allow) => [allow.ownerDefinedIn('id')]),

  MonthlyUsage: a.model({
    id: a.string().required(),
    userId: a.string().required(),
    yearMonth: a.string().required(),
    totalTokens: a.integer(),
    totalCost: a.float(),
    challengesCompleted: a.integer(),
    expiresAt: a.timestamp()
  })
  .authorization((allow) => [allow.ownerDefinedIn('id')]),

  // AI Request tracking model
  AIRequest: a.model({
    id: a.id(),
    userId: a.string().required(),
    type: a.enum(['challenge', 'evaluation', 'feedback']),
    status: a.enum(['pending', 'processing', 'completed', 'failed']),
    input: a.json(),
    response: a.json(),
    error: a.string(),
    retryCount: a.integer().default(0),
    processingTime: a.integer(),
    modelUsed: a.string(),
    tokenUsage: a.json(),
    createdAt: a.datetime(),
    completedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Challenge model for storing generated challenges
  Challenge: a.model({
    id: a.id(),
    userId: a.string().required(),
    title: a.string().required(),
    description: a.string().required(),
    language: a.enum(['Python', 'Java', 'C#']),
    difficulty: a.enum(['Easy', 'Medium', 'Hard']),
    testCases: a.json(),
    hints: a.json(),
    solution: a.string(),
    userCode: a.string(),
    isCompleted: a.boolean().default(false),
    createdAt: a.datetime(),
    completedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Conversation history model
  ConversationHistory: a.model({
    id: a.id(),
    userId: a.string().required(),
    conversationId: a.string().required(),
    messages: a.json(),
    metadata: a.json(),
    createdAt: a.datetime(),
    updatedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),
});

// Register the schema resource in Amplify
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  },
});

// Export the schema type for the client
export type Schema = ClientSchema<typeof schema>;
