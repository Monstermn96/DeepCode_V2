import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>({
	authMode: "userPool",
});

interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	estimatedCost: number;
	model: string;
	challengeType: string;
}

interface LanguageStats {
	completed: number;
	proficiency: number;
	totalPoints: number;
}

export interface UserStats {
	userId: string;
	totalChallenges: number;
	completedChallenges: number;
	inProgressChallenges: number;
	totalPoints: number;
	lastActive: string;
	currentStreak: number;
	longestStreak: number;
	languageStats: Record<string, LanguageStats>;
	createdAt: string;
	updatedAt: string;
}

export class UserStatsService {
	private static instance: UserStatsService;

	private constructor() {}

	static getInstance(): UserStatsService {
		if (!UserStatsService.instance) {
			UserStatsService.instance = new UserStatsService();
		}
		return UserStatsService.instance;
	}

	async getUserStats(userId: string): Promise<UserStats | null> {
		try {
			const { data, errors } = await client.models.UserStats.get({ userId });
			if (errors) throw errors;
			return data;
		} catch (error) {
			console.error("Error fetching user stats:", error);
			throw error;
		}
	}

	async initializeUserStats(userId: string): Promise<UserStats> {
		const now = new Date().toISOString();
		const initialStats: UserStats = {
			userId,
			totalChallenges: 0,
			completedChallenges: 0,
			inProgressChallenges: 0,
			totalPoints: 0,
			lastActive: now,
			currentStreak: 0,
			longestStreak: 0,
			languageStats: {},
			createdAt: now,
			updatedAt: now,
		};

		try {
			const { data, errors } = await client.models.UserStats.create(
				initialStats
			);
			if (errors) throw errors;
			return data;
		} catch (error) {
			console.error("Error initializing user stats:", error);
			throw error;
		}
	}

	async recordTokenUsage(
		userId: string,
		challengeId: string,
		usage: TokenUsage
	): Promise<void> {
		const timestamp = new Date().toISOString();
		const yearMonth = timestamp.substring(0, 7); // YYYY-MM format

		try {
			// Record individual usage
			await client.models.TokenUsage.create({
				userId,
				challengeId,
				...usage,
				timestamp,
			});

			// Update monthly aggregates
			await client.models.UserMonthlyUsage.update({
				userId,
				yearMonth,
				totalTokens: {
					action: "add",
					value: usage.totalTokens,
				},
				totalCost: {
					action: "add",
					value: usage.estimatedCost,
				},
				challengesGenerated: {
					action: "add",
					value: 1,
				},
				lastUpdated: timestamp,
			});
		} catch (error) {
			console.error("Error recording token usage:", error);
			throw error;
		}
	}

	async updateChallengeCompletion(
		userId: string,
		language: string,
		points: number,
		completed: boolean
	): Promise<void> {
		const now = new Date().toISOString();

		try {
			const stats =
				(await this.getUserStats(userId)) ||
				(await this.initializeUserStats(userId));

			const languageStats = stats.languageStats[language] || {
				completed: 0,
				proficiency: 0,
				totalPoints: 0,
			};

			if (completed) {
				languageStats.completed += 1;
				languageStats.totalPoints += points;
				// Simple proficiency calculation based on points
				languageStats.proficiency = Math.min(
					100,
					Math.floor((languageStats.totalPoints / 1000) * 100)
				);
			}

			await client.models.UserStats.update({
				userId,
				totalChallenges: {
					action: "add",
					value: 1,
				},
				completedChallenges: {
					action: "add",
					value: completed ? 1 : 0,
				},
				totalPoints: {
					action: "add",
					value: points,
				},
				lastActive: now,
				languageStats: {
					[language]: languageStats,
				},
				updatedAt: now,
			});
		} catch (error) {
			console.error("Error updating challenge completion:", error);
			throw error;
		}
	}

	async getMonthlyUsage(
		userId: string,
		yearMonth: string
	): Promise<{
		totalTokens: number;
		totalCost: number;
		challengesGenerated: number;
	}> {
		try {
			const { data, errors } = await client.models.UserMonthlyUsage.get({
				userId,
				yearMonth,
			});
			if (errors) throw errors;

			const { totalTokens, totalCost, challengesGenerated } = data;
			return {
				totalTokens: totalTokens || 0,
				totalCost: totalCost || 0,
				challengesGenerated: challengesGenerated || 0,
			};
		} catch (error) {
			console.error("Error fetching monthly usage:", error);
			throw error;
		}
	}

	async updateStreak(userId: string): Promise<void> {
		const now = new Date();
		const today = now.toISOString().split("T")[0];

		try {
			const stats = await this.getUserStats(userId);
			if (!stats) return;

			const lastActiveDate = new Date(stats.lastActive.split("T")[0]);
			const daysSinceLastActive = Math.floor(
				(now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			let newStreak = stats.currentStreak;
			if (daysSinceLastActive === 1) {
				// Consecutive day
				newStreak += 1;
			} else if (daysSinceLastActive > 1) {
				// Streak broken
				newStreak = 1;
			}

			await client.models.UserStats.update({
				userId,
				currentStreak: newStreak,
				longestStreak: {
					action: "greatest",
					value: newStreak,
				},
				lastActive: today,
				updatedAt: now.toISOString(),
			});
		} catch (error) {
			console.error("Error updating streak:", error);
			throw error;
		}
	}
}
