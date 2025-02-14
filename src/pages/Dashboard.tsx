import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';
import WelcomeControlPanel from '../components/WelcomeControlPanel';
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

  const handleGenerateNew = async (topic: string, languages: string[]) => {
    try {
      await generateChallenge(topic, languages);
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
            Track your progress and generate new coding challenges to enhance your skills
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
          <h2>Generate New Challenge</h2>
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