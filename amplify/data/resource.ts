import { type Schema as DataSchema } from "aws-amplify/data";
import { defineData, type DefineDataOptions } from "@aws-amplify/backend-data";

// Define the models
const schema = {
	UserStats: {
		model: {
			fields: {
				userId: { type: "string", required: true },
				totalChallenges: { type: "number" },
				completedChallenges: { type: "number" },
				lastActiveAt: { type: "string" },
				expiresAt: { type: "number" },
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
				tokensUsed: { type: "number" },
				promptTokens: { type: "number" },
				completionTokens: { type: "number" },
				cost: { type: "number" },
				expiresAt: { type: "number" },
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
				totalTokens: { type: "number" },
				totalCost: { type: "number" },
				challengesCompleted: { type: "number" },
				expiresAt: { type: "number" },
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
} as DefineDataOptions);

// Export type-safe client schema
export type Schema = DataSchema<typeof schema>;
