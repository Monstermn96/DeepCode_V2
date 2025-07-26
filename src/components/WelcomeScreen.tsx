import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../contexts/AIContext';
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

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { generateChallenge } = useAI();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      // Redirecting authenticated user
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGetStarted = async () => {
    if (!isAuthenticated) {
      // Redirecting to login
      navigate('/login');
      return;
    }

    try {
      console.log('Starting challenge generation process');
      setIsLoading(true);
      setError(null);

      console.log('Calling AI service with parameters:', {
        type: 'challenge',
        topic: 'A beginner-friendly coding challenge',
        languages: ['Python']
      });

      await generateChallenge({
        type: 'challenge',
        topic: 'A beginner-friendly coding challenge',
        languages: ['Python']
      });

      // Navigate to the challenges page
      navigate('/challenges');
    } catch (error) {
      console.error('Challenge generation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate challenge');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.welcomeScreen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome to DeepDevAi</h1>
        <p className={styles.subtitle}>
          Enhance your coding skills with AI-generated challenges tailored to your interests.
          {!isAuthenticated && ' Sign in to get started!'}
        </p>
      </header>

      <div className={styles.buttonContainer}>
        <button 
          onClick={handleGetStarted} 
          className={styles.button}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className={styles.loadingSpinner} />
              Generating Challenge...
            </>
          ) : (
            <>
              Get Started
              <span className={styles.buttonArrow}>→</span>
            </>
          )}
        </button>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
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