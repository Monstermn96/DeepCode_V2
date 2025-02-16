import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
import App from './App';
import './index.css';

// Initialize Amplify
try {
  console.log('----------------------------------------');
  console.log('Initializing Amplify Configuration');
  console.log('----------------------------------------');
  console.log('Environment Variables:');
  console.log('VITE_AMPLIFY_ENV:', import.meta.env.VITE_AMPLIFY_ENV || 'Not Set');
  console.log('VITE_AUTH_USER_POOL_ID:', import.meta.env.VITE_AUTH_USER_POOL_ID || 'Not Set');
  console.log('VITE_AUTH_USER_POOL_CLIENT_ID:', import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID || 'Not Set');
  console.log('----------------------------------------');

  if (!import.meta.env.VITE_AUTH_USER_POOL_ID || !import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID) {
    throw new Error('Auth configuration missing. Please set VITE_AUTH_USER_POOL_ID and VITE_AUTH_USER_POOL_CLIENT_ID');
  }

  // Configure Amplify
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_AUTH_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID,
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true,
          username: false,
          phone: false
        }
      }
    }
  }, {
    Auth: {
      tokenProvider: cognitoUserPoolsTokenProvider
    }
  });

  console.log('Amplify configured successfully');
  console.log('----------------------------------------');

} catch (error) {
  console.error('Error configuring Amplify:', error);
  console.log('----------------------------------------');
}

// Create root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Render app
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
