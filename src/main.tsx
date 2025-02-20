import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';
import App from "./App";
import "./index.css";

// Initialize Amplify with outputs
Amplify.configure(outputs);

// Initialize the Data API client
export const client = generateClient<Schema>({
	authMode: 'userPool'
});

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
