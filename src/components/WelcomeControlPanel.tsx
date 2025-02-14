import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './WelcomeControlPanel.module.css';

interface WelcomeControlPanelProps {
  onGenerateNew: (topic: string, languages: string[]) => void;
  isLoading?: boolean;
}

const AVAILABLE_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'Go',
  'Rust'
];

export default function WelcomeControlPanel({ onGenerateNew, isLoading = false }: WelcomeControlPanelProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [topic, setTopic] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (topic.trim() && selectedLanguages.length > 0) {
      onGenerateNew(topic.trim(), selectedLanguages);
    }
  };

  // Determine if the button should be disabled based on authentication state
  const isButtonDisabled = isLoading || 
    (isAuthenticated && (!topic.trim() || selectedLanguages.length === 0));

  return (
    <div className={styles.controlPanel}>
      <form onSubmit={handleSubmit}>
        <div className={styles.preferences}>
          <div className={styles.preferenceSection}>
            <div className={styles.preferenceHeader}>
              <h3>Challenge Topic</h3>
            </div>
            <div className={styles.preferenceContent}>
              <textarea
                className={styles.textarea}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe the coding challenge you'd like to generate..."
                required={isAuthenticated}
              />
            </div>
          </div>

          <div className={styles.preferenceSection}>
            <div className={styles.preferenceHeader}>
              <h3>Programming Languages</h3>
            </div>
            <div className={styles.preferenceContent}>
              <div className={styles.checkboxGroup}>
                {AVAILABLE_LANGUAGES.map(language => (
                  <label key={language} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(language)}
                      onChange={() => handleLanguageToggle(language)}
                    />
                    {language}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            className={styles.button}
            disabled={isButtonDisabled}
          >
            {isLoading ? (
              <>
                <div className={styles.loadingSpinner} />
                Generating...
              </>
            ) : !isAuthenticated ? (
              <>
                Login to DeepCode
                <span className={styles.buttonArrow}>→</span>
              </>
            ) : (
              <>
                Generate Challenge
                <span className={styles.buttonArrow}>→</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 