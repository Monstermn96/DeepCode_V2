import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { defaultStorage } from "aws-amplify/utils";
import { generateClient } from "aws-amplify/data";
import App from "./App";
import "./index.css";

// Initialize Amplify asynchronously
async function initializeAmplify() {
	try {
		const outputs = await import('../amplify_outputs.json');
		const config = {
			...outputs.default
		};

		// Only add Auth configuration if the required values are present
		if (outputs.default.auth?.userPoolId && outputs.default.auth?.userPoolClientId) {
			config.Auth = {
				Cognito: {
					userPoolId: outputs.default.auth.userPoolId,
					userPoolClientId: outputs.default.auth.userPoolClientId,
					signUpVerificationMethod: "code"
				}
			};
		} else {
			console.warn('Auth configuration not found in amplify_outputs.json');
		}

		Amplify.configure(config, {
			Auth: {
				tokenProvider: cognitoUserPoolsTokenProvider
			}
		});
		
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
