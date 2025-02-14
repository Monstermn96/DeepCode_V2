import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';

interface AuthPayload {
  event: string;
  data?: any;
}

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }: { payload: AuthPayload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkUser();
          break;
        case 'signedOut':
          setUser(null);
          setIsLoading(false);
          break;
        case 'tokenRefresh':
          checkUser();
          break;
        case 'tokenRefresh_failure':
          setUser(null);
          setIsLoading(false);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [checkUser]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 