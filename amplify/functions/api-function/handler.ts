import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.USER_TABLE_NAME || "Users";

interface UserProfile {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  stats: {
    posts: number;
    comments: number;
    likes: number;
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);

  try {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    };

    switch (event.path) {
      case "/initialize": {
        if (event.httpMethod !== "POST") {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: "Method not allowed" }),
          };
        }
        const body = JSON.parse(event.body || "{}");
        const { userId, username, email } = body;
        if (!userId || !username || !email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: "Missing required fields" }),
          };
        }
        const newUser: UserProfile = {
          userId,
          username,
          email,
          createdAt: new Date().toISOString(),
          stats: { posts: 0, comments: 0, likes: 0 },
        };
        
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: newUser,
          ConditionExpression: "attribute_not_exists(userId)",
        }));
        
        return { statusCode: 200, headers, body: JSON.stringify(newUser) };
      }
      case "/stats": {
        if (event.httpMethod !== "GET") {
          return { statusCode: 405, headers, body: JSON.stringify({ message: "Method not allowed" }) };
        }
        const userId = event.queryStringParameters?.userId;
        if (!userId) {
          return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing userId parameter" }) };
        }
        
        const result = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { userId },
        }));
        
        if (!result.Item) {
          return { statusCode: 404, headers, body: JSON.stringify({ message: "User not found" }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
      }
      case "/update-stats": {
        if (event.httpMethod !== "POST") {
          return { statusCode: 405, headers, body: JSON.stringify({ message: "Method not allowed" }) };
        }
        const body = JSON.parse(event.body || "{}");
        const { userId, stats } = body;
        if (!userId || !stats) {
          return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing required fields" }) };
        }
        
        const updateResult = await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId },
          UpdateExpression: "SET stats = :stats",
          ExpressionAttributeValues: { ":stats": stats },
          ReturnValues: "ALL_NEW",
        }));
        
        return { statusCode: 200, headers, body: JSON.stringify(updateResult.Attributes) };
      }
      default:
        return { statusCode: 404, headers, body: JSON.stringify({ message: "Not found" }) };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
      body: JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};