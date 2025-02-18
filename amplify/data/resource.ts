import { defineData } from "@aws-amplify/backend";
import {
	type DataSchemaInput,
	type DerivedModelSchema,
} from "@aws-amplify/data-schema-types";

// Define the models
const schema: DerivedModelSchema = {
	models: {
		UserStats: {
			fields: {
				userId: { type: "string", required: true },
				totalChallenges: { type: "integer" },
				completedChallenges: { type: "integer" },
				lastActiveAt: { type: "string" },
				expiresAt: { type: "integer" },
			},
			authorization: [{ allow: "owner" }],
		},

		TokenUsage: {
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

		MonthlyUsage: {
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
