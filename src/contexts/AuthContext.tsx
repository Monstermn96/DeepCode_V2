import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, resendSignUpCode } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { log } from '../utils/logger';

interface AuthPayload {
  event: string;
  data?: any;
}

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  resendVerification: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUser = useCallback(async () => {
    try {
      log.authEvent('Checking user authentication');
      const currentUser = await getCurrentUser();
      log.authEvent('Found authenticated user', { username: currentUser.username });
      
      const userAttributes = await fetchUserAttributes();
      log.devOnly('User attributes loaded', userAttributes);
      
      // Create a user object that includes both the user and their attributes
      const userWithAttributes = {
        ...currentUser,
        username: userAttributes.nickname || userAttributes.email || currentUser.username,
        attributes: userAttributes
      };
      
      setUser(userWithAttributes);
      log.authEvent('User state updated successfully');
    } catch (error) {
      log.warn('No authenticated user found', { error: error instanceof Error ? error.message : 'Unknown error' });
      setUser(null);
    } finally {
      setIsLoading(false);
      setAuthChecked(true);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      log.authEvent('Signing out user');
      setIsLoading(true);
      await signOut();
      setUser(null);
      log.authEvent('User signed out successfully');
    } catch (error) {
      log.error('Error signing out', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResendVerification = async (username: string) => {
    try {
      log.authEvent('Resending verification code', { username });
      await resendSignUpCode({ username });
      log.authEvent('Verification code sent');
    } catch (error) {
      log.error('Error resending verification', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!authChecked) {
      checkUser();
    }

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }: { payload: AuthPayload }) => {
      log.authEvent('Auth event received', { event: payload.event });
      
      switch (payload.event) {
        case 'signedIn':
          log.authEvent('User signed in event - checking user');
          // Add a small delay to ensure Cognito session is fully established
          setTimeout(() => {
            checkUser();
          }, 1000);
          break;
        case 'signedOut':
          log.authEvent('User signed out event');
          setUser(null);
          setIsLoading(false);
          break;
        case 'tokenRefresh':
          log.authEvent('Token refresh event');
          checkUser();
          break;
        case 'tokenRefresh_failure':
          log.warn('Token refresh failed');
          setUser(null);
          setIsLoading(false);
          break;
        case 'signInWithRedirect':
        case 'customOAuthState':
          log.authEvent('OAuth/redirect event - checking user');
          setTimeout(() => {
            checkUser();
          }, 1500);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [checkUser, authChecked]);

  const isAuthenticated = !!user && !isLoading;

  log.devOnly('Auth state:', { 
    hasUser: !!user, 
    isLoading, 
    isAuthenticated, 
    authChecked,
    username: user?.username 
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated, 
      signOut: handleSignOut,
      resendVerification: handleResendVerification
    }}>
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