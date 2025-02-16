import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify, type ResourcesConfig } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

// Configuration using environment variables
const config: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AUTH_USER_POOL_ID || process.env.AMPLIFY_AUTH_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID || process.env.AMPLIFY_AUTH_USER_POOL_CLIENT_ID,
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
