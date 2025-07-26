import React, { useState, useEffect } from 'react';
import { LearningPath } from '../types/learning';
import { learningPathService } from '../services/learning/learningPathService';
import { LearningPathCard } from './LearningPathCard';
import styles from './LearningPathManager.module.css';

interface LearningPathManagerProps {
  userId: string;
}

export const LearningPathManager: React.FC<LearningPathManagerProps> = ({ userId }) => {
  const [activePaths, setActivePaths] = useState<LearningPath[]>([]);
  const [recommendedPaths, setRecommendedPaths] = useState<LearningPath[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state for creating custom path
  const [customPath, setCustomPath] = useState({
    name: '',
    description: '',
    targetSkills: [] as string[],
    languages: [] as string[],
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    estimatedDuration: 30
  });

  useEffect(() => {
    loadLearningPaths();
  }, [userId]);

  const loadLearningPaths = async () => {
    try {
      setLoading(true);
      
      // Get user's active paths
      const paths = await learningPathService.getUserLearningPaths(userId);
      setActivePaths(paths);
      
      // Get recommended paths
      const recommendations = await learningPathService.recommendLearningPaths(userId);
      setRecommendedPaths(recommendations);
    } catch (error) {
      console.error('Failed to load learning paths:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPath = async (templateId: string) => {
    try {
      const path = await learningPathService.createFromTemplate(
        userId,
        templateId as any,
        ['Python'] // Default language, could be customized
      );
      
      // Refresh paths
      await loadLearningPaths();
      
      // TODO: Navigate to challenge generation with this path
      console.log('Started learning path:', path);
    } catch (error) {
      console.error('Failed to start learning path:', error);
    }
  };

  const handleCreateCustomPath = async () => {
    try {
      if (!customPath.name || customPath.targetSkills.length === 0) {
        alert('Please provide a name and at least one target skill');
        return;
      }

      const path = await learningPathService.createLearningPath(userId, {
        ...customPath,
        milestones: customPath.targetSkills.map((skill, index) => ({
          id: `milestone-${index}`,
          name: `Master ${skill}`,
          description: `Complete challenges focusing on ${skill}`,
          requiredChallenges: 5,
          completedChallenges: 0,
          isCompleted: false
        }))
      });

      // Reset form and refresh
      setCustomPath({
        name: '',
        description: '',
        targetSkills: [],
        languages: [],
        difficulty: 'intermediate',
        estimatedDuration: 30
      });
      setIsCreating(false);
      await loadLearningPaths();
      
      console.log('Created custom path:', path);
    } catch (error) {
      console.error('Failed to create custom path:', error);
    }
  };

  const availableSkills = [
    'arrays', 'loops', 'conditionals', 'functions', 'recursion',
    'sorting', 'searching', 'trees', 'graphs', 'dynamic-programming',
    'OOP', 'error-handling', 'async-programming'
  ];

  const availableLanguages = ['Python', 'Java', 'C#'];

  if (loading) {
    return <div className={styles.loading}>Loading learning paths...</div>;
  }

  return (
    <div className={styles.pathManager}>
      <div className={styles.header}>
        <h2>Your Learning Journey</h2>
        {!isCreating && (
          <button 
            className={styles.createButton}
            onClick={() => setIsCreating(true)}
          >
            Create Custom Path
          </button>
        )}
      </div>

      {/* Create Custom Path Form */}
      {isCreating && (
        <div className={styles.createForm}>
          <h3>Create Custom Learning Path</h3>
          
          <div className={styles.formGroup}>
            <label>Path Name</label>
            <input
              type="text"
              value={customPath.name}
              onChange={e => setCustomPath({ ...customPath, name: e.target.value })}
              placeholder="e.g., Master Data Structures"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={customPath.description}
              onChange={e => setCustomPath({ ...customPath, description: e.target.value })}
              placeholder="Describe your learning goals..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Target Skills</label>
            <div className={styles.skillCheckboxes}>
              {availableSkills.map(skill => (
                <label key={skill} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={customPath.targetSkills.includes(skill)}
                    onChange={e => {
                      if (e.target.checked) {
                        setCustomPath({
                          ...customPath,
                          targetSkills: [...customPath.targetSkills, skill]
                        });
                      } else {
                        setCustomPath({
                          ...customPath,
                          targetSkills: customPath.targetSkills.filter(s => s !== skill)
                        });
                      }
                    }}
                  />
                  <span>{skill}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Languages</label>
            <div className={styles.languageCheckboxes}>
              {availableLanguages.map(lang => (
                <label key={lang} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={customPath.languages.includes(lang)}
                    onChange={e => {
                      if (e.target.checked) {
                        setCustomPath({
                          ...customPath,
                          languages: [...customPath.languages, lang]
                        });
                      } else {
                        setCustomPath({
                          ...customPath,
                          languages: customPath.languages.filter(l => l !== lang)
                        });
                      }
                    }}
                  />
                  <span>{lang}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Difficulty</label>
              <select
                value={customPath.difficulty}
                onChange={e => setCustomPath({
                  ...customPath,
                  difficulty: e.target.value as any
                })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Estimated Duration (days)</label>
              <input
                type="number"
                value={customPath.estimatedDuration}
                onChange={e => setCustomPath({
                  ...customPath,
                  estimatedDuration: parseInt(e.target.value) || 30
                })}
                min={7}
                max={365}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              className={styles.cancelButton}
              onClick={() => {
                setIsCreating(false);
                setCustomPath({
                  name: '',
                  description: '',
                  targetSkills: [],
                  languages: [],
                  difficulty: 'intermediate',
                  estimatedDuration: 30
                });
              }}
            >
              Cancel
            </button>
            <button 
              className={styles.saveButton}
              onClick={handleCreateCustomPath}
            >
              Create Path
            </button>
          </div>
        </div>
      )}

      {/* Active Learning Paths */}
      {activePaths.length > 0 && (
        <div className={styles.section}>
          <h3>Active Learning Paths</h3>
          <div className={styles.pathGrid}>
            {activePaths.map(path => (
              <LearningPathCard
                key={path.id}
                path={path}
                onViewDetails={() => console.log('View details:', path)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Learning Paths */}
      {recommendedPaths.length > 0 && (
        <div className={styles.section}>
          <h3>Recommended for You</h3>
          <p className={styles.sectionDescription}>
            Based on your current skills and learning history
          </p>
          <div className={styles.pathGrid}>
            {recommendedPaths.map(path => (
              <LearningPathCard
                key={path.id}
                path={path}
                isRecommended
                onSelect={() => handleStartPath(path.id)}
                onViewDetails={() => console.log('View details:', path)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activePaths.length === 0 && recommendedPaths.length === 0 && !isCreating && (
        <div className={styles.emptyState}>
          <h3>Start Your Learning Journey</h3>
          <p>Create a custom learning path or choose from our recommendations.</p>
          <button 
            className={styles.getStartedButton}
            onClick={() => setIsCreating(true)}
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}; 