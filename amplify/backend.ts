import { defineBackend, defineFunction } from "@aws-amplify/backend";
import { Stack, RemovalPolicy, CfnResource, Tags, Duration } from "aws-cdk-lib";
import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
  LogGroupLogDestination,
  AccessLogFormat,
  MethodLoggingLevel
} from "aws-cdk-lib/aws-apigateway";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { AttributeType, Table, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

// Get environment-specific configuration
const stage = process.env.AMPLIFY_ENV || 'dev';
const region = process.env.AWS_REGION || 'us-east-1';
const appId = process.env.AWS_APP_ID || 'local';

// Define the Amplify backend with auth, data, and the functions
export const backend = defineBackend({
  auth: auth,
  data: data,
  userStatsFunction: defineFunction({
    name: 'userStats',
    entry: './functions/userStats.ts',
    resourceGroupName: 'data',
    environment: {
      STAGE: stage,
      LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
      NODE_OPTIONS: '--enable-source-maps'
    },
    memoryMB: 1024,
    timeoutSeconds: 30
  }),
  apiFunction: defineFunction({
    name: 'api-function',
    entry: './functions/api-function/resource.ts',
    resourceGroupName: 'data',
    environment: {
      USER_TABLE_NAME: 'Users',
      STAGE: stage,
      LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
      NODE_OPTIONS: '--enable-source-maps'
    },
    memoryMB: 1024,
    timeoutSeconds: 30
  })
});

// Create stacks in order of dependencies
const authStack = backend.createStack("auth-stackv2");
const dataStack = backend.createStack("data-stackv2");
const apiStack = backend.createStack("api-stackv2");

// Add stack tags for better resource management
[authStack, dataStack, apiStack].forEach(stack => {
  Tags.of(stack).add('Environment', stage);
  Tags.of(stack).add('Application', 'DeepCodeV2');
  Tags.of(stack).add('ManagedBy', 'Amplify');
});

// Add explicit dependencies between stacks
(dataStack.node.defaultChild as CfnResource).addDependsOn(authStack.node.defaultChild as CfnResource);
(apiStack.node.defaultChild as CfnResource).addDependsOn(dataStack.node.defaultChild as CfnResource);

// Create a DynamoDB table for user data in the data stack
const userTable = new Table(dataStack, "UserTable", {
  partitionKey: { name: "userId", type: AttributeType.STRING },
  tableName: `Users-${stage}-${appId}`,
  removalPolicy: stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
  billingMode: BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: stage === 'prod',
});

// Grant DynamoDB permissions to the API function's Lambda
userTable.grantReadWriteData(backend.apiFunction.resources.lambda);

// Create CloudWatch log group for API Gateway
const apiLogGroup = new LogGroup(apiStack, 'ApiGatewayLogs', {
  retention: stage === 'prod' ? RetentionDays.ONE_MONTH : RetentionDays.ONE_WEEK,
  removalPolicy: stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
});

// Define allowed origins based on environment
const getAllowedOrigins = (stage: string): string[] => {
  switch (stage) {
    case 'prod':
    case 'main':
      return [
        'https://deepdevai.com',
        'https://www.deepdevai.com'
      ];
    case 'predeploy':
      return [
        'https://predeploy.d17nr8d8s58ya5.amplifyapp.com',
        'https://www.predeploy.d17nr8d8s58ya5.amplifyapp.com',

      ];
    case 'dev':
    case 'local':
      return [
        'http://localhost:5173',  // Vite default
        'http://localhost:3000',  // Common React port
        'http://localhost:8080',  // Alternative dev port
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
      ];
    default:
      return stage === 'prod' ? [] : Cors.ALL_ORIGINS.slice(); // Strict in prod, permissive in unknown dev
  }
};

// Create a REST API in the API stack
const myRestApi = new RestApi(apiStack, "RestApi", {
  restApiName: `myRestApi-${stage}`,
  deploy: true,
  deployOptions: { 
    stageName: stage,
    variables: {
      lambdaAlias: backend.apiFunction.resources.lambda.functionName
    },
    loggingLevel: MethodLoggingLevel.INFO,
    accessLogDestination: new LogGroupLogDestination(apiLogGroup),
    accessLogFormat: AccessLogFormat.jsonWithStandardFields()
  },
  defaultCorsPreflightOptions: {
    allowOrigins: getAllowedOrigins(stage),
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: [
      ...Cors.DEFAULT_HEADERS,
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent',
      'X-Amz-Date',
      'X-Lambda-Function'
    ],
    allowCredentials: true,
    maxAge: Duration.days(1)
  },
});

// Create a Lambda integration referencing the API function
const lambdaIntegration = new LambdaIntegration(backend.apiFunction.resources.lambda);

// Define REST API endpoints
const initializePath = myRestApi.root.addResource("initialize");
initializePath.addMethod("POST", lambdaIntegration, { 
  authorizationType: AuthorizationType.IAM,
  requestParameters: {
    'method.request.header.X-Lambda-Function': true
  }
});

const statsPath = myRestApi.root.addResource("stats");
statsPath.addMethod("GET", lambdaIntegration, { 
  authorizationType: AuthorizationType.IAM,
  requestParameters: {
    'method.request.header.X-Lambda-Function': true
  }
});

const updateStatsPath = myRestApi.root.addResource("update-stats");
updateStatsPath.addMethod("POST", lambdaIntegration, { 
  authorizationType: AuthorizationType.IAM,
  requestParameters: {
    'method.request.header.X-Lambda-Function': true
  }
});

// Create an IAM policy to allow API invoke access
const apiRestPolicy = new Policy(apiStack, "RestApiPolicy", {
  statements: [
    new PolicyStatement({
      actions: ["execute-api:Invoke"],
      resources: [
        `${myRestApi.arnForExecuteApi("*", "/initialize", stage)}`,
        `${myRestApi.arnForExecuteApi("*", "/stats", stage)}`,
        `${myRestApi.arnForExecuteApi("*", "/update-stats", stage)}`,
      ],
    }),
  ],
});

// Attach the policy to authenticated IAM role (from the auth stack)
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(apiRestPolicy);

// Output API details and environment configuration
backend.addOutput({
  custom: {
    API: {
      [myRestApi.restApiName]: {
        endpoint: myRestApi.url,
        region: Stack.of(myRestApi).region,
        apiName: myRestApi.restApiName,
        stage: stage
      },
    },
    ENV_VARIABLES: {
      STAGE: stage,
      REGION: region,
      APP_ID: appId,
      USER_TABLE_NAME: userTable.tableName
    },
    STACK_REFS: {
      AUTH_STACK: authStack.stackName,
      DATA_STACK: dataStack.stackName,
      API_STACK: apiStack.stackName
    }
  },
});

