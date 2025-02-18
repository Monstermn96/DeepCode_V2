import { defineData, Schema, type ClientSchema } from "@aws-amplify/backend";
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
const schema = {
	UserStats: {
		tableName: "UserStats",
		primaryKey: {
			partitionKey: "userId",
		},
		streamEnabled: true,
		fields: {
			userId: "string",
			totalChallenges: "number?",
			completedChallenges: "number?",
			lastActiveAt: "string?",
			createdAt: "string?",
			updatedAt: "string?",
			expiresAt: "number?",
		},
	},
	TokenUsage: {
		tableName: "TokenUsage",
		primaryKey: {
			partitionKey: "userId",
			sortKey: "challengeId",
		},
		streamEnabled: true,
		fields: {
			userId: "string",
			challengeId: "string",
			timestamp: "string",
			tokensUsed: "number?",
			promptTokens: "number?",
			completionTokens: "number?",
			cost: "number?",
			createdAt: "string?",
			updatedAt: "string?",
			expiresAt: "number?",
		},
		secondaryIndexes: {
			byTimestamp: {
				partitionKey: "userId",
				sortKey: "timestamp",
			},
		},
	},
	MonthlyUsage: {
		tableName: "MonthlyUsage",
		primaryKey: {
			partitionKey: "userId",
			sortKey: "yearMonth",
		},
		streamEnabled: true,
		fields: {
			userId: "string",
			yearMonth: "string",
			totalTokens: "number?",
			totalCost: "number?",
			challengesCompleted: "number?",
			createdAt: "string?",
			updatedAt: "string?",
			expiresAt: "number?",
		},
	},
} satisfies DataSchema;

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
