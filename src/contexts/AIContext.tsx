import React, { createContext, useContext, useState } from 'react';
import { post } from '@aws-amplify/api';

interface AIResponse {
  success: boolean;
  error?: string;
  data?: {
    challenge: string;
    difficulty: string;
    hints: string[];
  };
}

interface AIContextType {
  loading: boolean;
  error: string | null;
  generateChallenge: (topic: string) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChallenge = async (topic: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const rawResponse = await post({
        apiName: 'ai',
        path: '/ai',
        options: {
          body: {
            topic,
          },
        },
      });

      // Type assertion after validating the shape
      const response = rawResponse as unknown as AIResponse;
      if (!('success' in response)) {
        throw new Error('Invalid response format');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate challenge');
      }

      if (!response.data) {
        throw new Error('No challenge data received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIContext.Provider value={{ loading, error, generateChallenge }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
} 