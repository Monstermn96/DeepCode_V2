import { client } from '../../main';
import { type Schema } from "../../../amplify/data/resource";

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
	id: string;  // Primary key
	totalChallenges: number;
	completedChallenges: number;
	lastActiveAt: string;
	currentStreak?: number;
	longestStreak?: number;
	updatedAt?: string;
	expiresAt?: number;
}

export interface MonthlyUsage {
	userId: string;
	yearMonth: string;
	totalTokens: number;
	totalCost: number;
	challengesGenerated: number;
	lastUpdated?: string;
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
			const { data, errors } = await client.models.UserStats.get({
				id: userId
			});
			if (errors) throw errors;
			return data as unknown as UserStats;
		} catch (error) {
			console.error("Error fetching user stats:", error);
			throw error;
		}
	}

	async initializeUserStats(userId: string): Promise<UserStats> {
		const now = new Date().toISOString();
		const initialStats: UserStats = {
			id: userId,  // Use userId as the id
			totalChallenges: 0,
			completedChallenges: 0,
			lastActiveAt: now,
			currentStreak: 0,
			longestStreak: 0,
			updatedAt: now
		};

		try {
			const { data, errors } = await client.models.UserStats.create({
				input: initialStats
			});
			if (errors) throw errors;
			return data as unknown as UserStats;
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
				id: `${userId}_${challengeId}`,  // Required by schema
				userId,
				challengeId,
				timestamp,
				tokensUsed: usage.totalTokens,
				promptTokens: usage.promptTokens,
				completionTokens: usage.completionTokens,
				cost: usage.estimatedCost
			});

			// Update monthly aggregates
			await client.models.MonthlyUsage.update({
				id: `${userId}_${yearMonth}`,
				totalTokens: {
					action: "add",
					value: usage.totalTokens,
				},
				totalCost: {
					action: "add",
					value: usage.estimatedCost,
				},
				challengesCompleted: {
					action: "add",
					value: 1,
				}
			});
		} catch (error) {
			console.error("Error recording token usage:", error);
			throw error;
		}
	}

	async updateChallengeCompletion(
		userId: string,
		completed: boolean
	): Promise<void> {
		const now = new Date().toISOString();

		try {
			await client.models.UserStats.update({
				id: userId,
				totalChallenges: {
					action: "add",
					value: 1,
				},
				completedChallenges: {
					action: "add",
					value: completed ? 1 : 0,
				},
				lastActiveAt: now
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
			const { data, errors } = await client.models.MonthlyUsage.get({
				id: `${userId}_${yearMonth}`
			});
			if (errors) throw errors;

			const monthlyData = data as unknown as MonthlyUsage;
			return {
				totalTokens: monthlyData?.totalTokens || 0,
				totalCost: monthlyData?.totalCost || 0,
				challengesGenerated: monthlyData?.challengesGenerated || 0,
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

			const lastActiveDate = new Date(stats.lastActiveAt.split("T")[0]);
			const daysSinceLastActive = Math.floor(
				(now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			let newStreak = stats.currentStreak || 0;  // Default to 0 if undefined
			if (daysSinceLastActive === 1) {
				// Consecutive day
				newStreak += 1;
			} else if (daysSinceLastActive > 1) {
				// Streak broken
				newStreak = 1;
			}

			await client.models.UserStats.update({
				id: userId,
				currentStreak: newStreak,
				longestStreak: {
					action: "greatest",
					value: newStreak,
				},
				lastActiveAt: today,
				updatedAt: now.toISOString(),
			});
		} catch (error) {
			console.error("Error updating streak:", error);
			throw error;
		}
	}
}
