import React, { useState } from 'react';
import { useAI } from '../contexts/AIContext';
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

  return (
    <div className={styles.challenge}>
      <header className={styles.header}>
        <h1 className={styles.title}>{currentChallenge.title}</h1>
        <div className={styles.meta}>
          <span className={`${styles.badge} ${styles[currentChallenge.difficulty]}`}>
            {currentChallenge.difficulty}
          </span>
          <span className={styles.badge}>{currentChallenge.language}</span>
        </div>
      </header>

      <section className={styles.description}>
        <h2>Problem Description</h2>
        <p>{currentChallenge.description}</p>
      </section>

      <section className={styles.codeSection}>
        <h2>Your Solution</h2>
        <div className={styles.codeEditor}>
          <pre className={styles.code}>
            <code>{currentChallenge.starterCode}</code>
          </pre>
        </div>
      </section>

      <section className={styles.testCases}>
        <h2>Test Cases</h2>
        <div className={styles.testList}>
          {currentChallenge.testCases.map((test, index) => (
            <div key={index} className={styles.testCase}>
              <h3>Test {index + 1}</h3>
              <p>{test.description}</p>
              <div className={styles.testDetails}>
                <div>
                  <strong>Input:</strong>
                  <code>{test.input}</code>
                </div>
                <div>
                  <strong>Expected Output:</strong>
                  <code>{test.expectedOutput}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.hints}>
        <h2>Hints</h2>
        <ul>
          {currentChallenge.hints.map((hint, index) => (
            <li key={index}>{hint}</li>
          ))}
        </ul>
      </section>
    </div>
  );
} 