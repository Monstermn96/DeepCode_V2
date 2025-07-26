import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../amplify/data/resource';
import { 
  SkillAssessment, 
  ChallengeAnalysis, 
  SkillRecommendation 
} from '../../types/learning';

const client = generateClient<Schema>();

// Skill categories and their relationships
const SKILL_CATEGORIES = {
  'Data Structures': ['arrays', 'linked-lists', 'trees', 'graphs', 'hash-tables', 'stacks', 'queues'],
  'Algorithms': ['sorting', 'searching', 'recursion', 'dynamic-programming', 'greedy', 'backtracking'],
  'Programming Concepts': ['loops', 'conditionals', 'functions', 'OOP', 'error-handling', 'async-programming'],
  'Problem Solving': ['pattern-recognition', 'optimization', 'debugging', 'edge-cases', 'complexity-analysis'],
  'Language Specific': ['syntax', 'libraries', 'best-practices', 'language-features']
};

// Skill difficulty weights
const SKILL_WEIGHTS: Record<string, number> = {
  'arrays': 1,
  'loops': 1,
  'conditionals': 1,
  'functions': 2,
  'recursion': 3,
  'OOP': 3,
  'linked-lists': 3,
  'trees': 4,
  'graphs': 4,
  'dynamic-programming': 5,
  'async-programming': 4
};

export class SkillAssessmentService {
  // Analyze a challenge completion and extract skill improvements
  async analyzeChallengeCompletion(
    userId: string,
    challengeId: string,
    code: string,
    success: boolean,
    timeSpent: number,
    attempts: number
  ): Promise<ChallengeAnalysis> {
    // Get challenge details
    const { data: challenge } = await client.models.Challenge.get({ id: challengeId });
    if (!challenge) throw new Error('Challenge not found');

    // Extract skills used from challenge metadata
    const skillsUsed = this.extractSkillsFromChallenge(challenge);
    
    // Calculate skill improvements based on performance
    const skillImprovements = this.calculateSkillImprovements(
      skillsUsed,
      success,
      timeSpent,
      attempts,
      challenge.difficulty as 'Easy' | 'Medium' | 'Hard'
    );

    // Update skill assessments
    await this.updateSkillAssessments(userId, skillImprovements, challengeId);

    return {
      challengeId,
      timeSpent,
      attempts,
      success,
      skillsUsed,
      skillImprovements,
      feedback: this.generateFeedback(success, attempts, timeSpent)
    };
  }

  // Extract skills from challenge content
  private extractSkillsFromChallenge(challenge: any): string[] {
    const skills: string[] = [];
    const description = challenge.description.toLowerCase();
    const title = challenge.title.toLowerCase();
    const combinedText = `${title} ${description}`;

    // Check for skill keywords
    Object.entries(SKILL_CATEGORIES).forEach(([category, categorySkills]) => {
      categorySkills.forEach(skill => {
        const skillKeywords = this.getSkillKeywords(skill);
        if (skillKeywords.some(keyword => combinedText.includes(keyword))) {
          skills.push(skill);
        }
      });
    });

    // Add language-specific skill
    if (challenge.language) {
      skills.push(`${challenge.language.toLowerCase()}-syntax`);
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  // Get keywords associated with a skill
  private getSkillKeywords(skill: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'arrays': ['array', 'list', 'index', 'element'],
      'loops': ['loop', 'iterate', 'for', 'while'],
      'recursion': ['recursive', 'recursion', 'base case'],
      'sorting': ['sort', 'order', 'arrange'],
      'searching': ['search', 'find', 'lookup'],
      'trees': ['tree', 'node', 'parent', 'child', 'leaf'],
      'graphs': ['graph', 'vertex', 'edge', 'path'],
      'dynamic-programming': ['dynamic programming', 'memoization', 'dp'],
      'OOP': ['class', 'object', 'inheritance', 'encapsulation'],
      'hash-tables': ['hash', 'map', 'dictionary', 'key-value']
    };

    return keywordMap[skill] || [skill.replace('-', ' ')];
  }

  // Calculate skill improvements based on performance
  private calculateSkillImprovements(
    skills: string[],
    success: boolean,
    timeSpent: number,
    attempts: number,
    difficulty: 'Easy' | 'Medium' | 'Hard'
  ): Record<string, number> {
    const improvements: Record<string, number> = {};
    
    // Base improvement based on success
    const baseImprovement = success ? 10 : 3;
    
    // Difficulty multiplier
    const difficultyMultiplier = {
      'Easy': 0.8,
      'Medium': 1.0,
      'Hard': 1.5
    }[difficulty];

    // Performance multiplier (better performance = more improvement)
    const performanceMultiplier = success
      ? Math.max(0.5, Math.min(1.5, 2 - (attempts - 1) * 0.2))
      : 0.3;

    skills.forEach(skill => {
      const skillWeight = SKILL_WEIGHTS[skill] || 2;
      const improvement = Math.round(
        baseImprovement * difficultyMultiplier * performanceMultiplier / skillWeight
      );
      improvements[skill] = Math.min(improvement, 15); // Cap at 15 points per challenge
    });

    return improvements;
  }

  // Update skill assessments in the database
  private async updateSkillAssessments(
    userId: string,
    improvements: Record<string, number>,
    challengeId: string
  ): Promise<void> {
    const updates = Object.entries(improvements).map(async ([skill, improvement]) => {
      // Get existing assessment
      const { data: existingAssessments } = await client.models.SkillAssessment.list({
        filter: { userId: { eq: userId }, skill: { eq: skill } }
      });

      const existing = existingAssessments[0];
      const currentLevel = existing?.level || 0;
      const newLevel = Math.min(100, currentLevel + improvement);

      if (existing) {
        // Update existing assessment
        const history = Array.isArray(existing.assessmentHistory) 
          ? existing.assessmentHistory 
          : [];
        history.push({
          date: new Date().toISOString(),
          level: newLevel,
          challengeId
        });

        await client.models.SkillAssessment.update({
          id: existing.id,
          level: newLevel,
          lastAssessed: new Date().toISOString(),
          assessmentHistory: history,
          totalAttempts: (existing.totalAttempts || 0) + 1,
          successRate: this.calculateSuccessRate(history)
        });
      } else {
        // Create new assessment
        await client.models.SkillAssessment.create({
          userId,
          skill,
          level: newLevel,
          lastAssessed: new Date().toISOString(),
          assessmentHistory: [{
            date: new Date().toISOString(),
            level: newLevel,
            challengeId
          }],
          totalAttempts: 1,
          successRate: 100
        });
      }
    });

    await Promise.all(updates);
  }

  // Calculate success rate from history
  private calculateSuccessRate(history: any[]): number {
    if (!history || history.length === 0) return 0;
    
    let improvements = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].level > history[i - 1].level) {
        improvements++;
      }
    }
    
    return Math.round((improvements / (history.length - 1)) * 100);
  }

  // Generate feedback based on performance
  private generateFeedback(success: boolean, attempts: number, timeSpent: number): string {
    if (success) {
      if (attempts === 1 && timeSpent < 300) { // Less than 5 minutes
        return "Excellent work! You solved this quickly and efficiently.";
      } else if (attempts === 1) {
        return "Great job! You got it on the first try.";
      } else if (attempts <= 3) {
        return "Well done! Your persistence paid off.";
      } else {
        return "Good job completing the challenge! Consider reviewing similar problems.";
      }
    } else {
      return "Keep practicing! Each attempt helps you learn and improve.";
    }
  }

  // Get user's current skill assessments
  async getUserSkillAssessments(userId: string): Promise<SkillAssessment[]> {
    const { data: assessments } = await client.models.SkillAssessment.list({
      filter: { userId: { eq: userId } }
    });

    return assessments.map(assessment => ({
      skill: assessment.skill,
      level: assessment.level || 0,
      trend: this.calculateTrend(assessment.assessmentHistory),
      lastAssessed: new Date(assessment.lastAssessed || Date.now()),
      strengths: (assessment.strengths || []).filter((s): s is string => s !== null),
      weaknesses: (assessment.weaknesses || []).filter((s): s is string => s !== null),
      recommendedTopics: (assessment.recommendedTopics || []).filter((s): s is string => s !== null)
    }));
  }

  // Calculate skill trend
  private calculateTrend(history: any): 'improving' | 'stable' | 'declining' {
    if (!history || history.length < 2) return 'stable';
    
    const recentHistory = history.slice(-5); // Last 5 assessments
    let totalChange = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      totalChange += recentHistory[i].level - recentHistory[i - 1].level;
    }
    
    if (totalChange > 5) return 'improving';
    if (totalChange < -5) return 'declining';
    return 'stable';
  }

  // Get skill recommendations
  async getSkillRecommendations(userId: string): Promise<SkillRecommendation[]> {
    const assessments = await this.getUserSkillAssessments(userId);
    const recommendations: SkillRecommendation[] = [];

    // Identify weak skills
    const weakSkills = assessments
      .filter(a => a.level < 40)
      .sort((a, b) => a.level - b.level);

    // Identify prerequisite skills
    const allSkills = Object.values(SKILL_CATEGORIES).flat();
    const assessedSkills = new Set(assessments.map(a => a.skill));
    const missingBasicSkills = allSkills
      .filter(skill => !assessedSkills.has(skill) && (SKILL_WEIGHTS[skill] || 2) <= 2);

    // Add recommendations for weak skills
    weakSkills.slice(0, 3).forEach(skill => {
      recommendations.push({
        skill: skill.skill,
        reason: `Your ${skill.skill} skills need improvement (current level: ${skill.level}/100)`,
        priority: skill.level < 20 ? 'high' : 'medium',
        suggestedChallenges: [], // Would be populated with actual challenge IDs
        estimatedImprovement: 15
      });
    });

    // Add recommendations for missing basic skills
    missingBasicSkills.slice(0, 2).forEach(skill => {
      recommendations.push({
        skill,
        reason: `${skill} is a fundamental skill you haven't practiced yet`,
        priority: 'high',
        suggestedChallenges: [],
        estimatedImprovement: 20
      });
    });

    return recommendations;
  }

  // Identify user strengths and weaknesses
  async identifyStrengthsAndWeaknesses(userId: string): Promise<{
    strengths: string[];
    weaknesses: string[];
  }> {
    const assessments = await this.getUserSkillAssessments(userId);
    
    const strengths = assessments
      .filter(a => a.level >= 70)
      .sort((a, b) => b.level - a.level)
      .slice(0, 5)
      .map(a => a.skill);

    const weaknesses = assessments
      .filter(a => a.level < 40)
      .sort((a, b) => a.level - b.level)
      .slice(0, 5)
      .map(a => a.skill);

    // Update assessments with strengths/weaknesses
    await Promise.all(assessments.map(async assessment => {
      const isStrength = strengths.includes(assessment.skill);
      const isWeakness = weaknesses.includes(assessment.skill);
      
      if (isStrength || isWeakness) {
        const existing = await client.models.SkillAssessment.list({
          filter: { userId: { eq: userId }, skill: { eq: assessment.skill } }
        });
        
        if (existing.data[0]) {
          await client.models.SkillAssessment.update({
            id: existing.data[0].id,
            strengths: isStrength ? [assessment.skill] : [],
            weaknesses: isWeakness ? [assessment.skill] : []
          });
        }
      }
    }));

    return { strengths, weaknesses };
  }
}

// Export singleton instance
export const skillAssessmentService = new SkillAssessmentService(); 