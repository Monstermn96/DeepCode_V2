import React, { useState } from 'react';
import { useAI } from '../contexts/AIContext';
import styles from './AIChallenge.module.css';

export function AIChallenge() {
  const [topic, setTopic] = useState('');
  const { loading, error, lastResponse, generateChallenge, clearError } = useAI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      await generateChallenge(topic);
    }
  };

  return (
    <div className={styles.aiChallenge}>
      <h2>Generate Coding Challenge</h2>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="topic" className={styles.label}>Challenge Topic:</label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Arrays, Recursion, Binary Trees"
            disabled={loading}
            className={styles.input}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !topic.trim()}
          className={styles.button}
        >
          {loading ? 'Generating...' : 'Generate Challenge'}
        </button>
      </form>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={clearError} className={styles.button}>Dismiss</button>
        </div>
      )}

      {lastResponse && (
        <div className={styles.challengeResponse}>
          <pre className={styles.pre}>{lastResponse.data.description}</pre>
          <div className={styles.usageStats}>
            Tokens used: {lastResponse.usage.total_tokens}
          </div>
        </div>
      )}
    </div>
  );
} 