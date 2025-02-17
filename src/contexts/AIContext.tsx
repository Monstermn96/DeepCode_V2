import { createContext, useContext, useState } from "react";
import { post } from "@aws-amplify/api-rest";

interface Challenge {
	title: string;
	description: string;
	difficulty: string;
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

interface OpenAIResponse {
	title: string;
	description: string;
	difficulty: string;
	language: string;
	functionSignature: string;
	testCases: Array<{
		input: string;
		output: string;
		explanation: string;
	}>;
	hints: string[];
}

interface GenerateChallengeParams {
	type: "challenge";
	description: string;
	languages: string[];
}

interface AIContextType {
	currentChallenge: Challenge | null;
	loading: boolean;
	error: string | null;
	generateChallenge: (params: GenerateChallengeParams) => Promise<void>;
}

interface APIResponseData {
	data: OpenAIResponse;
	metadata: {
		type: string;
		model: string;
		duration_ms: number;
		languages: string[];
		usage: {
			prompt_tokens: number;
			completion_tokens: number;
			total_tokens: number;
			estimated_cost: number;
		};
	};
}

interface WrappedResponse {
	response: APIResponseData;
	cancel?: boolean;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
	const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(
		null
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const transformOpenAIResponse = (response: OpenAIResponse): Challenge => {
		console.log("Starting OpenAI response transformation:", {
			responseType: typeof response,
			hasTestCases: Array.isArray(response.testCases),
			testCasesLength: response.testCases?.length,
			fields: Object.keys(response),
		});

		// Transform testCases format
		const testCases = response.testCases.map((test, index) => {
			console.log(`Transforming test case ${index}:`, {
				input: test.input,
				output: test.output,
				explanation: test.explanation,
			});
			return {
				input: test.input,
				expectedOutput: test.output,
				description: test.explanation,
			};
		});

		// Create the challenge object
		const challenge = {
			title: response.title,
			description: response.description,
			difficulty: response.difficulty.toLowerCase(),
			language: response.language,
			starterCode: response.functionSignature,
			solution: response.functionSignature, // We'll need to update this when we implement solution handling
			testCases,
			hints: response.hints,
		};

		console.log("Challenge transformation complete:", {
			hasTitle: !!challenge.title,
			hasDescription: !!challenge.description,
			difficulty: challenge.difficulty,
			language: challenge.language,
			testCasesCount: challenge.testCases.length,
			hintsCount: challenge.hints.length,
			rawTestCases: JSON.stringify(challenge.testCases),
		});

		return challenge;
	};

	const generateChallenge = async (params: GenerateChallengeParams) => {
		setLoading(true);
		setError(null);

		// Set minimum loading time to ensure user sees loading state
		const startTime = Date.now();
		const MIN_LOADING_TIME = 3000; // 3 seconds minimum loading time

		try {
			console.log("Starting challenge generation:", {
				params,
				timestamp: new Date().toISOString(),
			});

			const requestBody = {
				type: params.type,
				description: params.description,
				languages: params.languages,
			};

			console.log(
				"Sending request with body:",
				JSON.stringify(requestBody, null, 2)
			);

			// Add timeout promise
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() => reject(new Error("Request timed out after 60 seconds")),
					60000 // Increased timeout to 60 seconds
				);
			});

			console.log("Making API request to:", {
				apiName: "ai",
				path: "/ai",
				timestamp: new Date().toISOString(),
				requestHeaders: {
					"Content-Type": "application/json",
				},
			});

			// Race between the API call and timeout
			const response = await Promise.race([
				post({
					apiName: "ai",
					path: "/ai",
					options: {
						body: requestBody,
						headers: {
							"Content-Type": "application/json",
						},
					},
				}),
				timeoutPromise,
			]);

			console.log("Raw API response details:", {
				isNull: response === null,
				isUndefined: response === undefined,
				type: typeof response,
				hasData:
					typeof response === "object" && response !== null
						? "data" in response
						: false,
				hasMetadata:
					typeof response === "object" && response !== null
						? "metadata" in response
						: false,
				keys:
					typeof response === "object" && response !== null
						? Object.keys(response)
						: [],
				rawResponse: JSON.stringify(response),
			});

			if (!response) {
				throw new Error("No response received from AI service");
			}

			// Parse and validate the response
			let apiResponse: APIResponseData;
			try {
				// Handle both string and object responses
				if (typeof response === "string") {
					console.log("Attempting to parse string response:", {
						responseLength: response.length,
						firstChars: response.substring(0, 100),
					});
					const parsedResponse = JSON.parse(response) as
						| WrappedResponse
						| APIResponseData;
					// Check if response is wrapped
					if ("response" in parsedResponse && parsedResponse.response) {
						console.log("Unwrapping response from response property");
						apiResponse = parsedResponse.response;
					} else {
						apiResponse = parsedResponse as APIResponseData;
					}
				} else {
					const responseObj = response as WrappedResponse | APIResponseData;
					console.log("Processing object response:", {
						responseType: typeof response,
						hasResponse: "response" in responseObj,
						hasData: "data" in responseObj,
						hasMetadata: "metadata" in responseObj,
						responseKeys: Object.keys(responseObj),
						dataType:
							"data" in responseObj ? typeof responseObj.data : "undefined",
						metadataType:
							"metadata" in responseObj
								? typeof responseObj.metadata
								: "undefined",
					});

					// Check if response is wrapped
					if ("response" in responseObj && responseObj.response) {
						console.log("Unwrapping response from response property");
						apiResponse = responseObj.response;
					} else {
						apiResponse = responseObj as APIResponseData;
					}
				}

				// Validate response structure
				if (!apiResponse.data || !apiResponse.metadata) {
					console.error("Invalid response structure:", {
						hasData: !!apiResponse.data,
						hasMetadata: !!apiResponse.metadata,
						responseKeys: Object.keys(apiResponse),
						dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : [],
						metadataKeys: apiResponse.metadata
							? Object.keys(apiResponse.metadata)
							: [],
						rawResponse: JSON.stringify(apiResponse),
					});
					throw new Error("Invalid response structure");
				}

				// Log the response data structure
				console.log("Detailed response data structure:", {
					dataFields: Object.keys(apiResponse.data),
					metadataFields: Object.keys(apiResponse.metadata),
					testCases: {
						isArray: Array.isArray(apiResponse.data.testCases),
						length: apiResponse.data.testCases?.length,
						firstTestCase: apiResponse.data.testCases?.[0],
					},
					hints: {
						isArray: Array.isArray(apiResponse.data.hints),
						length: apiResponse.data.hints?.length,
						firstHint: apiResponse.data.hints?.[0],
					},
					rawData: JSON.stringify(apiResponse.data),
				});

				// Validate required fields
				const requiredFields = [
					"title",
					"description",
					"difficulty",
					"language",
					"functionSignature",
					"testCases",
					"hints",
				] as const;

				const missingFields = requiredFields.filter(
					(field) => !apiResponse.data[field]
				);

				if (missingFields.length > 0) {
					console.error("Missing required fields:", {
						missing: missingFields,
						available: Object.keys(apiResponse.data),
					});
					throw new Error(
						`Missing required fields: ${missingFields.join(", ")}`
					);
				}

				// Validate test cases
				if (
					!Array.isArray(apiResponse.data.testCases) ||
					apiResponse.data.testCases.length === 0
				) {
					console.error("Invalid test cases:", {
						isArray: Array.isArray(apiResponse.data.testCases),
						length: apiResponse.data.testCases?.length,
					});
					throw new Error("Invalid or empty test cases");
				}

				// Validate hints
				if (
					!Array.isArray(apiResponse.data.hints) ||
					apiResponse.data.hints.length === 0
				) {
					console.error("Invalid hints:", {
						isArray: Array.isArray(apiResponse.data.hints),
						length: apiResponse.data.hints?.length,
					});
					throw new Error("Invalid or empty hints");
				}

				console.log("Response validation passed:", {
					hasAllFields: true,
					testCasesCount: apiResponse.data.testCases.length,
					hintsCount: apiResponse.data.hints.length,
					difficulty: apiResponse.data.difficulty,
					language: apiResponse.data.language,
				});
			} catch (error) {
				console.error("Response validation failed:", {
					error,
					errorType:
						error instanceof Error ? error.constructor.name : typeof error,
					errorMessage:
						error instanceof Error ? error.message : "Unknown error",
					response: JSON.stringify(response, null, 2),
				});
				throw new Error(
					`Invalid response format: ${
						error instanceof Error ? error.message : "unknown error"
					}`
				);
			}

			// Transform the OpenAI response into our Challenge format
			console.log("Starting response transformation");
			const challenge = transformOpenAIResponse(apiResponse.data);
			console.log("Challenge transformation complete:", {
				hasTitle: !!challenge.title,
				hasDescription: !!challenge.description,
				testCasesCount: challenge.testCases.length,
				hintsCount: challenge.hints.length,
			});

			// Ensure minimum loading time
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime < MIN_LOADING_TIME) {
				const remainingTime = MIN_LOADING_TIME - elapsedTime;
				console.log(
					`Waiting additional ${remainingTime}ms to meet minimum loading time`
				);
				await new Promise((resolve) => setTimeout(resolve, remainingTime));
			}

			console.log("Setting challenge in state:", {
				timestamp: new Date().toISOString(),
				challengeTitle: challenge.title,
				challengeState: {
					hasTitle: !!challenge.title,
					hasDescription: !!challenge.description,
					difficulty: challenge.difficulty,
					language: challenge.language,
					testCasesCount: challenge.testCases.length,
					hintsCount: challenge.hints.length,
				},
				currentState: {
					hasCurrentChallenge: !!currentChallenge,
					isLoading: loading,
					hasError: !!error,
				},
			});

			setCurrentChallenge(challenge);
		} catch (err) {
			console.error("Error generating challenge:", {
				error: err,
				errorType: err instanceof Error ? err.constructor.name : typeof err,
				message: err instanceof Error ? err.message : "Unknown error",
				stack: err instanceof Error ? err.stack : undefined,
				timestamp: new Date().toISOString(),
				currentState: {
					hasCurrentChallenge: !!currentChallenge,
					isLoading: loading,
					hasError: !!error,
				},
				lastKnownGoodState: currentChallenge
					? {
							title: currentChallenge.title,
							difficulty: currentChallenge.difficulty,
							language: currentChallenge.language,
					  }
					: null,
			});

			// Ensure minimum loading time even for errors
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime < MIN_LOADING_TIME) {
				const remainingTime = MIN_LOADING_TIME - elapsedTime;
				console.log(
					`Waiting additional ${remainingTime}ms before showing error`
				);
				await new Promise((resolve) => setTimeout(resolve, remainingTime));
			}

			setError(
				err instanceof Error
					? err.message
					: "An error occurred while generating the challenge"
			);
		} finally {
			console.log("Challenge generation complete", {
				timestamp: new Date().toISOString(),
				success: !error,
				hasChallenge: !!currentChallenge,
			});
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
