import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { post } from '@aws-amplify/api-rest';

interface ApiResponse {
  data: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    starterCode: string;
    solution: string;
    testCases: Array<{
      input: string;
      expectedOutput: string;
      description: string;
    }>;
    hints: string[];
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Types
interface AIContextType {
  loading: boolean;
  error: string | null;
  generateChallenge: (topic: string, languages?: string[]) => Promise<void>;
  currentChallenge: ApiResponse['data'] | null;
}

// Create context with a default value
const AIContext = createContext<AIContextType | undefined>(undefined);

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<ApiResponse['data'] | null>(null);

  const generateChallenge = useCallback(async (topic: string, languages: string[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const { accessToken } = (await fetchAuthSession()).tokens ?? {};
      
      const { body } = await post({
        apiName: 'ai',
        path: '/',
        options: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: {
            type: 'challenge',
            topic,
            languages,
          }
        }
      }).response;

      const jsonResponse = await body.json();
      const response = jsonResponse as unknown as ApiResponse;
      setCurrentChallenge(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the challenge');
      console.error('Error generating challenge:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    loading,
    error,
    generateChallenge,
    currentChallenge,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// Hook
export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

// Export both the provider and hook as properties of a single default export
const AI = {
  Provider: AIProvider,
  useAI
};

export default AI; 