import React from 'react';
import { SkillAssessment } from '../types/learning';
import styles from './SkillProgressChart.module.css';

interface SkillProgressChartProps {
  skills: SkillAssessment[];
  title?: string;
  showTrends?: boolean;
}

export const SkillProgressChart: React.FC<SkillProgressChartProps> = ({
  skills,
  title = 'Skill Progress',
  showTrends = true
}) => {
  // Group skills by category for better visualization
  const skillCategories = {
    'Data Structures': ['arrays', 'linked-lists', 'trees', 'graphs', 'hash-tables', 'stacks', 'queues'],
    'Algorithms': ['sorting', 'searching', 'recursion', 'dynamic-programming', 'greedy', 'backtracking'],
    'Programming Concepts': ['loops', 'conditionals', 'functions', 'OOP', 'error-handling', 'async-programming'],
    'Problem Solving': ['pattern-recognition', 'optimization', 'debugging', 'edge-cases', 'complexity-analysis']
  };

  const categorizedSkills = Object.entries(skillCategories).map(([category, categorySkills]) => ({
    category,
    skills: skills.filter(skill => categorySkills.includes(skill.skill))
  })).filter(cat => cat.skills.length > 0);

  const getSkillColor = (level: number): string => {
    if (level >= 80) return '#4CAF50';
    if (level >= 60) return '#2196F3';
    if (level >= 40) return '#FF9800';
    if (level >= 20) return '#FFC107';
    return '#F44336';
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining'): string => {
    switch (trend) {
      case 'improving': return '↑';
      case 'declining': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining'): string => {
    switch (trend) {
      case 'improving': return '#4CAF50';
      case 'declining': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (skills.length === 0) {
    return (
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className={styles.emptyState}>
          <p>No skill data available yet.</p>
          <span>Complete some challenges to see your progress!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      
      {/* Overall Stats */}
      <div className={styles.overallStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Average Level</span>
          <span className={styles.statValue}>
            {Math.round(skills.reduce((sum, s) => sum + s.level, 0) / skills.length)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Skills Tracked</span>
          <span className={styles.statValue}>{skills.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Top Skill</span>
          <span className={styles.statValue}>
            {skills.sort((a, b) => b.level - a.level)[0]?.skill || 'N/A'}
          </span>
        </div>
      </div>

      {/* Categorized Skills */}
      {categorizedSkills.map(({ category, skills: categorySkills }) => (
        <div key={category} className={styles.categorySection}>
          <h4 className={styles.categoryTitle}>{category}</h4>
          <div className={styles.skillBars}>
            {categorySkills.map(skill => (
              <div key={skill.skill} className={styles.skillRow}>
                <div className={styles.skillInfo}>
                  <span className={styles.skillName}>{skill.skill}</span>
                  {showTrends && (
                    <span 
                      className={styles.trend}
                      style={{ color: getTrendColor(skill.trend) }}
                    >
                      {getTrendIcon(skill.trend)}
                    </span>
                  )}
                </div>
                <div className={styles.progressWrapper}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${skill.level}%`,
                        backgroundColor: getSkillColor(skill.level)
                      }}
                    />
                  </div>
                  <span className={styles.levelText}>{skill.level}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Recommendations */}
      {skills.some(s => s.recommendedTopics.length > 0) && (
        <div className={styles.recommendations}>
          <h4>Recommended Focus Areas</h4>
          <div className={styles.recommendationList}>
            {skills
              .filter(s => s.recommendedTopics.length > 0)
              .slice(0, 3)
              .map(skill => (
                <div key={skill.skill} className={styles.recommendationItem}>
                  <span className={styles.recommendationSkill}>{skill.skill}:</span>
                  <span className={styles.recommendationTopics}>
                    {skill.recommendedTopics.slice(0, 2).join(', ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#4CAF50' }} />
          <span>Expert (80-100)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#2196F3' }} />
          <span>Proficient (60-79)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#FF9800' }} />
          <span>Intermediate (40-59)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#FFC107' }} />
          <span>Beginner (20-39)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#F44336' }} />
          <span>Novice (0-19)</span>
        </div>
      </div>
    </div>
  );
}; 