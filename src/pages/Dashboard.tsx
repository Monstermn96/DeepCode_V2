import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';
import WelcomeControlPanel from '../components/WelcomeControlPanel';
import { type SupportedLanguage } from '../services/ai/openai';
import styles from './Dashboard.module.css';

interface ChallengeStats {
  completed: number;
  inProgress: number;
  totalPoints: number;
}

// Placeholder stats - in a real app, these would come from a backend
const initialStats: ChallengeStats = {
  completed: 0,
  inProgress: 0,
  totalPoints: 0
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { generateChallenge, loading, error } = useAI();
  const [stats] = useState<ChallengeStats>(initialStats);

  useEffect(() => {
    if (user) {
      // TODO: Fetch user's challenge stats from backend
      console.log('Current user:', user);
    }
  }, [user]);

  const handleGenerateNew = async (description: string, languages: SupportedLanguage[]) => {
    try {
      await generateChallenge({
        type: 'challenge',
        topic: description,
        languages
      });
      navigate('/challenges');
    } catch (err) {
      console.error('Failed to generate challenge:', err);
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome Back{user?.username ? `, ${user.username}` : ''}!</h1>
          <p className={styles.subtitle}>
            Describe the coding challenge you want to tackle and select your preferred programming languages
          </p>
        </header>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.completed}</span>
            <span className={styles.statLabel}>Completed Challenges</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.inProgress}</span>
            <span className={styles.statLabel}>In Progress</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalPoints}</span>
            <span className={styles.statLabel}>Total Points</span>
          </div>
        </div>

        <section className={styles.generateSection}>
          <WelcomeControlPanel
            onGenerateNew={handleGenerateNew}
            isLoading={loading}
          />
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
} 