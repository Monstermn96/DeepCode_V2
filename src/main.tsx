import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { type ResourcesConfig } from '@aws-amplify/core';
import { generateClient } from "aws-amplify/data";
import App from "./App";
import "./index.css";

// Initialize Amplify asynchronously
async function initializeAmplify() {
	try {
		const config: ResourcesConfig = {
			Auth: {
				Cognito: {
					userPoolId: import.meta.env.VITE_AUTH_USER_POOL_ID || 'local',
					userPoolClientId: import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID || 'local',
					signUpVerificationMethod: "code"
				}
			},
			API: {
				REST: import.meta.env.VITE_API_ID && import.meta.env.VITE_API_STAGE ? {
					main: {
						endpoint: `https://${import.meta.env.VITE_API_ID}.execute-api.${import.meta.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${import.meta.env.VITE_API_STAGE}`,
						region: import.meta.env.AWS_REGION || 'us-east-1'
					}
				} : undefined,
				Events: {
					endpoint: import.meta.env.VITE_API_ID ? 
						`https://${import.meta.env.VITE_API_ID}.execute-api.${import.meta.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${import.meta.env.VITE_API_STAGE}` : 
						'http://localhost:3000',
					defaultAuthMode: 'userPool'
				}
			}
		} as const;

		// For local development
		if (import.meta.env.DEV) {
			console.log('Running in development mode with config:', {
				env: import.meta.env.VITE_AMPLIFY_ENV,
				userPoolId: config.Auth?.Cognito?.userPoolId,
				userPoolClientId: config.Auth?.Cognito?.userPoolClientId,
				apiStage: import.meta.env.VITE_API_STAGE,
				apiId: import.meta.env.VITE_API_ID
			});
		}

		Amplify.configure(config);
		return generateClient();
	} catch (error) {
		console.error('Failed to initialize Amplify:', error);
		return null;
	}
}

// Initialize and render
initializeAmplify().then(() => {
	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
});
