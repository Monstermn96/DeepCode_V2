import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { userStats, tokenUsage, monthlyUsage } from "./data/resource";

export const backend = defineBackend({
	auth,
	userStats,
	tokenUsage,
	monthlyUsage,
});
