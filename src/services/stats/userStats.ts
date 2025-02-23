import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Initialize Amplify asynchronously
async function initializeAmplify() {
	try {
		const outputs = await import('../../../amplify_outputs.json');
		Amplify.configure(outputs.default);
		return generateClient<Schema>();
	} catch (error) {
		console.error('Failed to load Amplify outputs:', error);
		return null;
	}
}

interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	estimatedCost: number;
	model: string;
	challengeType: string;
}

export interface UserStats {
	id: string;  // Primary key
	totalChallenges: number;
	completedChallenges: number;
	lastActiveAt: string;
	currentStreak?: number;
	longestStreak?: number;
	totalTokensUsed: number;  // Add total tokens tracking
	totalCost: number;        // Add total cost tracking
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

let client: Awaited<ReturnType<typeof generateClient<Schema>>> | null = null;

// Initialize the client
initializeAmplify().then(c => {
	client = c;
});

// API endpoints from outputs
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';

export async function initializeUserStats(userId: string): Promise<UserStats> {
	if (!client) throw new Error('Client not initialized');
	
	const response = await fetch(`${API_ENDPOINT}/initialize`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ userId }),
	});

	if (!response.ok) {
		throw new Error("Failed to initialize user stats");
	}

	return response.json();
}

export async function getUserStats(userId: string): Promise<UserStats> {
	if (!client) throw new Error('Client not initialized');

	const response = await fetch(`${API_ENDPOINT}/stats?userId=${userId}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error("Failed to get user stats");
	}

	return response.json();
}

export async function updateUserStats(
	userId: string,
	tokensUsed: number
): Promise<UserStats> {
	if (!client) throw new Error('Client not initialized');

	const response = await fetch(`${API_ENDPOINT}/update-stats`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ userId, tokensUsed }),
	});

	if (!response.ok) {
		throw new Error("Failed to update user stats");
	}

	return response.json();
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
		if (!client) throw new Error('Client not initialized');
		try {
			const { data } = await client.models.UserStats.get({ id: userId });
			return data ? data[0] : null;
		} catch (error) {
			console.error('Error getting user stats:', error);
			throw error;
		}
	}

	async initializeUserStats(userId: string): Promise<UserStats | null> {
		if (!client) throw new Error('Client not initialized');
		try {
			const { data } = await client.models.UserStats.create({
				id: userId,
				totalChallenges: 0,
				completedChallenges: 0,
				lastActiveAt: new Date().toISOString(),
				currentStreak: 0,
				longestStreak: 0,
				totalTokensUsed: 0,  // Initialize total tokens
				totalCost: 0         // Initialize total cost
			});
			return data ? data[0] : null;
		} catch (error) {
			console.error('Error initializing user stats:', error);
			throw error;
		}
	}

	async recordTokenUsage(
		userId: string,
		challengeId: string,
		usage: TokenUsage
	): Promise<void> {
		if (!client) throw new Error('Client not initialized');
		try {
			// First get current user stats to update totals
			const { data } = await client.models.UserStats.get({ id: userId });
			const userStats = data ? data[0] : null;
			if (userStats) {
				await client.models.UserStats.update({
					id: userId,
					totalTokensUsed: (userStats.totalTokensUsed || 0) + usage.totalTokens,
					totalCost: (userStats.totalCost || 0) + usage.estimatedCost
				});
			}

			// Create token usage record
			await client.models.TokenUsage.create({
				id: `${userId}-${challengeId}-${Date.now()}`,
				userId,
				challengeId,
				timestamp: new Date().toISOString(),
				promptTokens: usage.promptTokens,
				completionTokens: usage.completionTokens,
				tokensUsed: usage.totalTokens,
				cost: usage.estimatedCost
			});

			// Update monthly usage
			const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
			const monthlyUsageId = `${userId}-${yearMonth}`;
			
			try {
				const { data: monthlyData } = await client.models.MonthlyUsage.get({ id: monthlyUsageId });
				const existingUsage = monthlyData ? monthlyData[0] : null;
				if (existingUsage) {
					await client.models.MonthlyUsage.update({
						id: monthlyUsageId,
						totalTokens: existingUsage.totalTokens + usage.totalTokens,
						totalCost: existingUsage.totalCost + usage.estimatedCost,
						challengesCompleted: existingUsage.challengesCompleted + 1
					});
				} else {
					await client.models.MonthlyUsage.create({
						id: monthlyUsageId,
						userId,
						yearMonth,
						totalTokens: usage.totalTokens,
						totalCost: usage.estimatedCost,
						challengesCompleted: 1
					});
				}
			} catch (error) {
				console.error('Error updating monthly usage:', error);
				throw error;
			}
		} catch (error) {
			console.error('Error recording token usage:', error);
			throw error;
		}
	}

	async updateChallengeCompletion(userId: string, completed: boolean): Promise<void> {
		if (!client) throw new Error('Client not initialized');
		try {
			const { data } = await client.models.UserStats.get({ id: userId });
			const stats = data ? data[0] : null;
			if (stats) {
				await client.models.UserStats.update({
					id: userId,
					totalChallenges: stats.totalChallenges + 1,
					completedChallenges: completed ? stats.completedChallenges + 1 : stats.completedChallenges,
					lastActiveAt: new Date().toISOString()
				});
			}
		} catch (error) {
			console.error('Error updating challenge completion:', error);
			throw error;
		}
	}

	async getMonthlyUsage(userId: string, yearMonth: string): Promise<MonthlyUsage | null> {
		if (!client) throw new Error('Client not initialized');
		try {
			const { data } = await client.models.MonthlyUsage.get({ 
				id: `${userId}-${yearMonth}`
			});
			return data ? data[0] : null;
		} catch (error) {
			console.error('Error getting monthly usage:', error);
			throw error;
		}
	}

	async updateStreak(userId: string): Promise<void> {
		if (!client) throw new Error('Client not initialized');
		try {
			const { data } = await client.models.UserStats.get({ id: userId });
			const stats = data ? data[0] : null;
			if (stats) {
				const lastActive = new Date(stats.lastActiveAt);
				const now = new Date();
				const daysDiff = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
				
				let newStreak = stats.currentStreak || 0;
				if (daysDiff <= 1) {
					newStreak += 1;
				} else {
					newStreak = 1;
				}

				await client.models.UserStats.update({
					id: userId,
					currentStreak: newStreak,
					longestStreak: Math.max(newStreak, stats.longestStreak || 0),
					lastActiveAt: now.toISOString()
				});
			}
		} catch (error) {
			console.error('Error updating streak:', error);
			throw error;
		}
	}
}
