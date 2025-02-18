import { defineData, Schema } from "@aws-amplify/backend";
import { type ClientSchema } from "@aws-amplify/backend";
import { model, primaryKey, index, ttl } from "@aws-amplify/backend";

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

// Define the schema
const schema = Schema.define({
	models: {
		UserStats,
		TokenUsage,
		MonthlyUsage,
	},
});

// Export the schema
export const data = defineData({
	schema,
	authorizationModes: {
		defaultAuthorizationMode: "userPool",
	},
});

// Export type-safe client schema
export type Schema = ClientSchema<typeof schema>;
