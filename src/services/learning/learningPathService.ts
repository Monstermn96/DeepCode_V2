import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../amplify/data/resource';
import { 
  LearningPath, 
  Milestone,
  SkillAssessment 
} from '../../types/learning';
import { skillAssessmentService } from './skillAssessmentService';

const client = generateClient<Schema>();

// Predefined learning path templates
const LEARNING_PATH_TEMPLATES = {
  'beginner-fundamentals': {
    name: 'Programming Fundamentals',
    description: 'Master the basics of programming with any language',
    targetSkills: ['loops', 'conditionals', 'functions', 'arrays', 'error-handling'],
    difficulty: 'beginner' as const,
    estimatedDuration: 30,
    milestones: [
      { name: 'Control Flow Master', requiredChallenges: 5 },
      { name: 'Function Expert', requiredChallenges: 5 },
      { name: 'Array Manipulator', requiredChallenges: 5 }
    ]
  },
  'data-structures': {
    name: 'Data Structures Journey',
    description: 'Learn essential data structures from arrays to trees',
    targetSkills: ['arrays', 'linked-lists', 'stacks', 'queues', 'trees', 'hash-tables'],
    difficulty: 'intermediate' as const,
    estimatedDuration: 45,
    milestones: [
      { name: 'Linear Structures', requiredChallenges: 10 },
      { name: 'Tree Traverser', requiredChallenges: 8 },
      { name: 'Hash Table Hero', requiredChallenges: 7 }
    ]
  },
  'algorithms-master': {
    name: 'Algorithm Mastery',
    description: 'Master common algorithms and problem-solving techniques',
    targetSkills: ['sorting', 'searching', 'recursion', 'dynamic-programming', 'greedy'],
    difficulty: 'advanced' as const,
    estimatedDuration: 60,
    milestones: [
      { name: 'Sorting Specialist', requiredChallenges: 8 },
      { name: 'Recursion Master', requiredChallenges: 10 },
      { name: 'DP Champion', requiredChallenges: 12 }
    ]
  }
};

export class LearningPathService {
  // Create a new learning path for a user
  async createLearningPath(
    userId: string,
    pathData: Partial<LearningPath>
  ): Promise<LearningPath> {
    const { data: path } = await client.models.LearningPath.create({
      userId,
      name: pathData.name || 'Custom Learning Path',
      description: pathData.description,
      targetSkills: pathData.targetSkills || [],
      languages: pathData.languages || [],
      difficulty: pathData.difficulty || 'intermediate',
      estimatedDuration: pathData.estimatedDuration || 30,
      isActive: true,
      progress: 0,
      milestones: JSON.stringify(pathData.milestones || []),
      completedChallenges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (!path) throw new Error('Failed to create learning path');

    return this.formatLearningPath(path);
  }

  // Create a learning path from template
  async createFromTemplate(
    userId: string,
    templateId: keyof typeof LEARNING_PATH_TEMPLATES,
    languages: string[]
  ): Promise<LearningPath> {
    const template = LEARNING_PATH_TEMPLATES[templateId];
    if (!template) throw new Error('Invalid template ID');

    return this.createLearningPath(userId, {
      ...template,
      languages,
      milestones: template.milestones.map((m, index) => ({
        id: `milestone-${index}`,
        name: m.name,
        description: `Complete ${m.requiredChallenges} challenges`,
        requiredChallenges: m.requiredChallenges,
        completedChallenges: 0,
        isCompleted: false
      }))
    });
  }

  // Get user's active learning paths
  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    const { data: paths } = await client.models.LearningPath.list({
      filter: { userId: { eq: userId }, isActive: { eq: true } }
    });

    return paths.map(path => this.formatLearningPath(path));
  }

  // Update learning path progress
  async updateProgress(
    pathId: string,
    challengeId: string,
    challengeSkills: string[]
  ): Promise<LearningPath> {
    const { data: path } = await client.models.LearningPath.get({ id: pathId });
    if (!path) throw new Error('Learning path not found');

    // Check if challenge contributes to this path
    const relevantSkills = challengeSkills.filter(skill => 
      path.targetSkills?.includes(skill)
    );

    if (relevantSkills.length === 0) {
      return this.formatLearningPath(path); // No progress made
    }

    // Update completed challenges
    const completedChallenges = path.completedChallenges || [];
    if (!completedChallenges.includes(challengeId)) {
      completedChallenges.push(challengeId);
    }

    // Update milestones
    const milestones = this.parseMilestones(path.milestones);
    milestones.forEach(milestone => {
      if (!milestone.isCompleted) {
        milestone.completedChallenges = completedChallenges.length;
        if (milestone.completedChallenges >= milestone.requiredChallenges) {
          milestone.isCompleted = true;
        }
      }
    });

    // Calculate overall progress
    const totalRequired = milestones.reduce((sum, m) => sum + m.requiredChallenges, 0);
    const progress = Math.min(100, Math.round((completedChallenges.length / totalRequired) * 100));

    // Check if path is completed
    const isCompleted = milestones.every(m => m.isCompleted);

    // Update the path
    const { data: updatedPath } = await client.models.LearningPath.update({
      id: pathId,
      completedChallenges,
      milestones: JSON.stringify(milestones),
      progress,
      currentChallengeId: challengeId,
      updatedAt: new Date().toISOString(),
      ...(isCompleted ? { completedAt: new Date().toISOString(), isActive: false } : {})
    });

    return this.formatLearningPath(updatedPath!);
  }

  // Recommend learning paths based on user's skills
  async recommendLearningPaths(userId: string): Promise<LearningPath[]> {
    const assessments = await skillAssessmentService.getUserSkillAssessments(userId);
    const userSkills = new Set(assessments.map(a => a.skill));
    const avgLevel = assessments.reduce((sum, a) => sum + a.level, 0) / assessments.length || 0;

    const recommendations: LearningPath[] = [];

    // Determine user's level
    const userLevel = avgLevel < 30 ? 'beginner' : avgLevel < 70 ? 'intermediate' : 'advanced';

    // Recommend paths based on level and missing skills
    Object.entries(LEARNING_PATH_TEMPLATES).forEach(([id, template]) => {
      const missingSkills = template.targetSkills.filter(skill => !userSkills.has(skill));
      
      if (missingSkills.length > 0 && 
          (template.difficulty === userLevel || 
           (userLevel === 'intermediate' && template.difficulty === 'beginner') ||
           (userLevel === 'advanced' && template.difficulty === 'intermediate'))) {
        recommendations.push({
          id: id,
          name: template.name,
          description: template.description,
          targetSkills: template.targetSkills,
          languages: [],
          difficulty: template.difficulty,
          progress: 0,
          estimatedDuration: template.estimatedDuration,
          milestones: template.milestones.map((m, index) => ({
            id: `milestone-${index}`,
            name: m.name,
            description: `Complete ${m.requiredChallenges} challenges`,
            requiredChallenges: m.requiredChallenges,
            completedChallenges: 0,
            isCompleted: false
          })),
          isActive: false,
          completedChallenges: []
        });
      }
    });

    return recommendations;
  }

  // Get next challenge recommendation for a learning path
  async getNextChallenge(pathId: string): Promise<{
    topic: string;
    languages: string[];
    difficulty: string;
    targetSkills: string[];
  }> {
    const { data: path } = await client.models.LearningPath.get({ id: pathId });
    if (!path) throw new Error('Learning path not found');

    // Determine which skills need more practice
    const assessments = await skillAssessmentService.getUserSkillAssessments(path.userId);
    const skillLevels = new Map(assessments.map(a => [a.skill, a.level]));

    // Find the weakest skill in the path
    const targetSkills = path.targetSkills?.filter((s): s is string => s !== null) || [];
    const targetSkill = targetSkills.reduce((weakest, skill) => {
      const level = skillLevels.get(skill) || 0;
      const weakestLevel = skillLevels.get(weakest) || 0;
      return level < weakestLevel ? skill : weakest;
    }, targetSkills[0] || 'arrays') || 'arrays';

    // Generate topic based on skill
    const topic = this.generateTopicForSkill(targetSkill);

    // Filter out null values from languages
    const languages = path.languages?.filter((l): l is string => l !== null) || ['Python'];

    return {
      topic,
      languages,
      difficulty: path.difficulty || 'intermediate',
      targetSkills: [targetSkill]
    };
  }

  // Generate a topic suggestion for a specific skill
  private generateTopicForSkill(skill: string): string {
    const topicMap: Record<string, string[]> = {
      'arrays': ['Array manipulation', 'Array searching', 'Array sorting', 'Two-pointer technique'],
      'loops': ['Pattern printing', 'Number sequences', 'String manipulation with loops'],
      'recursion': ['Recursive sequences', 'Tree traversal', 'Backtracking problems'],
      'sorting': ['Custom sorting', 'Sorting algorithms', 'Sort optimization'],
      'trees': ['Binary tree operations', 'Tree traversal', 'Binary search trees'],
      'dynamic-programming': ['Memoization problems', 'Optimal substructure', 'DP optimization'],
      'hash-tables': ['Hash map usage', 'Frequency counting', 'Two-sum variations']
    };

    const topics = topicMap[skill] || [`Practice ${skill} concepts`];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  // Parse milestones from JSON
  private parseMilestones(milestonesJson: any): Milestone[] {
    if (typeof milestonesJson === 'string') {
      try {
        return JSON.parse(milestonesJson);
      } catch {
        return [];
      }
    }
    return Array.isArray(milestonesJson) ? milestonesJson : [];
  }

  // Format learning path for consistent output
  private formatLearningPath(path: any): LearningPath {
    return {
      id: path.id,
      name: path.name,
      description: path.description || '',
      targetSkills: path.targetSkills || [],
      languages: path.languages || [],
      difficulty: path.difficulty || 'intermediate',
      progress: path.progress || 0,
      estimatedDuration: path.estimatedDuration || 30,
      milestones: this.parseMilestones(path.milestones),
      isActive: path.isActive !== false,
      completedChallenges: path.completedChallenges || [],
      currentChallengeId: path.currentChallengeId
    };
  }

  // Calculate estimated completion date
  async getEstimatedCompletion(pathId: string): Promise<Date | null> {
    const { data: path } = await client.models.LearningPath.get({ id: pathId });
    if (!path || !path.isActive) return null;

    // Get user's average completion rate
    const { data: progressRecords } = await client.models.ProgressTracking.list({
      filter: { userId: { eq: path.userId } },
      limit: 7 // Last week
    });

    if (progressRecords.length === 0) return null;

    const avgChallengesPerDay = progressRecords.reduce(
      (sum, record) => sum + (record.challengesCompleted || 0), 0
    ) / progressRecords.length;

    if (avgChallengesPerDay === 0) return null;

    const milestones = this.parseMilestones(path.milestones);
    const totalRequired = milestones.reduce((sum, m) => sum + m.requiredChallenges, 0);
    const remaining = totalRequired - (path.completedChallenges?.length || 0);

    const daysRemaining = Math.ceil(remaining / avgChallengesPerDay);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

    return estimatedDate;
  }
}

// Export singleton instance
export const learningPathService = new LearningPathService(); 