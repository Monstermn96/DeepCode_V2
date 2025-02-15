import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './WelcomeControlPanel.module.css';

interface WelcomeControlPanelProps {
  onGenerateNew?: (topic: string, languages: string[]) => Promise<void>;
  isLoading?: boolean;
}

const WelcomeControlPanel: React.FC<WelcomeControlPanelProps> = ({ onGenerateNew, isLoading = false }) => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['JavaScript']);
  const { loading = isLoading, error, generateChallenge } = useAI();
  const { isAuthenticated } = useAuth();

  const handleLanguageToggle = (language: string) => {
    if (!isAuthenticated) return;
    setSelectedLanguages(prev => 
      prev.includes(language) 
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!topic.trim()) {
      return;
    }

    try {
      if (onGenerateNew) {
        await onGenerateNew(topic.trim(), selectedLanguages);
      } else {
        await generateChallenge(topic.trim(), selectedLanguages);
      }
    } catch (err) {
      console.error('Failed to generate challenge:', err);
    }
  };

  return (
    <div className={styles.controlPanel}>
      <h2 className={styles.title}>Generate New Challenge</h2>
      
      <div className={styles.inputGroup}>
        <label className={styles.label}>Challenge Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g., Binary Search Trees)"
          className={styles.input}
          disabled={!isAuthenticated}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Programming Languages</label>
        <div className={styles.languagesGrid}>
          {['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'].map(language => (
            <button
              key={language}
              onClick={() => handleLanguageToggle(language)}
              className={`${styles.languageButton} ${selectedLanguages.includes(language) ? styles.selected : ''}`}
              disabled={!isAuthenticated}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isAuthenticated ? (loading || !topic.trim()) : false}
        className={styles.submitButton}
      >
        {loading ? (
          <>
            <span className={styles.spinner}>⚪</span>
            Generating...
          </>
        ) : !isAuthenticated ? (
          'Login to DeepCode'
        ) : (
          'Generate Challenge →'
        )}
      </button>
    </div>
  );
};

export default WelcomeControlPanel; 