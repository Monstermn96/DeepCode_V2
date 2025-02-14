import React from 'react';
import { AIChallenge } from '../components/AIChallenge';
import styles from './Challenges.module.css';

export default function Challenges() {
  return (
    <div className={styles.challenges}>
      <h1>Coding Challenges</h1>
      <div className={styles.content}>
        <AIChallenge />
      </div>
    </div>
  );
} 