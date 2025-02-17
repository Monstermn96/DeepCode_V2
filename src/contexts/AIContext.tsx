import { createContext, useContext, useState } from 'react';

interface Challenge {
  title: string;
  description: string;
  difficulty: string;
  language: string;
  starterCode: string;
  solution: string;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    description: string;
  }>;
  hints: string[];
}

interface GenerateChallengeParams {
  type: 'challenge';
  description: string;
  languages: string[];
}

interface AIContextType {
  currentChallenge: Challenge | null;
  loading: boolean;
  error: string | null;
  generateChallenge: (params: GenerateChallengeParams) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChallenge = async (params: GenerateChallengeParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const data = await response.json();
      setCurrentChallenge(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIContext.Provider
      value={{
        currentChallenge,
        loading,
        error,
        generateChallenge,
      }}
    >
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