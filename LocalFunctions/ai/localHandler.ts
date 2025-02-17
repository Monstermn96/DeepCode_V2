import {
	type APIGatewayProxyEventV2,
	type APIGatewayProxyResultV2,
} from "aws-lambda";
import OpenAI from "openai";

const CACHE_DURATION = 3600; // 1 hour cache for successful responses
const SUPPORTED_LANGUAGES = ["C#", "Java", "Python"];

const PROMPT_CONFIGS = {
	challenge: {
		systemPrompt: `You are a coding problem generator that creates well-structured programming challenges.
    Create diverse and unique problems each time. Always respond with valid JSON only.
    Focus on real-world scenarios and practical coding challenges.
    Include clear test cases with explanations and helpful hints.
    IMPORTANT: Only generate problems for these languages: ${SUPPORTED_LANGUAGES.join(
			", "
		)}.
    Ensure the code examples and solutions are idiomatic for the chosen language.
    Set difficulty to one of: "easy", "medium", or "hard" based on the problem complexity.
    
    Your response must include:
    - title: A concise problem title
    - description: A clear problem description
    - difficulty: One of "easy", "medium", or "hard"
    - language: The programming language for the solution
    - functionSignature: The function signature/template for the solution
    - testCases: Array of test cases, each with input, output, and explanation
    - hints: Array of helpful hints for solving the problem`,
		responseFormat: {
			title: "string",
			description: "string",
			difficulty: "easy|medium|hard",
			language: SUPPORTED_LANGUAGES.join("|"),
			functionSignature: "string",
			testCases: [
				{
					input: "string",
					output: "string",
					explanation: "string",
				},
			],
			hints: ["string"],
		},
	},
	evaluation: {
		systemPrompt: `You are a code evaluator that tests submitted solutions against provided test cases.
    Provide detailed feedback on code quality, performance, and potential improvements.
    Always respond with valid JSON only.
    IMPORTANT: Only evaluate code for these languages: ${SUPPORTED_LANGUAGES.join(
			", "
		)}.
    Ensure feedback is specific to the language's best practices.`,
		responseFormat: {
			passed: "boolean",
			results: ["Array of test results"],
			feedback: "Detailed feedback",
			suggestions: ["Array of improvement suggestions"],
		},
	},
};

function calculateCost(usage: OpenAI.CompletionUsage | undefined): number {
	if (!usage) return 0;
	// GPT-4 pricing: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
	const promptCost = (usage.prompt_tokens / 1000) * 0.03;
	const completionCost = (usage.completion_tokens / 1000) * 0.06;
	return Number((promptCost + completionCost).toFixed(4));
}

interface ParsedContent {
	title: string;
	description: string;
	difficulty: string;
	language: string;
	functionSignature: string;
	testCases: Array<{
		input: any;
		output: any;
		explanation: string;
	}>;
	hints: string[];
}

export async function handler(
	event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
	console.log("Request details:", {
		method: event.requestContext?.http?.method,
		path: event.requestContext?.http?.path,
		body: event.body,
		timestamp: new Date().toISOString(),
	});

	try {
		// Verify OpenAI API key
		if (!process.env.OPENAI_API_KEY) {
			console.error("OpenAI API key is not configured");
			throw new Error("OpenAI API key not configured");
		}

		const openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});

		if (!event.body) {
			console.error("Request body is missing");
			throw new Error("Request body is required");
		}

		// Parse the request body
		const parsedBody = JSON.parse(event.body);
		console.log("Parsed request body:", {
			type: parsedBody.type,
			languages: parsedBody.languages,
		});

		const {
			type = "challenge",
			languages = [],
			description = "",
			...inputData
		} = parsedBody;

		// Validate languages
		const validLanguages = languages.filter((lang: string) =>
			SUPPORTED_LANGUAGES.includes(lang)
		);

		if (validLanguages.length === 0) {
			validLanguages.push(SUPPORTED_LANGUAGES[0]); // Default to first supported language
		}

		const config = PROMPT_CONFIGS[type as keyof typeof PROMPT_CONFIGS];

		if (!config) {
			throw new Error(`Unsupported prompt type: ${type}`);
		}

		const startTime = Date.now();
		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: config.systemPrompt },
				{
					role: "user",
					content: JSON.stringify({
						...inputData,
						description,
						languages: validLanguages,
					}),
				},
			],
			temperature: 0.7,
			max_tokens: 4000,
			response_format: { type: "json_object" },
			stream: false, // Explicitly set to false for JSON responses
		});

		// Verify the response is complete and valid
		if (
			!completion.choices?.[0]?.message?.content ||
			completion.choices[0].finish_reason !== "stop"
		) {
			throw new Error("Incomplete response from AI service");
		}

		const duration = Date.now() - startTime;
		const cost = calculateCost(completion.usage);

		// Log OpenAI response details with validation
		console.log("OpenAI Response Status:", {
			finish_reason: completion.choices[0].finish_reason,
			role: completion.choices[0].message.role,
			content_length: completion.choices[0].message.content.length,
			usage: completion.usage,
		});

		// Validate JSON format before parsing
		let parsedContent: ParsedContent;
		try {
			const rawContent = completion.choices[0].message.content;
			console.log("Raw OpenAI content:", rawContent);

			parsedContent = JSON.parse(rawContent);
			console.log("Successfully parsed content into JSON");

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

			console.log("Validating response fields:", {
				receivedFields: Object.keys(parsedContent),
				requiredFields,
				hasAllFields: requiredFields.every(
					(field) => parsedContent[field as keyof ParsedContent] !== undefined
				),
			});

			const missingFields = requiredFields.filter(
				(field) => !parsedContent[field as keyof ParsedContent]
			);

			if (missingFields.length > 0) {
				console.error("Missing required fields:", {
					missingFields,
					receivedFields: Object.keys(parsedContent),
				});
				throw new Error(
					`Missing required fields in AI response: ${missingFields.join(", ")}`
				);
			}

			// Validate arrays
			if (!Array.isArray(parsedContent.testCases)) {
				throw new Error("testCases must be an array");
			}
			if (!Array.isArray(parsedContent.hints)) {
				throw new Error("hints must be an array");
			}

			console.log("Response structure validation passed");

			// Log the full validated content
			console.log("Validated content structure:", {
				title: typeof parsedContent.title,
				description: typeof parsedContent.description,
				difficulty: parsedContent.difficulty,
				language: parsedContent.language,
				functionSignature: typeof parsedContent.functionSignature,
				testCasesCount: parsedContent.testCases.length,
				hintsCount: parsedContent.hints.length,
			});
		} catch (error) {
			console.error("Failed to parse or validate AI response:", {
				error,
				rawContent: completion.choices[0].message.content,
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});
			throw new Error(
				`Invalid JSON response from AI service: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}

		const responseBody = {
			data: parsedContent,
			metadata: {
				type,
				model: "gpt-4o-mini",
				duration_ms: duration,
				languages: validLanguages,
				usage: {
					prompt_tokens: completion.usage?.prompt_tokens || 0,
					completion_tokens: completion.usage?.completion_tokens || 0,
					total_tokens: completion.usage?.total_tokens || 0,
					estimated_cost: cost,
				},
			},
		};

		console.log("Final Response Body Structure:", {
			hasData: !!responseBody.data,
			hasMetadata: !!responseBody.metadata,
			dataFields: Object.keys(responseBody.data),
			metadataFields: Object.keys(responseBody.metadata),
		});

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers":
					"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
				"Access-Control-Allow-Methods": "OPTIONS,POST",
				"Cache-Control": `public, max-age=${CACHE_DURATION}`,
				"X-Response-Time": `${duration}ms`,
				"X-Token-Usage": JSON.stringify(completion.usage),
			},
			body: JSON.stringify(responseBody),
		};
	} catch (error: unknown) {
		const typedError = error as Error;
		console.error("Error processing request:", {
			error: typedError.message,
			stack: typedError.stack,
			timestamp: new Date().toISOString(),
		});

		const statusCode =
			typedError.message === "Request body is required"
				? 400
				: typedError.message.includes("API key")
				? 503
				: typedError.message.includes("rate limit")
				? 429
				: 500;

		return {
			statusCode,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers":
					"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
				"Access-Control-Allow-Methods": "OPTIONS,POST",
				"Cache-Control": "no-store",
			},
			body: JSON.stringify({
				error: typedError.message || "Internal server error",
				type: "UnknownError",
				timestamp: new Date().toISOString(),
				request_id: event.requestContext?.requestId,
			}),
		};
	}
}
