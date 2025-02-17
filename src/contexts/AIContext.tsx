import { createContext, useContext, useState } from 'react';
import { post, type RestApiResponse } from '@aws-amplify/api-rest';

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

interface APIResponse {
  data: Challenge;
  metadata: {
    type: string;
    model: string;
    duration_ms: number;
    languages: string[];
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      estimated_cost: number;
    };
  };
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
      console.log('Generating challenge with params:', params);

      const response = await post<RestApiResponse>({
        apiName: 'ai',
        path: '/ai',
        options: {
          body: params,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      });

      console.log('Raw API response:', response);

      if (!response) {
        console.error('No response received from API');
        throw new Error('No response received from AI service');
      }

      const apiResponse = response.body as APIResponse;
      
      if (!apiResponse.data) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from AI service');
      }
      
      console.log('Setting challenge with data:', apiResponse.data);
      setCurrentChallenge(apiResponse.data);
    } catch (err) {
      console.error('Detailed error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        params: params
      });
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while generating the challenge';
      setError(errorMessage);
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