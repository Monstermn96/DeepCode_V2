import { defineBackend, defineFunction } from "@aws-amplify/backend";
import { Stack, RemovalPolicy, CfnResource } from "aws-cdk-lib";
import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";

// Define the Amplify backend with auth, data, and the functions
export const backend = defineBackend({
  auth: auth,
  data: data,
  userStatsFunction: defineFunction({
    name: 'userStats',
    entry: './functions/userStats.ts',
    resourceGroupName: 'data'
  }),
  apiFunction: defineFunction({
    name: 'api-function',
    entry: './functions/api-function/resource.ts',
    resourceGroupName: 'data',
    environment: {
      USER_TABLE_NAME: 'Users'
    }
  })
});

// Create stacks in order of dependencies
const authStack = backend.createStack("auth-stackv2");
const dataStack = backend.createStack("data-stackv2");
const apiStack = backend.createStack("api-stackv2");

// Add explicit dependencies between stacks
(dataStack.node.defaultChild as CfnResource).addDependsOn(authStack.node.defaultChild as CfnResource);
(apiStack.node.defaultChild as CfnResource).addDependsOn(dataStack.node.defaultChild as CfnResource);

// Create a DynamoDB table for user data in the data stack
const userTable = new Table(dataStack, "UserTable", {
  partitionKey: { name: "userId", type: AttributeType.STRING },
  tableName: "Users",
  removalPolicy: RemovalPolicy.DESTROY,
});

// Grant DynamoDB permissions to the API function's Lambda
userTable.grantReadWriteData(backend.apiFunction.resources.lambda);

// Set the USER_TABLE_NAME environment variable for the API function
process.env.USER_TABLE_NAME = userTable.tableName;

// Create a REST API in the API stack
const myRestApi = new RestApi(apiStack, "RestApi", {
  restApiName: "myRestApi",
  deploy: true,
  deployOptions: { 
    stageName: "dev",
    // Ensure API deployment happens after Lambda function is ready
    variables: {
      lambdaAlias: backend.apiFunction.resources.lambda.functionName
    }
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

// Create a Lambda integration referencing the API function
const lambdaIntegration = new LambdaIntegration(backend.apiFunction.resources.lambda);

// Define REST API endpoints
const initializePath = myRestApi.root.addResource("initialize");
initializePath.addMethod("POST", lambdaIntegration, { 
  authorizationType: AuthorizationType.IAM,
  // Add explicit dependency on Lambda function
  methodOptions: {
    requestParameters: {
      'integration.request.header.X-Lambda-Function': backend.apiFunction.resources.lambda.functionName
    }
  }
});

const statsPath = myRestApi.root.addResource("stats");
statsPath.addMethod("GET", lambdaIntegration, { 
  authorizationType: AuthorizationType.IAM,
  methodOptions: {
    requestParameters: {
      'integration.request.header.X-Lambda-Function': backend.apiFunction.resources.lambda.functionName
    }
  }
});

const updateStatsPath = myRestApi.root.addResource("update-stats");
updateStatsPath.addMethod("POST", lambdaIntegration, { 
  authorizationType: AuthorizationType.IAM,
  methodOptions: {
    requestParameters: {
      'integration.request.header.X-Lambda-Function': backend.apiFunction.resources.lambda.functionName
    }
  }
});

// Create an IAM policy to allow API invoke access
const apiRestPolicy = new Policy(apiStack, "RestApiPolicy", {
  statements: [
    new PolicyStatement({
      actions: ["execute-api:Invoke"],
      resources: [
        `${myRestApi.arnForExecuteApi("*", "/initialize", "dev")}`,
        `${myRestApi.arnForExecuteApi("*", "/stats", "dev")}`,
        `${myRestApi.arnForExecuteApi("*", "/update-stats", "dev")}`,
      ],
    }),
  ],
});

// Attach the policy to authenticated IAM role (from the auth stack)
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(apiRestPolicy);

// Output API details in the Amplify backend configuration
backend.addOutput({
  custom: {
    API: {
      [myRestApi.restApiName]: {
        endpoint: myRestApi.url,
        region: Stack.of(myRestApi).region,
        apiName: myRestApi.restApiName,
      },
    },
  },
});
