import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './WelcomeControlPanel.module.css';

interface WelcomeControlPanelProps {
  onGenerateNew: (topic: string, languages: string[]) => void;
  isLoading: boolean;
}

export default function WelcomeControlPanel({ onGenerateNew, isLoading }: WelcomeControlPanelProps) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const { loading = isLoading, error, generateChallenge } = useAI();
  const { isAuthenticated } = useAuth();

  const languages = [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C++',
    'Go',
    'Rust'
  ];

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
        onGenerateNew(topic.trim(), selectedLanguages);
      } else {
        await generateChallenge(topic.trim(), selectedLanguages);
      }
    } catch (err) {
      console.error('Failed to generate challenge:', err);
    }
  };

  return (
    <div className={styles.controlPanel}>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a topic (e.g., Binary Search Trees)"
        className={styles.topicInput}
        disabled={!isAuthenticated}
      />

      <div className={styles.languageSection}>
        <h3>Programming Languages</h3>
        <div className={styles.languageGrid}>
          {languages.map(language => (
            <button
              key={language}
              onClick={() => handleLanguageToggle(language)}
              className={`${styles.languageButton} ${
                selectedLanguages.includes(language) ? styles.active : ''
              }`}
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
        disabled={isAuthenticated ? (loading || !topic.trim() || selectedLanguages.length === 0) : false}
        className={styles.generateButton}
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
} 