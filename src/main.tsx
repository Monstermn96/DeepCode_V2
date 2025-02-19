import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import { type ResourcesConfig } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../amplify/data/resource';
import App from "./App";
import "./index.css";


// Initialize Amplify
let client: ReturnType<typeof generateClient<Schema>>;

try {
	console.log("----------------------------------------");
	console.log("Initializing Amplify Configuration");
	console.log("----------------------------------------");
	console.log("Environment Variables:");
	console.log(
		"VITE_AMPLIFY_ENV:",
		import.meta.env.VITE_AMPLIFY_ENV || "Not Set"
	);
	console.log(
		"VITE_AUTH_USER_POOL_ID:",
		import.meta.env.VITE_AUTH_USER_POOL_ID || "Not Set"
	);
	console.log(
		"VITE_AUTH_USER_POOL_CLIENT_ID:",
		import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID || "Not Set"
	);
	console.log("VITE_API_ID:", import.meta.env.VITE_API_ID || "Not Set");
	console.log("VITE_API_STAGE:", import.meta.env.VITE_API_STAGE || "Not Set");
	console.log("----------------------------------------");

	// Validate required environment variables
	const userPoolId = import.meta.env.VITE_AUTH_USER_POOL_ID;
	const userPoolClientId = import.meta.env.VITE_AUTH_USER_POOL_CLIENT_ID;
	const apiId = import.meta.env.VITE_API_ID;
	const apiStage = import.meta.env.VITE_API_STAGE;
	const region = import.meta.env.VITE_AWS_REGION || "us-east-1";

	if (!userPoolId || !userPoolClientId) {
		throw new Error(
			"Required environment variables are not set: VITE_AUTH_USER_POOL_ID and VITE_AUTH_USER_POOL_CLIENT_ID must be defined"
		);
	}

	if (!apiId || !apiStage) {
		throw new Error(
			"Required environment variables are not set: VITE_API_ID and VITE_API_STAGE must be defined"
		);
	}

	// Configure Amplify
	const config: ResourcesConfig = {
		Auth: {
			Cognito: {
				userPoolId: userPoolId,
				userPoolClientId: userPoolClientId,
				signUpVerificationMethod: "code",
				loginWith: {
					email: true,
					phone: false,
					username: false,
				},
			},
		},
		API: {
			GraphQL: {
				endpoint: `https://${apiId}.execute-api.${region}.amazonaws.com/${apiStage}/graphql`,
				region: region,
				defaultAuthMode: 'userPool'
			},
			REST: {
				ai: {
					endpoint: `https://${apiId}.execute-api.${region}.amazonaws.com/${apiStage}`,
					region: region,
				},
			},
		},
		Data: {
			endpoint: `https://${apiId}.execute-api.${region}.amazonaws.com/${apiStage}`,
			region: region
		}
	};

	Amplify.configure(config);
	
	// Initialize the Data API client after configuration
	client = generateClient<Schema>();

	console.log("Amplify configured successfully");
	console.log("API Configuration:", {
		graphqlEndpoint: config.API?.GraphQL?.endpoint,
		restEndpoint: config.API?.REST?.ai.endpoint,
		region: config.API?.REST?.ai.region,
		stage: apiStage,
	});
	console.log("Auth Configuration:", {
		userPoolId: config.Auth?.Cognito?.userPoolId,
		userPoolClientId: config.Auth?.Cognito?.userPoolClientId,
		region: region,
	});
	console.log("----------------------------------------");
} catch (error) {
	console.error("Error configuring Amplify:", error);
	console.log("----------------------------------------");
}

export { client };

// Create root element
const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

// Render app
createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>
);
