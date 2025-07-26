import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, resendSignUpCode } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { fetchUserAttributes } from 'aws-amplify/auth';

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
      console.log('🔍 Checking user authentication...');
      const currentUser = await getCurrentUser();
      console.log('✅ Found authenticated user:', currentUser.username);
      
      const userAttributes = await fetchUserAttributes();
      console.log('📋 User attributes:', userAttributes);
      
      // Create a user object that includes both the user and their attributes
      const userWithAttributes = {
        ...currentUser,
        username: userAttributes.nickname || userAttributes.email || currentUser.username,
        attributes: userAttributes
      };
      
      setUser(userWithAttributes);
      console.log('👤 User state updated successfully');
    } catch (error) {
      console.log('❌ No authenticated user found:', error instanceof Error ? error.message : 'Unknown error');
      setUser(null);
    } finally {
      setIsLoading(false);
      setAuthChecked(true);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out user...');
      setIsLoading(true);
      await signOut();
      setUser(null);
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResendVerification = async (username: string) => {
    try {
      console.log('📧 Resending verification code for:', username);
      await resendSignUpCode({ username });
      console.log('✅ Verification code sent');
    } catch (error) {
      console.error('❌ Error resending verification:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!authChecked) {
      checkUser();
    }

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }: { payload: AuthPayload }) => {
      console.log('🔔 Auth event received:', payload.event);
      
      switch (payload.event) {
        case 'signedIn':
          console.log('🎉 User signed in event - checking user');
          // Add a small delay to ensure Cognito session is fully established
          setTimeout(() => {
            checkUser();
          }, 1000);
          break;
        case 'signedOut':
          console.log('👋 User signed out event');
          setUser(null);
          setIsLoading(false);
          break;
        case 'tokenRefresh':
          console.log('🔄 Token refresh event');
          checkUser();
          break;
        case 'tokenRefresh_failure':
          console.log('❌ Token refresh failed');
          setUser(null);
          setIsLoading(false);
          break;
        case 'signInWithRedirect':
        case 'customOAuthState':
          console.log('🔄 OAuth/redirect event - checking user');
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

  console.log('🔐 Auth state:', { 
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