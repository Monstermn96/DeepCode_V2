import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../contexts/AIContext';
import styles from './WelcomeScreen.module.css';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { generateChallenge } = useAI();

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