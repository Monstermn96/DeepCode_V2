import { useState } from 'react';
import styles from './WelcomeControlPanel.module.css';

const SUPPORTED_LANGUAGES = ['C#', 'Java', 'Python'];

interface WelcomeControlPanelProps {
  onGenerateNew: (description: string, languages: string[]) => void;
  isLoading: boolean;
}

export default function WelcomeControlPanel({ onGenerateNew, isLoading }: WelcomeControlPanelProps) {
  const [description, setDescription] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && selectedLanguages.length > 0) {
      onGenerateNew(description, selectedLanguages);
    }
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(lang => lang !== language)
        : [...prev, language]
    );
  };

  return (
    <div className={styles.panel}>
      <h2>Generate New Challenge</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="description">Describe Your Challenge</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: A easy logic problem involving strings or A really challenging security problem"
            className={styles.textarea}
            required
          />
        </div>
        
        <div className={styles.languageSelection}>
          <label>Select Languages</label>
          <div className={styles.languageButtons}>
            {SUPPORTED_LANGUAGES.map(language => (
              <button
                key={language}
                type="button"
                className={`${styles.languageButton} ${
                  selectedLanguages.includes(language) ? styles.selected : ''
                }`}
                onClick={() => toggleLanguage(language)}
              >
                {language}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className={styles.generateButton}
          disabled={isLoading || !description.trim() || selectedLanguages.length === 0}
        >
          {isLoading ? 'Generating...' : 'Generate Challenge'}
        </button>
      </form>
    </div>
  );
} 