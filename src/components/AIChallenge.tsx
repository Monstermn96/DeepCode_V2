import { useAI } from '../contexts/AIContext';
import { ChallengeView } from './ChallengeView';
import styles from './AIChallenge.module.css';

export function AIChallenge() {
  const { currentChallenge, loading, error } = useAI();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Generating your challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!currentChallenge) {
    return (
      <div className={styles.empty}>
        <h2>No Challenge Generated</h2>
        <p>Return to the dashboard to generate a new challenge.</p>
      </div>
    );
  }

  return <ChallengeView />;
} 