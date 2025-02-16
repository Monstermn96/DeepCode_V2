import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify, type ResourcesConfig } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

// Debug: Log all environment and runtime information
console.log('🔍 Application Environment Debug Info');
console.log('====================================');
console.log('📊 Runtime Info:');
console.log('----------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Development Mode:', import.meta.env.DEV ? 'Yes' : 'No');
console.log('Production Mode:', import.meta.env.PROD ? 'Yes' : 'No');
console.log('Base URL:', import.meta.env.BASE_URL);
console.log('Mode:', import.meta.env.MODE);

console.log('\n🌐 Network Info:');
console.log('----------------');
console.log('Current Hostname:', window.location.hostname);
console.log('Current Origin:', window.location.origin);
console.log('Current Path:', window.location.pathname);

console.log('\n⚙️ Environment Configuration:');
console.log('---------------------------');
console.log('AMPLIFY_ENV:', import.meta.env.AMPLIFY_ENV || 'Not Set');
console.log('Environment Stage:', 
  import.meta.env.AMPLIFY_ENV === 'staging' ? 'PreDeploy' :
  import.meta.env.AMPLIFY_ENV === 'prod' ? 'Production' :
  import.meta.env.DEV ? 'Development' : 'Unknown'
);

console.log('\n🔐 Authentication Variables:');
console.log('---------------------------');
console.log('Development Pool ID:', import.meta.env.VITE_DEV_AUTH_USER_POOL_ID || 'Not Set');
console.log('Development Client ID:', import.meta.env.VITE_DEV_AUTH_USER_POOL_CLIENT_ID || 'Not Set');
console.log('PreDeploy Pool ID:', import.meta.env.VITE_PD_AUTH_USER_POOL_ID || 'Not Set');
console.log('PreDeploy Client ID:', import.meta.env.VITE_PD_AUTH_USER_POOL_CLIENT_ID || 'Not Set');
console.log('Main Pool ID:', import.meta.env.VITE_MAIN_AUTH_USER_POOL_ID || 'Not Set');
console.log('Main Client ID:', import.meta.env.VITE_MAIN_AUTH_USER_POOL_CLIENT_ID || 'Not Set');

console.log('\n📝 All Environment Variables:');
console.log('---------------------------');
Object.keys(import.meta.env).forEach(key => {
  // Only log variables that don't contain sensitive information
  if (!key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD')) {
    console.log(`${key}:`, import.meta.env[key] || 'Not Set');
  }
});
console.log('====================================');

// Validate environment configuration
const validateConfig = (poolId?: string, clientId?: string, env?: string) => {
  const errors = [];
  if (!poolId) errors.push('User Pool ID is not set');
  if (!clientId) errors.push('Client ID is not set');
  if (!env) errors.push('Environment is not set');
  return errors;
};

// Environment-specific configuration
const getAuthConfig = () => {
  // Local Development
  if (import.meta.env.DEV && !import.meta.env.VITE_AMPLIFY_ENV) {
    const errors = validateConfig(
      import.meta.env.VITE_DEV_AUTH_USER_POOL_ID,
      import.meta.env.VITE_DEV_AUTH_USER_POOL_CLIENT_ID,
      'development'
    );
    
    if (errors.length > 0) {
      console.error('❌ Development Environment Configuration Errors:', errors);
      throw new Error(`Invalid development configuration: ${errors.join(', ')}`);
    }

    return {
      userPoolId: import.meta.env.VITE_DEV_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_DEV_AUTH_USER_POOL_CLIENT_ID,
    };
  }
  
  // PreDeploy Environment
  if (import.meta.env.VITE_AMPLIFY_ENV === 'staging' || window.location.hostname.includes('predeploy')) {
    const errors = validateConfig(
      import.meta.env.VITE_PD_AUTH_USER_POOL_ID,
      import.meta.env.VITE_PD_AUTH_USER_POOL_CLIENT_ID,
      'staging'
    );
    
    if (errors.length > 0) {
      console.error('❌ PreDeploy Environment Configuration Errors:', errors);
      console.error('Note: In production builds, environment variables must be prefixed with VITE_');
      console.error('Current environment variables:', Object.keys(import.meta.env).join(', '));
      throw new Error(`Invalid PreDeploy configuration: ${errors.join(', ')}`);
    }

    console.log('✅ PreDeploy Environment Detected');
    console.log('--------------------------------');
    console.log('Pool ID:', import.meta.env.VITE_PD_AUTH_USER_POOL_ID);
    console.log('Client ID:', import.meta.env.VITE_PD_AUTH_USER_POOL_CLIENT_ID);
    console.log('--------------------------------');

    return {
      userPoolId: import.meta.env.VITE_PD_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_PD_AUTH_USER_POOL_CLIENT_ID,
    };
  }
  
  // Production/Main Environment
  if (import.meta.env.VITE_AMPLIFY_ENV === 'prod' || window.location.hostname.includes('main')) {
    const errors = validateConfig(
      import.meta.env.VITE_MAIN_AUTH_USER_POOL_ID,
      import.meta.env.VITE_MAIN_AUTH_USER_POOL_CLIENT_ID,
      'production'
    );
    
    if (errors.length > 0) {
      console.error('❌ Production Environment Configuration Errors:', errors);
      throw new Error(`Invalid production configuration: ${errors.join(', ')}`);
    }

    return {
      userPoolId: import.meta.env.VITE_MAIN_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_MAIN_AUTH_USER_POOL_CLIENT_ID,
    };
  }

  throw new Error('Environment configuration not found. Please check your environment variables and deployment settings.');
};

// Get the environment-specific auth configuration
let authConfig;
try {
  authConfig = getAuthConfig();
} catch (error) {
  console.error('❌ Failed to get auth configuration:', error);
  throw error;
}

const config: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: authConfig.userPoolId,
      userPoolClientId: authConfig.userPoolClientId,
      signUpVerificationMethod: "code",
      loginWith: {
        email: true,
        username: false,
        phone: false
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: 'https://q56jqtrxnnbgdokpd3zjmqltxm.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-rxoyayozejgfxdoyl3uzpdb55y'
    }
  }
};

try {
  console.log('🔧 Configuring Amplify...');
  console.log('Environment:', import.meta.env.VITE_AMPLIFY_ENV || 'development');
  console.log('Configuration:', {
    ...config,
    Auth: config.Auth && {
      ...config.Auth,
      Cognito: config.Auth.Cognito && {
        ...config.Auth.Cognito,
        userPoolId: config.Auth.Cognito?.userPoolId || 'Not Set',
        userPoolClientId: config.Auth.Cognito?.userPoolClientId || 'Not Set'
      }
    }
  });
  
  Amplify.configure(config, {
    Auth: {
      tokenProvider: cognitoUserPoolsTokenProvider
    }
  });
  console.log("✅ Amplify configured successfully");
} catch (error) {
  console.error("❌ Error configuring Amplify:", error);
  throw error;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
