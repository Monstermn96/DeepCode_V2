import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { Amplify } from 'aws-amplify';

// Initialize DynamoDB client with Amplify configuration
const client = new DynamoDBClient({
  region: Amplify.getConfig().aws_project_region || 'us-east-1',
  credentials: async () => await Amplify.Auth.currentCredentials()
});

const docClient = DynamoDBDocumentClient.from(client);

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
      const response = await docClient.send(new GetCommand({
        TableName: 'UserStats',
        Key: { userId }
      }));
      
      return response.Item as UserStats || null;
    } catch (error) {
      console.error('Error fetching user stats:', error);
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
      updatedAt: now
    };

    try {
      await docClient.send(new PutCommand({
        TableName: 'UserStats',
        Item: initialStats,
        ConditionExpression: 'attribute_not_exists(userId)'
      }));
      
      return initialStats;
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
    const timestamp = new Date().toISOString();
    const yearMonth = timestamp.substring(0, 7); // YYYY-MM format

    try {
      // Record individual usage
      await docClient.send(new PutCommand({
        TableName: 'TokenUsage',
        Item: {
          userId,
          challengeId,
          ...usage,
          timestamp
        }
      }));

      // Update monthly aggregates
      await docClient.send(new UpdateCommand({
        TableName: 'UserMonthlyUsage',
        Key: {
          userId,
          yearMonth
        },
        UpdateExpression: `
          SET totalTokens = if_not_exists(totalTokens, :zero) + :tokens,
              totalCost = if_not_exists(totalCost, :zero) + :cost,
              challengesGenerated = if_not_exists(challengesGenerated, :zero) + :one,
              lastUpdated = :timestamp
        `,
        ExpressionAttributeValues: {
          ':zero': 0,
          ':tokens': usage.totalTokens,
          ':cost': usage.estimatedCost,
          ':one': 1,
          ':timestamp': timestamp
        }
      }));
    } catch (error) {
      console.error('Error recording token usage:', error);
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
      const stats = await this.getUserStats(userId) || 
                   await this.initializeUserStats(userId);

      const languageStats = stats.languageStats[language] || {
        completed: 0,
        proficiency: 0,
        totalPoints: 0
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

      await docClient.send(new UpdateCommand({
        TableName: 'UserStats',
        Key: { userId },
        UpdateExpression: `
          SET totalChallenges = totalChallenges + :one,
              completedChallenges = if_not_exists(completedChallenges, :zero) + :completedInc,
              totalPoints = if_not_exists(totalPoints, :zero) + :points,
              lastActive = :now,
              languageStats.#lang = :langStats,
              updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':completedInc': completed ? 1 : 0,
          ':points': points,
          ':now': now,
          ':langStats': languageStats
        },
        ExpressionAttributeNames: {
          '#lang': language
        }
      }));
    } catch (error) {
      console.error('Error updating challenge completion:', error);
      throw error;
    }
  }

  async getMonthlyUsage(userId: string, yearMonth: string): Promise<{
    totalTokens: number;
    totalCost: number;
    challengesGenerated: number;
  }> {
    try {
      const response = await docClient.send(new GetCommand({
        TableName: 'UserMonthlyUsage',
        Key: {
          userId,
          yearMonth
        }
      }));

      return response.Item || {
        totalTokens: 0,
        totalCost: 0,
        challengesGenerated: 0
      };
    } catch (error) {
      console.error('Error fetching monthly usage:', error);
      throw error;
    }
  }

  async updateStreak(userId: string): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    try {
      const stats = await this.getUserStats(userId);
      if (!stats) return;

      const lastActiveDate = new Date(stats.lastActive.split('T')[0]);
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

      await docClient.send(new UpdateCommand({
        TableName: 'UserStats',
        Key: { userId },
        UpdateExpression: `
          SET currentStreak = :newStreak,
              longestStreak = greatest(:newStreak, if_not_exists(longestStreak, :zero)),
              lastActive = :today,
              updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':newStreak': newStreak,
          ':zero': 0,
          ':today': today,
          ':now': now.toISOString()
        }
      }));
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }
} 