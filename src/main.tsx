import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import App from "./App";
import "./index.css";

// Initialize Amplify configuration
async function initializeAmplify() {
	try {
		// Try to fetch amplify_outputs.json (avoid Vite build-time import issues)
		let outputs;
		try {
			const response = await fetch('/amplify_outputs.json');
			if (response.ok) {
				outputs = await response.json();
				console.log('✅ Loaded amplify_outputs.json from sandbox');
			} else {
				throw new Error('amplify_outputs.json not found');
			}
		} catch (error) {
			console.log('⚠️ amplify_outputs.json not found, using fallback configuration for sandbox setup');
			// Fallback configuration for when sandbox is starting up
			outputs = {
				version: "1.3",
				auth: {
					user_pool_id: import.meta.env.VITE_AUTH_USER_POOL_ID || 'local',
					user_pool_client_id: import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID || 'local',
					oauth: {},
					password_policy: {},
					standard_required_attributes: ["email"],
					username_attributes: ["email"],
					user_verification_types: ["email"],
					unauthenticated_identities_enabled: true
				},
				data: {
					url: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
					aws_region: import.meta.env.AWS_REGION || 'us-east-1',
					default_authorization_type: "userPool",
					authorization_types: ["userPool", "iam"]
				},
				custom: {
					API: {
						main: {
							endpoint: import.meta.env.VITE_API_ID ? 
								`https://${import.meta.env.VITE_API_ID}.execute-api.${import.meta.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${import.meta.env.VITE_API_STAGE}` :
								'http://localhost:3000',
							region: import.meta.env.AWS_REGION || 'us-east-1'
						}
					}
				}
			};
		}

		// Configure Amplify with outputs
		Amplify.configure(outputs);

		// Debug logging for development
		if (import.meta.env.DEV) {
			console.log('🚀 Amplify initialized with configuration:', {
				env: import.meta.env.VITE_AMPLIFY_ENV || 'development',
				hasRealOutputs: !!outputs.auth?.user_pool_id && outputs.auth.user_pool_id !== 'local',
				userPoolId: outputs.auth?.user_pool_id,
				graphqlEndpoint: outputs.data?.url,
				apiEndpoint: outputs.custom?.API?.main?.endpoint
			});
		}

		return generateClient();
	} catch (error) {
		console.error('❌ Failed to initialize Amplify:', error);
		return null;
	}
}

// Initialize and render the app
initializeAmplify().then(() => {
	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}).catch(error => {
	console.error('❌ Failed to start application:', error);
});
