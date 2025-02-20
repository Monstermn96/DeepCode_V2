import { createContext, useContext, useState } from "react";
import { aiService, type SupportedLanguage } from "../services/ai/openai";
import { useAuth } from "./AuthContext";
import { UserStatsService } from "../services/stats/userStats";

interface Problem {
	title: string;
	description: string;
	difficulty: "easy" | "medium" | "hard";
	language: string;
	starterCode: string;
	solution: string;
	testCases: Array<{
		input: string;
		expectedOutput: string;
		description: string;
	}>;
	hints: string[];
}

interface Challenge {
	problem: Problem;
}

interface GenerateChallengeParams {
	type: "challenge";
	topic: string;
	languages: SupportedLanguage[];
}

interface AIContextType {
	currentChallenge: Challenge | null;
	loading: boolean;
	error: string | null;
	generateChallenge: (params: GenerateChallengeParams) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const generateChallenge = async (params: GenerateChallengeParams) => {
		setLoading(true);
		setError(null);

		try {
			console.log("Generating challenge with params:", params);

			const response = await aiService.generateChallenge(
				params.topic,
				params.languages
			);

			console.log("Raw API response:", response);

			if (!response) {
				console.error("No response received from API");
				throw new Error("No response received from AI service");
			}

			if (!response.data) {
				console.error("Invalid response format:", response);
				throw new Error("Invalid response format from AI service");
			}

			// Record token usage if we have a user ID
			if (user?.userId && response.metadata.usage) {
				try {
					const userStatsService = UserStatsService.getInstance();
					await userStatsService.recordTokenUsage(
						user.userId,
						`challenge-${Date.now()}`, // Generate a unique challenge ID
						{
							promptTokens: response.metadata.usage.prompt_tokens,
							completionTokens: response.metadata.usage.completion_tokens,
							totalTokens: response.metadata.usage.total_tokens,
							estimatedCost: response.metadata.usage.estimated_cost,
							model: response.metadata.model,
							challengeType: "challenge"
						}
					);
				} catch (error) {
					console.error("Failed to record token usage:", error);
					// Don't throw here - we still want to set the challenge even if usage recording fails
				}
			}

			console.log("Setting challenge with data:", response.data);

			// Transform the response data into the Challenge format
			setCurrentChallenge({ problem: response.data });
		} catch (err) {
			console.error("Detailed error:", {
				error: err,
				message: err instanceof Error ? err.message : "Unknown error",
				stack: err instanceof Error ? err.stack : undefined,
				params: params,
			});

			const errorMessage =
				err instanceof Error
					? err.message
					: "An error occurred while generating the challenge";
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	};

	return (
		<AIContext.Provider
			value={{
				currentChallenge,
				loading,
				error,
				generateChallenge,
			}}
		>
			{children}
		</AIContext.Provider>
	);
}

export function useAI() {
	const context = useContext(AIContext);
	if (context === undefined) {
		throw new Error("useAI must be used within an AIProvider");
	}
	return context;
}
