import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

// Define your schema using the new "Amplify Data" DSL
const schema = a.schema({
  UserStats: a
    .model({
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
    .authorization(allow => [allow.authenticated()]),
    
  TokenUsage: a
    .model({
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
    .authorization((rules: any) => [rules.owner()]),

  MonthlyUsage: a
    .model({
      id: a.string().required(),
      userId: a.string().required(),
      yearMonth: a.string().required(),
      totalTokens: a.integer(),
      totalCost: a.float(),
      challengesCompleted: a.integer(),
      expiresAt: a.timestamp()
    })
    .authorization((rules: any) => [rules.owner()]),
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

// (Optional) Export type for your frontend's generateClient<Schema>()
export type Schema = ClientSchema<typeof schema>;
