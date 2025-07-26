import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { aiBackendService } from '../services/ai/ai-backend-service';
import { UserStatsService } from '../services/stats/userStats';
import { log } from '../utils/logger';

// Import the old service as fallback
import { aiService as frontendAIService } from '../services/ai/openai';

export type SupportedLanguage = 'Python' | 'Java' | 'C#';

export interface Challenge {
	problem: {
		id?: string;
		title: string;
		description: string;
		language: SupportedLanguage;
		difficulty: 'Easy' | 'Medium' | 'Hard';
		starterCode?: string;
		testCases: Array<{
			input: string;
			expectedOutput: string;
			explanation?: string;
		}>;
		hints: string[];
		solution?: string;
	};
}

export interface GenerateChallengeParams {
	type: string;
	topic: string;
	languages: SupportedLanguage[];
	useEmptyMethods?: boolean; // If true (default), provides empty method stubs; if false, provides complete starter code
	learningPathId?: string; // Optional learning path context for better problem generation
	userSkillLevels?: Record<string, number>; // User's skill levels for fallback generation
}

interface AIContextType {
	currentChallenge: Challenge | null;
	loading: boolean;
	error: string | null;
	generateChallenge: (params: GenerateChallengeParams) => Promise<void>;
	evaluateCode: (code: string, testCases: any[], language: SupportedLanguage) => Promise<any>;
	setCurrentChallenge: (challenge: Challenge | null) => void;
	useBackendAI: boolean;
	setUseBackendAI: (value: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [useBackendAI, setUseBackendAI] = useState(true); // Default to backend AI

	const generateChallenge = async (params: GenerateChallengeParams) => {
		setLoading(true);
		setError(null);

		try {
			log.aiOperation("Generating challenge", { 
				topic: params.topic, 
				languages: params.languages, 
				useBackendAI 
			});

			let response;
			
			if (useBackendAI) {
				// Use new backend service
				try {
					response = await aiBackendService.generateChallenge({
						topic: params.topic,
						languages: params.languages,
						difficulty: 'Medium', // Default difficulty
						useEmptyMethods: params.useEmptyMethods,
						learningPathId: params.learningPathId,
						userSkillLevels: params.userSkillLevels
					});
				} catch (backendError) {
					log.warn("Backend AI failed, falling back to frontend", { error: backendError });
					// Fallback to frontend service
					response = await frontendAIService.generateChallenge(
						params.topic,
						params.languages,
						user?.userId,
						params.useEmptyMethods,
						params.learningPathId,
						params.userSkillLevels
					);
				}
			} else {
				// Use frontend service directly
				response = await frontendAIService.generateChallenge(
					params.topic,
					params.languages,
					user?.userId,
					params.useEmptyMethods,
					params.learningPathId,
					params.userSkillLevels
				);
			}

			log.devOnly("Raw API response", response);

			if (!response) {
				log.error("No response received from API");
				throw new Error("No response received from AI service");
			}

			if (!response.data) {
				log.error("Invalid response format", response);
				throw new Error("Invalid response format from AI service");
			}

			// Token usage is now tracked automatically in the backend

			log.aiOperation("Challenge generated successfully", { hasData: !!response.data });

			// Transform the response data into the Challenge format
			setCurrentChallenge({ problem: response.data });
		} catch (error) {
			console.error("Failed to generate challenge:", error);
			setError(error instanceof Error ? error.message : "Failed to generate challenge");
			
			// Show user-friendly error messages
			if (error instanceof Error) {
				if (error.message.includes("API key")) {
					setError("AI service is not configured. Please check your settings.");
				} else if (error.message.includes("rate limit")) {
					setError("Too many requests. Please wait a moment and try again.");
				} else if (error.message.includes("timeout")) {
					setError("Request timed out. Please try again.");
				} else {
					setError("Failed to generate challenge. Please try again.");
				}
			}
		} finally {
			setLoading(false);
		}
	};

	const evaluateCode = async (code: string, testCases: any[], language: SupportedLanguage) => {
		try {
			log.aiOperation("Evaluating code", { language, useBackendAI, testCaseCount: testCases.length });
			
			let response;
			
			if (useBackendAI) {
				try {
					response = await aiBackendService.evaluateCode({
						code,
						testCases,
						language
					});
				} catch (backendError) {
					log.warn("Backend evaluation failed, falling back to frontend", { error: backendError });
					// Fallback to frontend service
					response = await frontendAIService.evaluateCode(
						code,
						testCases,
						language,
						user?.userId
					);
				}
			} else {
				response = await frontendAIService.evaluateCode(
					code,
					testCases,
					language,
					user?.userId
				);
			}

			return response;
		} catch (error) {
			console.error("Failed to evaluate code:", error);
			throw error;
		}
	};

	return (
		<AIContext.Provider
			value={{
				currentChallenge,
				loading,
				error,
				generateChallenge,
				evaluateCode,
				setCurrentChallenge,
				useBackendAI,
				setUseBackendAI
			}}
		>
			{children}
		</AIContext.Provider>
	);
}

export function useAI() {
	const context = useContext(AIContext);
	if (!context) {
		throw new Error('useAI must be used within an AIProvider');
	}
	return context;
}
