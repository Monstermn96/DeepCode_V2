import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Profile.module.css';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className={styles.profile}>
      <h1>Profile</h1>
      <div className={styles.content}>
        <div className={styles.card}>
          <h2>User Information</h2>
          <div className={styles.info}>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Username:</strong> {user?.username}
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Statistics</h2>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.value}>0</span>
              <span className={styles.label}>Completed Challenges</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.value}>0</span>
              <span className={styles.label}>Total Points</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 