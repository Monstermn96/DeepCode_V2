import React from 'react';
import { LearningPath } from '../types/learning';
import styles from './LearningPathCard.module.css';

interface LearningPathCardProps {
  path: LearningPath;
  onSelect?: () => void;
  onViewDetails?: () => void;
  isRecommended?: boolean;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onSelect,
  onViewDetails,
  isRecommended = false
}) => {
  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner':
        return '#4CAF50';
      case 'intermediate':
        return '#FF9800';
      case 'advanced':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return '#4CAF50';
    if (progress >= 60) return '#8BC34A';
    if (progress >= 40) return '#FFC107';
    if (progress >= 20) return '#FF9800';
    return '#F44336';
  };

  const completedMilestones = path.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = path.milestones.length;

  return (
    <div className={`${styles.pathCard} ${isRecommended ? styles.recommended : ''}`}>
      {isRecommended && (
        <div className={styles.recommendedBadge}>Recommended</div>
      )}
      
      <div className={styles.pathHeader}>
        <h3 className={styles.pathName}>{path.name}</h3>
        <span 
          className={styles.difficulty}
          style={{ color: getDifficultyColor(path.difficulty) }}
        >
          {path.difficulty}
        </span>
      </div>

      <p className={styles.description}>{path.description}</p>

      {/* Target Skills */}
      <div className={styles.skillsSection}>
        <div className={styles.skillsLabel}>Skills to Learn:</div>
        <div className={styles.skillTags}>
          {path.targetSkills.slice(0, 4).map(skill => (
            <span key={skill} className={styles.skillTag}>
              {skill}
            </span>
          ))}
          {path.targetSkills.length > 4 && (
            <span className={styles.moreSkills}>
              +{path.targetSkills.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Languages */}
      {path.languages.length > 0 && (
        <div className={styles.languagesSection}>
          <div className={styles.languagesLabel}>Languages:</div>
          <div className={styles.languages}>
            {path.languages.map(lang => (
              <span key={lang} className={styles.language}>
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Progress (only for active paths) */}
      {path.isActive && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span>Progress</span>
            <span className={styles.progressPercent}>{path.progress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${path.progress}%`,
                backgroundColor: getProgressColor(path.progress)
              }}
            />
          </div>
          <div className={styles.milestonesInfo}>
            {completedMilestones}/{totalMilestones} milestones completed
          </div>
        </div>
      )}

      {/* Milestones Preview */}
      <div className={styles.milestonesPreview}>
        <div className={styles.milestonesLabel}>Milestones:</div>
        <ul className={styles.milestonesList}>
          {path.milestones.slice(0, 3).map((milestone, index) => (
            <li 
              key={milestone.id || index} 
              className={`${styles.milestone} ${milestone.isCompleted ? styles.completed : ''}`}
            >
              <span className={styles.milestoneIcon}>
                {milestone.isCompleted ? '✓' : '○'}
              </span>
              <span className={styles.milestoneName}>{milestone.name}</span>
            </li>
          ))}
          {path.milestones.length > 3 && (
            <li className={styles.moreMilestones}>
              And {path.milestones.length - 3} more...
            </li>
          )}
        </ul>
      </div>

      {/* Duration */}
      <div className={styles.duration}>
        <span className={styles.durationIcon}>📅</span>
        <span>Estimated duration: {path.estimatedDuration} days</span>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {!path.isActive && onSelect && (
          <button 
            className={styles.selectButton}
            onClick={onSelect}
          >
            Start Learning Path
          </button>
        )}
        {onViewDetails && (
          <button 
            className={styles.detailsButton}
            onClick={onViewDetails}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}; 