import { defineData, type DataSchemaInput } from "@aws-amplify/backend-data";

// Define the models
const schema: DataSchemaInput = {
	UserStats: {
		model: {
			fields: {
				userId: { type: "string", required: true },
				totalChallenges: { type: "integer" },
				completedChallenges: { type: "integer" },
				lastActiveAt: { type: "string" },
				expiresAt: { type: "integer" },
			},
			authorization: [{ allow: "owner" }],
		},
	},

	TokenUsage: {
		model: {
			fields: {
				userId: { type: "string", required: true },
				challengeId: { type: "string", required: true },
				timestamp: { type: "string", required: true },
				tokensUsed: { type: "integer" },
				promptTokens: { type: "integer" },
				completionTokens: { type: "integer" },
				cost: { type: "float" },
				expiresAt: { type: "integer" },
			},
			authorization: [{ allow: "owner" }],
			secondaryIndexes: {
				byTimestamp: { sortKey: ["timestamp"] },
			},
		},
	},

	MonthlyUsage: {
		model: {
			fields: {
				userId: { type: "string", required: true },
				yearMonth: { type: "string", required: true },
				totalTokens: { type: "integer" },
				totalCost: { type: "float" },
				challengesCompleted: { type: "integer" },
				expiresAt: { type: "integer" },
			},
			authorization: [{ allow: "owner" }],
		},
	},
};

// Export the data resources
export const data = defineData({
	schema,
	authorizationModes: {
		defaultAuthorizationMode: "userPool",
	},
});

// Export type-safe client schema
export type Schema = typeof schema;
