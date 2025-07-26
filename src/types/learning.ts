// Learning-related types and interfaces

export interface LearningMetrics {
  totalChallengesCompleted: number;
  averageDifficulty: number;
  totalPracticeMinutes: number;
  currentStreak: number;
  weeklyProgress: number;
  weeklyGoal: number;
  skillLevels: Record<string, number>;
  languageStats: Record<string, LanguageProgress>;
  recentAchievements: Achievement[];
}

export interface LanguageProgress {
  completed: number;
  avgScore: number;
  lastPracticed: Date;
  skillBreakdown: Record<string, number>;
}

export interface SkillAssessment {
  skill: string;
  level: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  lastAssessed: Date;
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  targetSkills: string[];
  languages: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  progress: number; // 0-100
  estimatedDuration: number; // days
  milestones: Milestone[];
  isActive: boolean;
  completedChallenges: string[];
  currentChallengeId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  requiredChallenges: number;
  completedChallenges: number;
  isCompleted: boolean;
  reward?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'skill' | 'challenge' | 'milestone' | 'special';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: Date;
  progress?: number; // For progressive achievements
}

export interface DailyProgress {
  date: Date;
  challengesCompleted: number;
  practiceMinutes: number;
  skillsImproved: Record<string, number>;
  mood?: 'frustrated' | 'neutral' | 'confident' | 'excited';
  achievements: string[];
}

export interface SkillRecommendation {
  skill: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedChallenges: string[];
  estimatedImprovement: number;
}

export interface LearningStats {
  daily: DailyProgress[];
  weekly: WeeklyStats;
  monthly: MonthlyStats;
  allTime: AllTimeStats;
}

export interface WeeklyStats {
  challengesCompleted: number;
  practiceMinutes: number;
  skillsImproved: number;
  streakDays: number;
  mostPracticedLanguage: string;
  mostImprovedSkill: string;
}

export interface MonthlyStats {
  challengesCompleted: number;
  practiceMinutes: number;
  averageDifficulty: number;
  skillLevelsGained: number;
  achievementsEarned: number;
  learningPathsCompleted: number;
}

export interface AllTimeStats {
  totalChallenges: number;
  totalPracticeHours: number;
  languagesMastered: string[];
  topSkills: Array<{ skill: string; level: number }>;
  achievementPoints: number;
  learningPathsCompleted: number;
}

export interface ChallengeAnalysis {
  challengeId: string;
  timeSpent: number;
  attempts: number;
  success: boolean;
  skillsUsed: string[];
  skillImprovements: Record<string, number>;
  feedback?: string;
}

export interface LearningPlan {
  userId: string;
  activePaths: LearningPath[];
  recommendedPaths: LearningPath[];
  dailyGoal: number; // minutes
  weeklyGoal: number; // challenges
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
  focusAreas: string[];
}

export interface SkillTree {
  categories: SkillCategory[];
  userProgress: Record<string, number>;
  unlockedSkills: string[];
  nextSkills: string[];
}

export interface SkillCategory {
  id: string;
  name: string;
  description: string;
  skills: Skill[];
  icon: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  prerequisites: string[];
  difficulty: number; // 1-5
  isUnlocked: boolean;
  level: number; // 0-100
}

// Chart data types for visualization
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
}

export interface SkillRadarData {
  skill: string;
  level: number;
  maxLevel: number;
}

export interface ProgressChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
} 