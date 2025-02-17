import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { handler } from "./localHandler";
import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

// Load environment variables from root .env file
dotenv.config({ path: "../../.env" });

const app = express();
const port = 3001;

// Interface for extended request with raw body
interface RequestWithRawBody extends Request {
	rawBody?: Buffer;
}

// Enhanced JSON parsing error handler with detailed diagnostics
const jsonErrorHandler = (
	err: Error,
	req: RequestWithRawBody,
	res: Response,
	next: NextFunction
) => {
	if (err instanceof SyntaxError && "body" in err) {
		console.error("JSON Parsing Error Details:", {
			error: err.message,
			stack: err.stack,
			rawBody: req.rawBody?.toString(),
			contentType: req.headers["content-type"],
			contentLength: req.headers["content-length"],
		});

		return res.status(400).json({
			error: "Invalid JSON",
			message:
				"The request body contains invalid JSON. Please ensure the body is properly formatted JSON and Content-Type is set to application/json",
			timestamp: new Date().toISOString(),
		});
	}
	next(err);
};

// Middleware setup
app.use(cors());

// Configure JSON parsing with enhanced options
app.use(
	express.json({
		strict: true,
		limit: "10mb",
		verify: (req: RequestWithRawBody, _res, buf) => {
			req.rawBody = buf;
		},
		reviver: (key, value) => {
			// Handle already stringified JSON
			if (
				typeof value === "string" &&
				value.startsWith("{") &&
				value.endsWith("}")
			) {
				try {
					return JSON.parse(value);
				} catch {
					return value;
				}
			}
			return value;
		},
	})
);

app.use(jsonErrorHandler);

// Content-type validation with detailed feedback
app.use((req: Request, res: Response, next: NextFunction) => {
	if (req.method === "POST") {
		const contentType = req.headers["content-type"];
		if (!contentType || !contentType.includes("application/json")) {
			return res.status(415).json({
				error: "Unsupported Media Type",
				message: "Content-Type must be application/json",
				received: contentType,
				timestamp: new Date().toISOString(),
			});
		}
	}
	next();
});

// Debug middleware with structured logging
app.use((req: RequestWithRawBody, _res: Response, next: NextFunction) => {
	console.log("----------------------------------------");
	console.log("Incoming Request:", {
		method: req.method,
		path: req.path,
		contentType: req.headers["content-type"],
		contentLength: req.headers["content-length"],
		body: req.body,
		rawBody: req.rawBody?.toString(),
	});
	console.log("----------------------------------------");
	next();
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || "development",
	});
});

// Main API endpoint with improved error handling and type safety
app.post("/ai", async (req: RequestWithRawBody, res: Response) => {
	try {
		// Create API Gateway event with proper type handling
		const event: APIGatewayProxyEventV2 = {
			version: "2.0",
			routeKey: "POST /ai",
			rawPath: "/ai",
			rawQueryString: "",
			headers: Object.entries(req.headers).reduce(
				(acc, [key, value]) => ({
					...acc,
					[key]: Array.isArray(value) ? value[0] : value ?? "",
				}),
				{}
			),
			requestContext: {
				accountId: "local",
				apiId: "local",
				domainName: "localhost",
				domainPrefix: "local",
				http: {
					method: "POST",
					path: "/ai",
					protocol: "HTTP/1.1",
					sourceIp: req.ip || "127.0.0.1",
					userAgent: req.headers["user-agent"] || "Local-Development-Server",
				},
				requestId: `local-${Date.now()}`,
				routeKey: "POST /ai",
				stage: "local",
				time: new Date().toISOString(),
				timeEpoch: Date.now(),
			},
			body: JSON.stringify(req.body),
			isBase64Encoded: false,
		};

		// Call handler with proper error boundaries
		const response = await handler(event);

		if (!response || typeof response !== "object") {
			throw new Error("Handler returned invalid response");
		}

		const typedResponse = response as APIGatewayProxyStructuredResultV2;

		// Send response with proper content negotiation
		res
			.status(typedResponse.statusCode || 200)
			.set({
				...typedResponse.headers,
				"Content-Type": "application/json",
			})
			.send(typedResponse.body ? JSON.parse(typedResponse.body) : {});
	} catch (error) {
		console.error("API Error:", {
			error,
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
		});

		const errorResponse = {
			error: "Internal Server Error",
			message:
				error instanceof Error ? error.message : "An unexpected error occurred",
			timestamp: new Date().toISOString(),
			...(process.env.NODE_ENV === "development" && {
				details: {
					stack: error instanceof Error ? error.stack : undefined,
					body: req.body,
				},
			}),
		};

		res.status(500).json(errorResponse);
	}
});

// Start server with enhanced logging
app.listen(port, () => {
	console.log("----------------------------------------");
	console.log(
		`🚀 Local development server running at http://localhost:${port}`
	);
	console.log("Server Configuration:", {
		environment: process.env.NODE_ENV || "development",
		openAiKeyConfigured: !!process.env.OPENAI_API_KEY,
		port,
		jsonLimit: "10mb",
	});
	console.log("----------------------------------------");
});
