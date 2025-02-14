import React, { useState } from 'react';
import { useAI } from '../contexts/AIContext';

interface WelcomeControlPanelProps {
  onGenerateNew?: (topic: string, languages: string[]) => Promise<void>;
  isLoading?: boolean;
}

const WelcomeControlPanel: React.FC<WelcomeControlPanelProps> = ({ onGenerateNew, isLoading = false }) => {
  const [topic, setTopic] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['JavaScript']);
  const { loading = isLoading, error, generateChallenge } = useAI();

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) 
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleSubmit = async () => {
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
    <div className="flex flex-col gap-8 p-8 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold text-indigo-400">Generate New Challenge</h2>
      
      <div className="flex flex-col gap-4">
        <label className="text-gray-300">Challenge Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g., Binary Search Trees)"
          className="p-2 bg-gray-700 rounded border border-gray-600 text-white"
        />
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-gray-300">Programming Languages</label>
        <div className="flex flex-wrap gap-2">
          {['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'].map(language => (
            <button
              key={language}
              onClick={() => handleLanguageToggle(language)}
              className={`px-4 py-2 rounded ${
                selectedLanguages.includes(language)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !topic.trim()}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded bg-indigo-600 text-white font-semibold ${
          loading || !topic.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
        }`}
      >
        {loading ? (
          <>
            <span className="animate-spin">⚪</span>
            Generating...
          </>
        ) : (
          <>
            Generate Challenge →
          </>
        )}
      </button>
    </div>
  );
};

export default WelcomeControlPanel; 