import React, { createContext, useContext, useState, useMemo } from 'react';
import { aiService } from '../services/ai/openai';

// Types
interface AIContextValue {
  loading: boolean;
  error: string | null;
  lastResponse: any | null;
  generateChallenge: (topic: string, languages?: string[]) => Promise<void>;
  clearError: () => void;
}

// Create context with a default value
const AIContext = createContext<AIContextValue | undefined>(undefined);

// Provider Component
const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<any | null>(null);

  const clearError = () => setError(null);

  const generateChallenge = async (topic: string, languages: string[] = []): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.generateChallenge(topic, languages);
      setLastResponse(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Memoize the context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    loading,
    error,
    lastResponse,
    generateChallenge,
    clearError
  }), [loading, error, lastResponse]);

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};

// Hook
const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

// Export both the provider and hook as properties of a single default export
const AI = {
  Provider: AIProvider,
  useAI
};

export default AI; 