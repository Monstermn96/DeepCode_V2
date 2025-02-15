import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../contexts/AIContext';
import WelcomeControlPanel from './WelcomeControlPanel';
import styles from './WelcomeScreen.module.css';

const FEATURES = [
  {
    icon: '🎯',
    title: 'Personalized Challenges',
    description: 'Generate coding challenges tailored to your interests and skill level.'
  },
  {
    icon: '🌐',
    title: 'Multiple Languages',
    description: 'Practice in your preferred programming languages with solutions in multiple formats.'
  },
  {
    icon: '📊',
    title: 'Track Progress',
    description: 'Monitor your improvement over time with detailed performance analytics.'
  },
  {
    icon: '🤖',
    title: 'AI-Powered',
    description: 'Leverage advanced AI to create unique and engaging coding problems.'
  }
];

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { generateChallenge } = useAI();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGenerateNew = async (topic: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      setIsLoading(true);
      await generateChallenge(topic);
      navigate('/challenges');
    } catch (error) {
      console.error('Failed to generate challenge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.welcomeScreen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome to DeepCode</h1>
        <p className={styles.subtitle}>
          Enhance your coding skills with AI-generated challenges tailored to your interests.
          {!isAuthenticated && ' Sign in to get started!'}
        </p>
      </header>

      <div className={styles.controlPanel}>
        <WelcomeControlPanel
          onGenerateNew={handleGenerateNew}
          isLoading={isLoading}
        />
      </div>

      <div className={styles.features}>
        {FEATURES.map((feature, index) => (
          <div key={index} className={styles.feature}>
            <div className={styles.icon}>{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 