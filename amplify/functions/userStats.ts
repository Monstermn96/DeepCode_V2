import { type Schema } from '../data/resource';
import { type APIGatewayProxyHandler, type APIGatewayProxyEvent } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const { operation, userId, data } = JSON.parse(event.body || '{}');

  try {
    switch (operation) {
      case 'initialize':
        return await initializeUserStats(userId);
      case 'recordUsage':
        return await recordTokenUsage(userId, data.challengeId, data.usage);
      case 'updateCompletion':
        return await updateChallengeCompletion(userId, data.completed);
      case 'getMonthlyUsage':
        return await getMonthlyUsage(userId, data.yearMonth);
      case 'updateStreak':
        return await updateStreak(userId);
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid operation' })
        };
    }
  } catch (error) {
    console.error('Error in userStats function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function initializeUserStats(userId: string) {
  const now = new Date().toISOString();
  const initialStats = {
    id: userId,
    totalChallenges: 0,
    completedChallenges: 0,
    lastActiveAt: now,
    currentStreak: 0,
    longestStreak: 0,
    updatedAt: now
  };

  try {
    const { data, errors } = await client.models.UserStats.create(initialStats);
    if (errors) throw errors;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ data })
    };
  } catch (error) {
    throw error;
  }
}

async function recordTokenUsage(
  userId: string,
  challengeId: string,
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    model: string;
    challengeType: string;
  }
) {
  const timestamp = new Date().toISOString();
  const yearMonth = timestamp.substring(0, 7);

  try {
    // Record individual usage
    await client.models.TokenUsage.create({
      id: `${userId}_${challengeId}`,
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
      totalTokens: usage.totalTokens,
      totalCost: usage.estimatedCost,
      challengesCompleted: 1
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    throw error;
  }
}

async function updateChallengeCompletion(userId: string, completed: boolean) {
  const now = new Date().toISOString();

  try {
    await client.models.UserStats.update({
      id: userId,
      totalChallenges: 1,
      completedChallenges: completed ? 1 : 0,
      lastActiveAt: now
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    throw error;
  }
}

async function getMonthlyUsage(userId: string, yearMonth: string) {
  try {
    const { data, errors } = await client.models.MonthlyUsage.get({
      id: `${userId}_${yearMonth}`
    });
    if (errors) throw errors;

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          totalTokens: data?.totalTokens || 0,
          totalCost: data?.totalCost || 0,
          challengesCompleted: data?.challengesCompleted || 0,
        }
      })
    };
  } catch (error) {
    throw error;
  }
}

async function updateStreak(userId: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  try {
    const { data: stats, errors } = await client.models.UserStats.get({
      id: userId
    });
    if (errors) throw errors;
    if (!stats) return {
      statusCode: 404,
      body: JSON.stringify({ error: 'User stats not found' })
    };

    const lastActiveDate = new Date(stats.lastActiveAt || now);
    const daysSinceLastActive = Math.floor(
      (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentStreak = stats.currentStreak || 0;
    let newStreak = currentStreak;
    if (daysSinceLastActive === 1) {
      newStreak += 1;
    } else if (daysSinceLastActive > 1) {
      newStreak = 1;
    }

    await client.models.UserStats.update({
      id: userId,
      lastActiveAt: today,
      totalChallenges: stats.totalChallenges || 0,
      completedChallenges: stats.completedChallenges || 0
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, newStreak })
    };
  } catch (error) {
    throw error;
  }
} 