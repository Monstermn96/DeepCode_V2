import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { type ResourcesConfig } from 'aws-amplify';
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
  console.log('VITE_API_ID:', import.meta.env.VITE_API_ID || 'Not Set');
  console.log('VITE_API_STAGE:', import.meta.env.VITE_API_STAGE || 'Not Set');
  console.log('----------------------------------------');

  // Validate required environment variables
  const userPoolId = import.meta.env.VITE_AUTH_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID;
  const apiId = import.meta.env.VITE_API_ID;
  const apiStage = import.meta.env.VITE_API_STAGE;

  if (!userPoolId || !userPoolClientId) {
    throw new Error('Required environment variables are not set: VITE_AUTH_USER_POOL_ID and VITE_AUTH_USER_POOL_CLIENT_ID must be defined');
  }

  if (!apiId || !apiStage) {
    throw new Error('Required environment variables are not set: VITE_API_ID and VITE_API_STAGE must be defined');
  }

  // Configure Amplify
  const config: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolId: userPoolId,
        userPoolClientId: userPoolClientId,
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true,
          phone: false,
          username: false
        }
      }
    },
    API: {
      REST: {
        ai: {
          endpoint: `https://${apiId}.execute-api.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com/${apiStage}`,
          region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
        }
      }
    }
  };

  Amplify.configure(config);

  console.log('Amplify configured successfully');
  console.log('API Configuration:', {
    endpoint: config.API?.REST?.ai.endpoint,
    region: config.API?.REST?.ai.region,
    stage: apiStage
  });
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
