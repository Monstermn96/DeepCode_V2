import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Initialize Amplify asynchronously using runtime fetch (like main.tsx)
async function initializeAmplify() {
	try {
		// Try to fetch amplify_outputs.json at runtime to avoid build-time import issues
		let outputs;
		try {
			const response = await fetch('/amplify_outputs.json');
			if (response.ok) {
				outputs = await response.json();
				console.log('✅ UserStats: Loaded amplify_outputs.json');
			} else {
				throw new Error('amplify_outputs.json not found');
			}
		} catch (error) {
			console.log('⚠️ UserStats: amplify_outputs.json not found, using fallback configuration');
			// Fallback configuration
			outputs = {
				version: "1.3",
				auth: {
					user_pool_id: import.meta.env.VITE_AUTH_USER_POOL_ID || 'local',
					user_pool_client_id: import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID || 'local',
					oauth: {},
					password_policy: {},
					standard_required_attributes: ["email"],
					username_attributes: ["email"],
					user_verification_types: ["email"],
					unauthenticated_identities_enabled: true
				},
				data: {
					url: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
					aws_region: import.meta.env.AWS_REGION || 'us-east-1',
					default_authorization_type: "userPool",
					authorization_types: ["userPool", "iam"]
				}
			};
		}

		// Configure Amplify with outputs
		Amplify.configure(outputs);
		return generateClient<Schema>();
	} catch (error) {
		console.error('Failed to initialize Amplify in UserStats:', error);
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

// Simplified client type
let client: ReturnType<typeof generateClient<Schema>> | null = null;

// Initialize the client without complex type inference
(async () => {
	const c = await initializeAmplify();
	if (c) client = c;
})();

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
			return data as unknown as UserStats | null;
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
			return data as unknown as UserStats | null;
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
			const userStats = data as any;
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
				const existingUsage = monthlyData as any;
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
			const stats = data as any;
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
			return data as unknown as MonthlyUsage | null;
		} catch (error) {
			console.error('Error getting monthly usage:', error);
			throw error;
		}
	}

	async updateStreak(userId: string): Promise<void> {
		if (!client) throw new Error('Client not initialized');
		try {
			const { data } = await client.models.UserStats.get({ id: userId });
			const stats = data as any;
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
