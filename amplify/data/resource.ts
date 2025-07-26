import { type ClientSchema, a } from '@aws-amplify/data-schema';
import { defineData } from '@aws-amplify/backend';

// Define your schema using the new "Amplify Data" DSL
const schema = a.schema({
  // Existing models - Enhanced for learning tracking
  UserStats: a.model({
    id: a.string().required(),
    totalChallenges: a.integer(),
    completedChallenges: a.integer(),
    lastActiveAt: a.datetime(),
    currentStreak: a.integer(),
    longestStreak: a.integer(),
    totalTokensUsed: a.integer(),
    totalCost: a.float(),
    // New learning-focused fields
    totalPracticeTime: a.integer(), // Total minutes spent practicing
    averageDifficulty: a.float(), // Average difficulty of completed challenges
    languageStats: a.json(), // { language: { completed: number, avgScore: number } }
    topicsMastered: a.string().array(), // List of mastered topics
    skillLevels: a.json(), // { skill: level (0-100) }
    weeklyGoal: a.integer().default(5), // Challenges per week
    weeklyProgress: a.integer().default(0), // Challenges completed this week
    lastSkillAssessment: a.datetime(),
    preferredLanguages: a.string().array(),
    learningPace: a.enum(['slow', 'moderate', 'fast']),
    experienceLevel: a.enum(['beginner', 'intermediate', 'advanced']),
    expiresAt: a.timestamp()
  })
  .authorization((allow) => [allow.ownerDefinedIn('id')]),
    
  TokenUsage: a.model({
    id: a.string().required(),
    userId: a.string().required(),
    challengeId: a.string().required(),
    timestamp: a.datetime().required(),
    tokensUsed: a.integer(),
    promptTokens: a.integer(),
    completionTokens: a.integer(),
    cost: a.float(),
    expiresAt: a.timestamp()
  })
  .authorization((allow) => [allow.ownerDefinedIn('id')]),

  MonthlyUsage: a.model({
    id: a.string().required(),
    userId: a.string().required(),
    yearMonth: a.string().required(),
    totalTokens: a.integer(),
    totalCost: a.float(),
    challengesCompleted: a.integer(),
    expiresAt: a.timestamp()
  })
  .authorization((allow) => [allow.ownerDefinedIn('id')]),

  // AI Request tracking model
  AIRequest: a.model({
    id: a.id(),
    userId: a.string().required(),
    type: a.enum(['challenge', 'evaluation', 'feedback']),
    status: a.enum(['pending', 'processing', 'completed', 'failed']),
    input: a.json(),
    response: a.json(),
    error: a.string(),
    retryCount: a.integer().default(0),
    processingTime: a.integer(),
    modelUsed: a.string(),
    tokenUsage: a.json(),
    createdAt: a.datetime(),
    completedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Challenge model for storing generated challenges
  Challenge: a.model({
    id: a.id(),
    userId: a.string().required(),
    title: a.string().required(),
    description: a.string().required(),
    language: a.enum(['Python', 'Java', 'C#']),
    difficulty: a.enum(['Easy', 'Medium', 'Hard']),
    starterCode: a.string(),
    testCases: a.json(),
    hints: a.json(),
    solution: a.string(),
    userCode: a.string(),
    isCompleted: a.boolean().default(false),
    createdAt: a.datetime(),
    completedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Conversation history model
  ConversationHistory: a.model({
    id: a.id(),
    userId: a.string().required(),
    conversationId: a.string().required(),
    messages: a.json(),
    metadata: a.json(),
    createdAt: a.datetime(),
    updatedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Learning Path model - Custom learning paths for users
  LearningPath: a.model({
    id: a.id(),
    userId: a.string().required(),
    name: a.string().required(),
    description: a.string(),
    targetSkills: a.string().array(), // Skills to focus on
    languages: a.string().array(), // Languages to practice
    difficulty: a.enum(['beginner', 'intermediate', 'advanced']),
    estimatedDuration: a.integer(), // Estimated days to complete
    isActive: a.boolean().default(true),
    progress: a.float().default(0), // 0-100 percentage
    milestones: a.json(), // Array of milestone objects
    completedChallenges: a.string().array(), // Challenge IDs
    currentChallengeId: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    completedAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Skill Assessment model - Track user's skill levels
  SkillAssessment: a.model({
    id: a.id(),
    userId: a.string().required(),
    skill: a.string().required(), // e.g., "arrays", "recursion", "OOP"
    language: a.string(), // Optional: skill in specific language
    level: a.integer().default(0), // 0-100
    lastAssessed: a.datetime(),
    assessmentHistory: a.json(), // Array of { date, level, challengeId }
    strengths: a.string().array(),
    weaknesses: a.string().array(),
    recommendedTopics: a.string().array(),
    totalAttempts: a.integer().default(0),
    successRate: a.float().default(0)
  })
  .authorization((allow) => [allow.owner()]),

  // Progress Tracking model - Daily/Weekly progress
  ProgressTracking: a.model({
    id: a.id(),
    userId: a.string().required(),
    date: a.date().required(),
    challengesCompleted: a.integer().default(0),
    practiceMinutes: a.integer().default(0),
    skillsImproved: a.json(), // { skill: improvement }
    learningPathProgress: a.json(), // { pathId: progressMade }
    achievements: a.string().array(), // Achievement IDs earned
    notes: a.string(), // User notes for the day
    mood: a.enum(['frustrated', 'neutral', 'confident', 'excited']),
    createdAt: a.datetime()
  })
  .authorization((allow) => [allow.owner()]),

  // Achievement model - Gamification
  Achievement: a.model({
    id: a.id(),
    name: a.string().required(),
    description: a.string().required(),
    icon: a.string(), // Icon name or URL
    category: a.enum(['streak', 'skill', 'challenge', 'milestone', 'special']),
    requirement: a.json(), // Criteria for earning
    points: a.integer().default(10),
    rarity: a.enum(['common', 'rare', 'epic', 'legendary']),
    isActive: a.boolean().default(true)
  })
  .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read'])]),

  // User Achievement model - Join table
  UserAchievement: a.model({
    id: a.id(),
    userId: a.string().required(),
    achievementId: a.string().required(),
    earnedAt: a.datetime().required(),
    progress: a.float().default(100), // For progressive achievements
    metadata: a.json() // Additional context about earning
  })
  .authorization((allow) => [allow.owner()]),
});

// Register the schema resource in Amplify
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  },
});

// Export the schema type for the client
export type Schema = ClientSchema<typeof schema>;
