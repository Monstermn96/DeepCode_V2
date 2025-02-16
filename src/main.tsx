import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify, type ResourcesConfig } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

// Environment-specific configuration
const getAuthConfig = () => {
  // Local Development
  if (import.meta.env.DEV && !import.meta.env.VITE_ENV) {
    return {
      userPoolId: import.meta.env.VITE_DEV_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_DEV_AUTH_USER_POOL_CLIENT_ID,
    };
  }
  
  // PreDeploy Environment
  if (import.meta.env.VITE_AMPLIFY_ENV === 'staging' || window.location.hostname.includes('predeploy')) {
    return {
      userPoolId: import.meta.env.PD_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.PD_AUTH_USER_POOL_CLIENT_ID,
    };
  }
  
  // Production/Main Environment
  if (import.meta.env.VITE_AMPLIFY_ENV === 'prod' || window.location.hostname.includes('main')) {
    return {
      userPoolId: import.meta.env.MAIN_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.MAIN_AUTH_USER_POOL_CLIENT_ID,
    };
  }

  throw new Error('Environment configuration not found');
};

// Get the environment-specific auth configuration
const authConfig = getAuthConfig();

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
  console.log('Environment:', import.meta.env.VITE_AMPLIFY_ENV || 'development');
  console.log('Configuring Amplify with:', config);
  
  Amplify.configure(config, {
    Auth: {
      tokenProvider: cognitoUserPoolsTokenProvider
    }
  });
  console.log("✅ Amplify configured successfully");
} catch (error) {
  console.error("❌ Error configuring Amplify:", error);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
