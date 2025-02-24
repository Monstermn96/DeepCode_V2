import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { type ResourcesConfig } from '@aws-amplify/core';
import { generateClient } from "aws-amplify/data";
import App from "./App";
import "./index.css";

interface AmplifyOutputs {
	version: string;
	auth?: {
		userPoolId: string;
		userPoolClientId: string;
	};
	storage?: {
		aws_region: string;
		bucket_name: string;
	};
}

// Initialize Amplify asynchronously
async function initializeAmplify() {
	try {
		const outputs = await import('../amplify_outputs.json');
		const amplifyOutputs = outputs.default as AmplifyOutputs;
		
		const config: ResourcesConfig = {
			Auth: amplifyOutputs.auth ? {
				Cognito: {
					userPoolId: amplifyOutputs.auth.userPoolId,
					userPoolClientId: amplifyOutputs.auth.userPoolClientId,
					signUpVerificationMethod: "code"
				}
			} : undefined,
			Storage: amplifyOutputs.storage ? {
				S3: {
					region: amplifyOutputs.storage.aws_region,
					bucket: amplifyOutputs.storage.bucket_name
				}
			} : undefined
		};

		Amplify.configure(config);
		
		return generateClient();
	} catch (error) {
		console.error('Failed to load Amplify outputs:', error);
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
