import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

// Define the models
const schema = a.schema({
	UserStats: a
		.model({
			userId: a.id().required(),
			totalChallenges: a.integer(),
			completedChallenges: a.integer(),
			lastActiveAt: a.datetime(),
			expiresAt: a.timestamp(),
		})
		.authorization((allow) => [allow.owner()]),

	TokenUsage: a
		.model({
			userId: a.string().required(),
			challengeId: a.string().required(),
			timestamp: a.datetime().required(),
			tokensUsed: a.integer(),
			promptTokens: a.integer(),
			completionTokens: a.integer(),
			cost: a.float(),
			expiresAt: a.timestamp(),
		})
		.authorization((allow) => [allow.owner()]),

	MonthlyUsage: a
		.model({
			userId: a.string().required(),
			yearMonth: a.string().required(),
			totalTokens: a.integer(),
			totalCost: a.float(),
			challengesCompleted: a.integer(),
			expiresAt: a.timestamp(),
		})
		.authorization((allow) => [allow.owner()]),
});

// Export the data resources
export const data = defineData({
	schema,
	authorizationModes: {
		defaultAuthorizationMode: "userPool",
	},
});

// Export type-safe client schema
export type Schema = ClientSchema<typeof schema>;
