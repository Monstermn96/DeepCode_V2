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

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { generateChallenge } = useAI();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGetStarted = async () => {
    try {
      await generateChallenge({
        type: 'challenge',
        description: 'A beginner-friendly coding challenge',
        languages: ['Python'] // Default to Python for the welcome challenge
      });
      navigate('/challenges');
    } catch (error) {
      console.error('Failed to generate welcome challenge:', error);
    }
  };

  return (
    <div className={styles.welcome}>
      <h1>Welcome to Problem Giver</h1>
      <p>Your personal AI-powered coding challenge platform</p>
      <button onClick={handleGetStarted} className={styles.getStartedButton}>
        Get Started
      </button>
    </div>
  );
} 