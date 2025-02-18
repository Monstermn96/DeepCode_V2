import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
import { type DataSchema } from "@aws-amplify/backend-data";

/**
 * User statistics schema
 */
@model({
	tableName: "UserStats",
	primaryKey: {
		partitionKey: "userId",
	},
	streamEnabled: true,
})
class UserStats {
	@primaryKey()
	userId!: string;

	totalChallenges?: number;
	completedChallenges?: number;
	lastActiveAt?: string;
	createdAt?: string;
	updatedAt?: string;

	@ttl()
	expiresAt?: number;
}

/**
 * Token usage tracking schema
 */
@model({
	tableName: "TokenUsage",
	primaryKey: {
		partitionKey: "userId",
		sortKey: "challengeId",
	},
	streamEnabled: true,
})
class TokenUsage {
	@primaryKey()
	userId!: string;

	@primaryKey()
	challengeId!: string;

	@index({
		name: "byTimestamp",
		partitionKey: "userId",
		sortKey: "timestamp",
	})
	timestamp!: string;

	tokensUsed?: number;
	promptTokens?: number;
	completionTokens?: number;
	cost?: number;
	createdAt?: string;
	updatedAt?: string;

	@ttl()
	expiresAt?: number;
}

/**
 * Monthly usage tracking schema
 */
@model({
	tableName: "MonthlyUsage",
	primaryKey: {
		partitionKey: "userId",
		sortKey: "yearMonth",
	},
	streamEnabled: true,
})
class MonthlyUsage {
	@primaryKey()
	userId!: string;

	@primaryKey()
	yearMonth!: string;

	totalTokens?: number;
	totalCost?: number;
	challengesCompleted?: number;
	createdAt?: string;
	updatedAt?: string;

	@ttl()
	expiresAt?: number;
}

// Define the models
const schema = a.schema({
	UserStats: a
		.model({
			userId: a.string().required(),
			totalChallenges: a.integer(),
			completedChallenges: a.integer(),
			lastActiveAt: a.string(),
			createdAt: a.string(),
			updatedAt: a.string(),
			expiresAt: a.integer(),
		})
		.authorization((allow) => [allow.owner()])
		.primaryKey({
			partitionKey: "userId",
		})
		.addTimestamps()
		.enableTTL("expiresAt"),

	TokenUsage: a
		.model({
			userId: a.string().required(),
			challengeId: a.string().required(),
			timestamp: a.string().required(),
			tokensUsed: a.integer(),
			promptTokens: a.integer(),
			completionTokens: a.integer(),
			cost: a.float(),
			createdAt: a.string(),
			updatedAt: a.string(),
			expiresAt: a.integer(),
		})
		.authorization((allow) => [allow.owner()])
		.primaryKey({
			partitionKey: "userId",
			sortKey: "challengeId",
		})
		.secondaryIndex({
			indexName: "byTimestamp",
			partitionKey: "userId",
			sortKey: "timestamp",
		})
		.addTimestamps()
		.enableTTL("expiresAt"),

	MonthlyUsage: a
		.model({
			userId: a.string().required(),
			yearMonth: a.string().required(),
			totalTokens: a.integer(),
			totalCost: a.float(),
			challengesCompleted: a.integer(),
			createdAt: a.string(),
			updatedAt: a.string(),
			expiresAt: a.integer(),
		})
		.authorization((allow) => [allow.owner()])
		.primaryKey({
			partitionKey: "userId",
			sortKey: "yearMonth",
		})
		.addTimestamps()
		.enableTTL("expiresAt"),
});

// Export the data resources
export const data = defineData({
	schema,
	authorizationModes: {
		defaultAuthorizationMode: "userPool",
	},
});

// Export the models for use in backend.ts
export const { UserStats, TokenUsage, MonthlyUsage } = schema;

// Export type-safe client schema
export type Schema = ClientSchema<typeof schema>;
