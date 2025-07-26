import React, { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import { LearningMetrics, WeeklyStats, SkillAssessment, LanguageProgress } from '../types/learning';
import { skillAssessmentService } from '../services/learning/skillAssessmentService';
import { learningPathService } from '../services/learning/learningPathService';
import styles from './LearningStats.module.css';

const client = generateClient<Schema>();

interface LearningStatsProps {
  userId: string;
}

export const LearningStats: React.FC<LearningStatsProps> = ({ userId }) => {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [topSkills, setTopSkills] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningMetrics();
  }, [userId]);

  const loadLearningMetrics = async () => {
    try {
      setLoading(true);

      // Get user stats
      const { data: userStats } = await client.models.UserStats.get({ id: userId });
      
      // Get skill assessments
      const assessments = await skillAssessmentService.getUserSkillAssessments(userId);
      
      // Get learning paths
      const learningPaths = await learningPathService.getUserLearningPaths(userId);
      
      // Get recent progress tracking
      const { data: recentProgress } = await client.models.ProgressTracking.list({
        filter: { userId: { eq: userId } },
        limit: 7 // Last week
      });

      // Calculate weekly stats
      const weekly = calculateWeeklyStats(recentProgress);
      setWeeklyStats(weekly);

      // Get top skills
      const top = assessments
        .sort((a, b) => b.level - a.level)
        .slice(0, 5);
      setTopSkills(top);

      // Calculate learning metrics
      if (userStats) {
        // Parse JSON fields
        const skillLevels = typeof userStats.skillLevels === 'object' && userStats.skillLevels !== null
          ? userStats.skillLevels as Record<string, number>
          : {};
          
        const rawLanguageStats = typeof userStats.languageStats === 'object' && userStats.languageStats !== null
          ? userStats.languageStats as Record<string, { completed: number; avgScore: number }>
          : {};

        // Convert to LanguageProgress format
        const languageStats: Record<string, LanguageProgress> = {};
        Object.entries(rawLanguageStats).forEach(([lang, stats]) => {
          languageStats[lang] = {
            completed: stats.completed,
            avgScore: stats.avgScore,
            lastPracticed: new Date(), // Will be updated with actual data later
            skillBreakdown: {} // Will be populated with actual skill breakdown
          };
        });

        const metrics: LearningMetrics = {
          totalChallengesCompleted: userStats.completedChallenges || 0,
          averageDifficulty: userStats.averageDifficulty || 0,
          totalPracticeMinutes: userStats.totalPracticeTime || 0,
          currentStreak: userStats.currentStreak || 0,
          weeklyProgress: userStats.weeklyProgress || 0,
          weeklyGoal: userStats.weeklyGoal || 5,
          skillLevels,
          languageStats,
          recentAchievements: [] // Will be populated later
        };
        setMetrics(metrics);
      }
    } catch (error) {
      console.error('Failed to load learning metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyStats = (progressData: any[]): WeeklyStats => {
    const stats: WeeklyStats = {
      challengesCompleted: 0,
      practiceMinutes: 0,
      skillsImproved: 0,
      streakDays: 0,
      mostPracticedLanguage: '',
      mostImprovedSkill: ''
    };

    const languageCounts: Record<string, number> = {};
    const skillImprovements: Record<string, number> = {};
    const activeDays = new Set<string>();

    progressData.forEach(record => {
      stats.challengesCompleted += record.challengesCompleted || 0;
      stats.practiceMinutes += record.practiceMinutes || 0;
      
      if (record.challengesCompleted > 0) {
        activeDays.add(record.date);
      }

      // Track skill improvements
      if (record.skillsImproved) {
        Object.entries(record.skillsImproved).forEach(([skill, improvement]) => {
          skillImprovements[skill] = (skillImprovements[skill] || 0) + (improvement as number);
        });
      }
    });

    stats.streakDays = activeDays.size;
    stats.skillsImproved = Object.keys(skillImprovements).length;
    
    // Find most improved skill
    if (Object.keys(skillImprovements).length > 0) {
      stats.mostImprovedSkill = Object.entries(skillImprovements)
        .sort(([, a], [, b]) => b - a)[0][0];
    }

    return stats;
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getSkillColor = (level: number): string => {
    if (level >= 80) return '#4CAF50';
    if (level >= 60) return '#2196F3';
    if (level >= 40) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return <div className={styles.loading}>Loading learning stats...</div>;
  }

  if (!metrics) {
    return <div className={styles.noData}>No learning data available</div>;
  }

  return (
    <div className={styles.learningStats}>
      {/* Overview Cards */}
      <div className={styles.overviewGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <h3>Challenges Completed</h3>
            <div className={styles.statValue}>{metrics.totalChallengesCompleted}</div>
            <div className={styles.statLabel}>All Time</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏱️</div>
          <div className={styles.statContent}>
            <h3>Practice Time</h3>
            <div className={styles.statValue}>
              {formatTime(metrics.totalPracticeMinutes)}
            </div>
            <div className={styles.statLabel}>Total</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statContent}>
            <h3>Current Streak</h3>
            <div className={styles.statValue}>{metrics.currentStreak}</div>
            <div className={styles.statLabel}>Days</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📈</div>
          <div className={styles.statContent}>
            <h3>Weekly Progress</h3>
            <div className={styles.statValue}>
              {metrics.weeklyProgress}/{metrics.weeklyGoal}
            </div>
            <div className={styles.statLabel}>Challenges</div>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      {weeklyStats && (
        <div className={styles.weeklySection}>
          <h2>This Week's Progress</h2>
          <div className={styles.weeklyGrid}>
            <div className={styles.weeklyItem}>
              <span className={styles.weeklyLabel}>Challenges:</span>
              <span className={styles.weeklyValue}>{weeklyStats.challengesCompleted}</span>
            </div>
            <div className={styles.weeklyItem}>
              <span className={styles.weeklyLabel}>Practice Time:</span>
              <span className={styles.weeklyValue}>
                {formatTime(weeklyStats.practiceMinutes)}
              </span>
            </div>
            <div className={styles.weeklyItem}>
              <span className={styles.weeklyLabel}>Skills Improved:</span>
              <span className={styles.weeklyValue}>{weeklyStats.skillsImproved}</span>
            </div>
            <div className={styles.weeklyItem}>
              <span className={styles.weeklyLabel}>Active Days:</span>
              <span className={styles.weeklyValue}>{weeklyStats.streakDays}/7</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Skills */}
      <div className={styles.skillsSection}>
        <h2>Your Top Skills</h2>
        <div className={styles.skillsList}>
          {topSkills.map((skill, index) => (
            <div key={skill.skill} className={styles.skillItem}>
              <div className={styles.skillRank}>#{index + 1}</div>
              <div className={styles.skillInfo}>
                <div className={styles.skillName}>{skill.skill}</div>
                <div className={styles.skillProgress}>
                  <div
                    className={styles.skillProgressBar}
                    style={{
                      width: `${skill.level}%`,
                      backgroundColor: getSkillColor(skill.level)
                    }}
                  />
                </div>
              </div>
              <div className={styles.skillLevel}>
                {skill.level}
                <span className={styles.skillTrend}>
                  {skill.trend === 'improving' && '↑'}
                  {skill.trend === 'declining' && '↓'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language Distribution */}
      {Object.keys(metrics.languageStats).length > 0 && (
        <div className={styles.languageSection}>
          <h2>Language Practice</h2>
          <div className={styles.languageGrid}>
            {Object.entries(metrics.languageStats).map(([language, stats]) => {
              const typedStats = stats as { completed: number; avgScore: number };
              return (
                <div key={language} className={styles.languageCard}>
                  <div className={styles.languageName}>{language}</div>
                  <div className={styles.languageStats}>
                    <div>{typedStats.completed} challenges</div>
                    <div>{Math.round(typedStats.avgScore)}% avg</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 