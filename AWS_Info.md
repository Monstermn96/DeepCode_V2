# Project Vision

## Overview
DeepDevAi is an AI-powered code training platform designed to help developers improve their programming skills through personalized coding challenges. The platform leverages advanced AI to generate unique, contextual coding problems that target specific areas of improvement.

## Core Features
1. **Personalized Learning Experience**
   - AI-generated challenges tailored to user preferences and skill level
   - Support for multiple programming languages (Python, Java, C#)
   - Real-time feedback and adaptive difficulty

2. **Interactive Coding Environment**
   - Split-view interface with problem description and code editor
   - Integrated test cases for immediate feedback
   - Clean, focused coding environment for optimal learning

3. **Progress Tracking**
   - Performance analytics and skill progression monitoring
   - Challenge history and completion metrics
   - Personalized improvement recommendations

4. **AI Integration**
   - OpenAI-powered challenge generation
   - Intelligent difficulty scaling
   - Context-aware hints and solutions

## User Experience Flow
1. **Welcome & Onboarding**
   - Clear value proposition presentation
   - Quick-start challenge generation
   - Seamless authentication flow

2. **Challenge Generation**
   - User-specified parameters (language, difficulty, topic)
   - AI-powered problem creation
   - Immediate transition to coding environment

3. **Coding Environment**
   - Distraction-free interface
   - Split-view layout (problem/editor)
   - Integrated test case execution
   - Real-time feedback system

## Technical Goals
- Provide a robust, scalable platform for continuous learning
- Ensure high-quality, relevant challenge generation
- Maintain responsive, intuitive user interface
- Support seamless cross-device experience

# AWS Configuration and Setup Documentation

## Project Information
- Project Name: DeepDevAi
- AWS Account ID: ${AWS_ACCOUNT_ID}
- Region: us-east-1
- Amplify App ID: d17nr8d8s58ya5

### Branch Strategy
- Production Branch: main (https://main.${APP_ID}.amplifyapp.com)
- Pre-Production Branch: PreDeploy (https://predeploy.${APP_ID}.amplifyapp.com)
  - Used for testing deployed changes before merging to production

## Resource Naming Conventions

### Variables Location Map
1. **Frontend Variables**
   - `.env`: Development environment variables
   ```plaintext
   VITE_AMPLIFY_ENV=development|staging|production
   VITE_${ENV}_AUTH_USER_POOL_ID=region_poolid
   VITE_${ENV}_AUTH_USER_POOL_CLIENT_ID=clientid
   ```

2. **Backend Variables**
   - Amplify Gen 2 configuration: `/amplify/backend.ts`
   - Auth configuration: `/amplify/auth/resource.ts`
   - AI Function: `/amplify/functions/ai/resource.ts`

3. **Deployment Scripts**
   - Main Branch: `/MainScripts/cleanup-main.ps1`
   ```powershell
   $APP_ID = "d17nr8d8s58ya5"
   $BRANCH = "main"
   $REGION = "us-east-1"
   ```
   - PreDeploy: `/PreDeployScripts/cleanup-predeploy.ps1`
   ```powershell
   $APP_ID = "d17nr8d8s58ya5"
   $BRANCH = "PreDeploy"
   $REGION = "us-east-1"
   ```
   - Local/Sandbox: `/LocalDevScripts/*.ps1`
   ```powershell
   $REGION = "us-east-1"
   $ENV = "development|sandbox"
   ```

### Resource Naming Patterns
1. **Cognito User Pools**
   - Production: `DeepDevAi-Production`
   - PreDeploy: `DeepDevAi-PreDeploy`
   - Development: `DeepDevAi-Development`
   - Sandbox: `DeepDevAi-Sandbox`

2. **CloudFormation Stacks**
   - Main Branch: `amplify-${APP_ID}-main-branch-${HASH}`
   - PreDeploy Branch: `amplify-${APP_ID}-predeploy-branch-${HASH}`
   - Nested Stacks:
     - Auth: `${ROOT_STACK}-auth${HASH}`
     - Function: `${ROOT_STACK}-function${HASH}`
     - API: `${ROOT_STACK}-api${HASH}`

3. **API Endpoints**
   - Format: `https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}`
   - Stages: `main`, `predeploy`, `dev`

## Project Structure
### Amplify Gen 2 Resources
- /amplify
  ├── backend.ts (Main backend definition)
  ├── auth/ (Cognito authentication)
  ├── functions/
  │   └── ai/ (OpenAI integration function)
  ├── amplify_outputs.json
  ├── package.json
  └── tsconfig.json

### Functions
#### AI Function
- Name: ${PROJECT_NAME}-ai-${ENV}
- Type: Lambda
- Runtime: Node.js 18.x
- Memory: 1024 MB
- Timeout: 30 seconds
- Environment Variables:
  - REGION: ${AWS_REGION}
  - OPENAI_API_KEY: Your OpenAI API key (set in Amplify Console)
- Supported Languages:
  - C#
  - Java
  - Python
- Dependencies:
  - openai

### Auth Configuration
- Login Methods: Email
- User Pool Configuration:
  - Password Requirements:
    - Minimum Length: 8
    - Requires: Numbers, Lowercase, Uppercase, Symbols
  - Required Attributes: email, nickname
  - Username Attributes: email
  - Verification: email

## AWS Amplify Configuration

### App Settings
- Framework: Amplify Gen 2
- Build Command: `npm run build`
- Output Directory: dist
- Node.js Version: 20

### Environment Variables
```yaml
AMPLIFY_DIFF_DEPLOY: false
AMPLIFY_MONOREPO_APP_ROOT: .
NODE_VERSION: 20
AMPLIFY_BACKEND_DEPLOYMENT: true
```

## Build Configuration (amplify.yml)
```yaml
applications:
  - appRoot: .
    backend:
      phases:
        preBuild:
          commands:
            - nvm install 20
            - nvm use 20
            - npm install @aws-sdk/client-cognito-identity-provider @aws-sdk/client-amplify
        build:
          commands:
            - npm install
            - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
    frontend:
      phases:
        preBuild:
          commands:
            - nvm use 20
            - npm install
        build:
          commands:
            - if [ "$FIRST_DEPLOY" = "true" ]; then node ./scripts/update-auth-config.js; fi
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

## Environment Management Scripts

### Main Branch Scripts
1. `MainScripts/cleanup-main.ps1`
   - Cleans up main/production environment
   - Requires confirmation for deletions
   - Deletes resources in correct order:
     1. Nested stacks first
     2. Main stacks second
     3. User pools last
   ```powershell
   ./MainScripts/cleanup-main.ps1
   ```

### PreDeploy Scripts
1. `PreDeployScripts/cleanup-predeploy.ps1`
   - Cleans up PreDeploy environment
   - Only affects resources with "predeploy" in name
   - Safe to run without affecting production
   ```powershell
   ./PreDeployScripts/cleanup-predeploy.ps1
   ```

### Local Development Scripts
1. `LocalDevScripts/cleanup-local.ps1`
   - Cleans local development environment
   - Removes local build artifacts
   ```powershell
   ./LocalDevScripts/cleanup-local.ps1
   ```

2. `LocalDevScripts/start-local.ps1`
   - Sets up local development environment
   - Starts Vite dev server
   ```powershell
   ./LocalDevScripts/start-local.ps1
   ```

## Deployment Process

### Environment Setup
1. **Local Development**
   - Uses local environment variables
   - No AWS resource deployment
   - Fastest for UI development

2. **PreDeploy Environment**
   - Staging environment for testing
   - Full AWS resource deployment
   - Requires cleanup before redeployment

3. **Production Environment**
   - Main branch deployment
   - Requires confirmation for changes
   - Full AWS resource deployment

### Deployment Flow
1. **Local Testing**
   ```bash
   ./LocalDevScripts/cleanup-local.ps1
   ./LocalDevScripts/start-local.ps1
   ```

2. **PreDeploy Testing**
   ```bash
   ./PreDeployScripts/cleanup-predeploy.ps1
   git checkout PreDeploy
   git pull
   npx ampx pipeline-deploy --branch PreDeploy --app-id d17nr8d8s58ya5
   ```

3. **Production Deployment**
   ```bash
   # Only if necessary:
   ./MainScripts/cleanup-main.ps1
   
   git checkout main
   git pull
   npx ampx pipeline-deploy --branch main --app-id d17nr8d8s58ya5
   ```

## Important Notes
- Always run cleanup scripts with caution
- Main branch cleanup requires explicit confirmation
- PreDeploy cleanup is safe to run anytime
- Keep environment variables updated after rebuilds
- Monitor AWS CloudWatch for errors
- Check AWS Console for resource status

## Security Notes
⚠️ IMPORTANT: This file contains sensitive information. Keep it secure and never commit to version control.
- Rotate access keys periodically
- Review and update IAM permissions as needed
- Monitor AWS CloudTrail for security events

## Recovery Steps
If credentials are compromised:
1. Immediately disable existing access keys in AWS IAM Console
2. Create new access keys
3. Update local .env file
4. Update Amplify Console environment variables

## Function Testing
### AI Function
Test with:
```bash
curl -X POST https://[your-api-endpoint]/ai \
  -H "Content-Type: application/json" \
  -d '{
    "type": "challenge",
    "topic": "algorithms",
    "languages": ["Python", "Java", "C#"]
  }'
```

Expected response format:
```json
{
  "data": {
    "title": "...",
    "description": "...",
    "difficulty": "easy|medium|hard",
    "language": "Python|Java|C#",
    "starterCode": "...",
    "solution": "...",
    "testCases": [
      {
        "input": "...",
        "expectedOutput": "...",
        "description": "..."
      }
    ],
    "hints": ["...", "..."]
  },
  "metadata": {
    "type": "challenge",
    "model": "gpt-4-turbo-preview",
    "duration_ms": 1234,
    "languages": ["Python"],
    "usage": {
      "prompt_tokens": 123,
      "completion_tokens": 456,
      "total_tokens": 579,
      "estimated_cost": 0.0234
    }
  }
}
```

## Stack Management and Redeployment
### Stack Information
- Root Stack: amplify-d17nr8d8s58ya5-main-branch-53b895246s
- App ID: d17nr8d8s58ya5

### Development Scripts
Located in `/LocalDevScripts/`:

#### Local Development
1. `cleanup-local.ps1`
   - Cleans local development environment
   - Removes Cognito User Pools with "development" in name
   - Cleans build artifacts and node_modules
   - Reinstalls dependencies
   ```powershell
   ./LocalDevScripts/cleanup-local.ps1
   ```

2. `start-local.ps1`
   - Sets up local development environment
   - Verifies AWS credentials
   - Sets development environment variables
   - Starts Vite dev server in new window
   ```powershell
   ./LocalDevScripts/start-local.ps1
   ```

#### Sandbox Environment
3. `cleanup-sandbox.ps1`
   - Comprehensive sandbox cleanup
   - Removes Cognito User Pools with "sandbox" in name
   - Deletes CloudFormation stacks with "sandbox"
   - Cleans local build artifacts
   ```powershell
   ./LocalDevScripts/cleanup-sandbox.ps1
   ```

4. `start-sandbox.ps1`
   - Deploys complete sandbox environment
   - Deploys backend using `ampx pipeline-deploy`
   - Sets sandbox environment variables
   - Starts development server
   ```powershell
   ./LocalDevScripts/start-sandbox.ps1
   ```

#### PreDeploy Environment
5. `cleanup-predeploy.ps1`
   - Comprehensive PreDeploy cleanup
   - Removes Cognito User Pools with "predeploy" in name
   - Deletes CloudFormation stacks with prefix "amplify-${APP_ID}-predeploy"
   - Cleans local build artifacts
   ```powershell
   ./PreDeployScripts/cleanup-predeploy.ps1
   ```

6. `deploy-predeploy.ps1`
   - Deploys to PreDeploy environment
   - Sets required environment variables
   - Deploys using `ampx pipeline-deploy`
   - Updates Amplify Console configuration
   ```powershell
   ./DeployScripts/deploy-predeploy.ps1
   ```

### Environment Usage Guide
1. **Local Development** (No AWS Resources)
   - Use when making UI changes
   - No AWS resource deployment
   - Fastest development cycle
   ```powershell
   ./LocalDevScripts/cleanup-local.ps1
   ./LocalDevScripts/start-local.ps1
   ```

2. **Sandbox Testing** (Temporary AWS Resources)
   - Use when testing AWS resource changes
   - Creates temporary AWS resources
   - Isolated testing environment
   ```powershell
   ./LocalDevScripts/cleanup-sandbox.ps1
   ./LocalDevScripts/start-sandbox.ps1
   ```

3. **PreDeploy Testing** (Production-like Environment)
   - Use before merging to main
   - Full production-like environment
   - Final testing before production
   ```powershell
   ./PreDeployScripts/cleanup-predeploy.ps1
   ./DeployScripts/deploy-predeploy.ps1
   ```

### Redeployment Steps
1. **Before Redeployment**
   - Check for failed stacks in AWS Console
   - Delete stacks in failed state (UPDATE_ROLLBACK_COMPLETE or ROLLBACK_COMPLETE)
   - Ensure deletion of nested stacks in correct order
   - Wait for complete stack deletion before proceeding

2. **Stack Deletion Order**
   - Delete child/nested stacks first
   - Delete root stack last
   - Verify no lingering stacks with app ID d17nr8d8s58ya5

3. **Database Reset**
   - Backup data if needed before deletion
   - DynamoDB tables will be recreated on redeployment
   - New tables will be empty, requiring data reinitialization

4. **Deployment Process**
   ```bash
   # For Local Development:
   # Clean local build artifacts
   npm run clean
   Remove-Item -Path amplify_outputs.json -Force -ErrorAction SilentlyContinue
   Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
   
   # Install dependencies
   npm install
   
   # Start local sandbox environment
   npx ampx sandbox
   
   # For CI/CD Pipeline Deployment:
   # The pipeline-deploy command is only for CI/CD environments
   npx ampx pipeline-deploy --branch PreDeploy --app-id d17nr8d8s58ya5
   
   # Note: If you get "RunningPipelineDeployNotInCiError",
   # use sandbox for local development instead
   ```

5. **Local vs CI/CD Commands**
   - `npx ampx sandbox`: Use for local development and testing
   - `npx ampx pipeline-deploy`: Only works in CI/CD environments
   - Local changes should be tested in sandbox before pushing to CI/CD

6. **Configuration Setup**
   ```typescript
   // main.tsx configuration
   import { Amplify } from "aws-amplify";
   import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
   import { defaultStorage } from "aws-amplify/utils";
   
   try {
     Amplify.configure({
       ...outputs,
       Auth: {
         Cognito: {
           userPoolId: outputs.auth?.userPoolId,
           userPoolClientId: outputs.auth?.userPoolClientId,
           signUpVerificationMethod: "code",
         }
       }
     }, {
       Auth: {
         tokenProvider: cognitoUserPoolsTokenProvider,
         storage: defaultStorage
       }
     });
   } catch (error) {
     console.error("Error configuring Amplify:", error);
   }
   ```

### Troubleshooting Failed Deployments
1. **Common Issues**
   - Auth UserPool not configured
     ```bash
     # If you see "Auth UserPool not configured" error:
     # For PreDeploy branch:
     # 1. Delete the PreDeploy branch stack
     aws cloudformation delete-stack --stack-name amplify-d17nr8d8s58ya5-predeploy-branch-53b895246s
     
     # 2. Wait for deletion to complete, then check status
     aws cloudformation describe-stacks --stack-name amplify-d17nr8d8s58ya5-predeploy-branch-53b895246s
     
     # 3. Clean local amplify outputs (Windows PowerShell)
     Remove-Item -Path amplify_outputs.json -Force -ErrorAction SilentlyContinue
     
     # 4. Redeploy to PreDeploy
     git checkout PreDeploy; git pull; npx ampx pipeline-deploy --branch PreDeploy --app-id d17nr8d8s58ya5
     
     # For main branch (only after PreDeploy is working):
     # 1. Delete the main branch stack
     aws cloudformation delete-stack --stack-name amplify-d17nr8d8s58ya5-main-branch-53b895246s
     
     # 2. Wait for deletion to complete, then check status
     aws cloudformation describe-stacks --stack-name amplify-d17nr8d8s58ya5-main-branch-53b895246s
     
     # 3. Clean local amplify outputs (Windows PowerShell)
     Remove-Item -Path amplify_outputs.json -Force -ErrorAction SilentlyContinue
     
     # 4. Redeploy to main
     git checkout main; git pull; npx ampx pipeline-deploy --branch main --app-id d17nr8d8s58ya5
     ```
   - Stack creation failed
   - Resource already exists
   - Permission issues

2. **Resolution Steps**
   - Check CloudWatch logs for error details
   - Verify IAM roles and permissions
   - Ensure clean stack deletion before redeployment
   - Validate configuration files

3. **Monitoring Deployment**
   - Use AWS Console to monitor stack creation
   - Check Amplify Console for build status
   - Monitor CloudWatch for real-time logs
   - Verify resource creation in respective services

### Post-Deployment Verification
1. **Check Auth configuration in Cognito**
   ```bash
   # 1. First, find your auth stack
   aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'd17nr8d8s58ya5')]"
   
   # Look for stacks ending in '-authstack-xxxxx'
   # PreDeploy branch: amplify-d17nr8d8s58ya5-predeploy-branch-53b895246s-authstack-xxxxx
   # Main branch: amplify-d17nr8d8s58ya5-main-branch-53b895246s-authstack-xxxxx
   
   # 2. List User Pools (they'll be resources in the auth stack)
   aws cognito-idp list-user-pools --max-results 20 --query "UserPools[?contains(Name, 'd17nr8d8s58ya5')]"
   
   # 3. Once you find your User Pool ID, describe it
   aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID
   
   # 4. Verify User Pool configuration matches your auth/resource.ts:
   # - Email verification should be enabled
   # - Required attributes should include email and nickname
   # - Account recovery should be set to EMAIL_ONLY
   
   # 5. Test User Pool with the UI:
   # - Try to sign up (should receive verification email)
   # - Try to sign in with unverified account (should be blocked)
   # - Try to sign in with verified account (should succeed)
   # - Try password reset flow (should receive reset email)
   ```

2. Verify API endpoints in API Gateway
3. Confirm database tables in DynamoDB
4. Test frontend connectivity
5. Validate user authentication flow

## Local Development
1. Start sandbox:
   ```bash
   npx ampx sandbox
   ```
2. Local testing endpoint: http://localhost:20002
3. Environment setup required:
   - OpenAI API key in AWS Secrets Manager
   - AWS credentials configured locally 

## Environment Variables Configuration

### Global Variables (All Branches)
```plaintext
# Password Requirements
AMPLIFY_BACKEND_PASSWORD_MIN_LENGTH = 8
AMPLIFY_BACKEND_PASSWORD_REQUIRE_LOWERCASE = true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_NUMBERS = true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_SPECIAL = true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_UPPERCASE = true

# Pool Configuration
AMPLIFY_BACKEND_POOL_NAME = DeepDevAi-Development

# Build Configuration
AMPLIFY_DIFF_DEPLOY = false
AMPLIFY_MONOREPO_APP_ROOT = .
NODE_VERSION = 18
VAMPLIFY_BACKEND_DEPLOYMENT = true

# Environment Settings
AMPLIFY_ENV = dev
VITE_AMPLIFY_ENV = dev

# Auth Configuration
VITE_AUTH_USER_POOL_ID = us-east-1_48M7F895
VITE_AUTH_USER_POOL_CLIENT_ID = 7tb6inpk6q4dgjt0s1lf2ud6mk

# Feature Flags
AUTO_UPDATE_AUTH = false
FORCE_CLEANUP = false
```

### Branch-Specific Variables

#### PreDeploy Branch
```plaintext
AMPLIFY_ENV = staging
FORCE_CLEANUP = false
VITE_AMPLIFY_ENV = Predeploy
```

#### Main Branch
```plaintext
AMPLIFY_ENV = prod
AUTO_UPDATE_AUTH = false
VITE_AMPLIFY_ENV = Prod
```

## Deployment Process

### Environment Setup
1. **Local Development**
   - Uses local environment variables from `.env`
   - Connects to development Cognito User Pool
   - No AWS resource deployment required

2. **PreDeploy Environment**
   - Staging environment for testing
   - Uses PreDeploy branch-specific variables
   - Full AWS resource deployment
   - Requires cleanup before redeployment

3. **Production Environment**
   - Main branch deployment
   - Uses production-specific variables
   - Full AWS resource deployment
   - Requires careful coordination for updates

### Deployment Scripts

#### Local Development Scripts
1. `LocalDevScripts/cleanup-local.ps1`
   - Cleans local development environment
   - Removes development Cognito User Pools
   - Cleans build artifacts and dependencies
   ```powershell
   ./LocalDevScripts/cleanup-local.ps1
   ```

2. `LocalDevScripts/start-local.ps1`
   - Sets up local development environment
   - Verifies AWS credentials
   - Starts Vite development server
   ```powershell
   ./LocalDevScripts/start-local.ps1
   ```

#### PreDeploy Scripts
1. `PreDeployScripts/cleanup-predeploy.ps1`
   - Comprehensive PreDeploy cleanup
   - Removes PreDeploy Cognito User Pools
   - Deletes CloudFormation stacks
   ```powershell
   ./PreDeployScripts/cleanup-predeploy.ps1
   ```

2. `DeployScripts/deploy-predeploy.ps1`
   - Deploys to PreDeploy environment
   - Creates new AWS resources
   - Updates Amplify configuration
   ```powershell
   ./DeployScripts/deploy-predeploy.ps1
   ```

### Deployment Flow

1. **Local Development**
   ```bash
   # Clean and start local environment
   ./LocalDevScripts/cleanup-local.ps1
   ./LocalDevScripts/start-local.ps1
   ```

2. **PreDeploy Testing**
   ```bash
   # Clean PreDeploy environment
   ./PreDeployScripts/cleanup-predeploy.ps1
   
   # Deploy to PreDeploy
   ./DeployScripts/deploy-predeploy.ps1
   
   # After deployment:
   # 1. Check new resource IDs in Amplify Console
   # 2. Update environment variables if needed
   # 3. Trigger rebuild if necessary
   ```

3. **Production Deployment**
   ```bash
   # 1. Merge PreDeploy to main
   # 2. Wait for automatic deployment
   # 3. Verify environment variables
   # 4. Check resource creation
   ```

### Auth Configuration Update Process

The `update-auth-config.js` script automatically:
1. Finds the appropriate Cognito User Pool for the branch
2. Gets the User Pool Client ID
3. Updates Amplify environment variables
4. Logs the new configuration

```javascript
// Script triggered by AUTO_UPDATE_AUTH=true
// Updates:
// - VITE_AUTH_USER_POOL_ID
// - VITE_AUTH_USER_POOL_CLIENT_ID
```

### Cleanup Process

1. **Before Redeployment**
   - Run appropriate cleanup script
   - Wait for resource deletion confirmation
   - Verify in AWS Console

2. **Resource Cleanup Order**
   - Cognito User Pools
   - CloudFormation stacks
   - Local build artifacts

3. **Automatic Cleanup**
   - Set `FORCE_CLEANUP=true` for automatic cleanup
   - Set `AUTO_UPDATE_AUTH=true` for automatic auth updates

### Troubleshooting

1. **Failed Deployments**
   - Check CloudWatch logs
   - Verify environment variables
   - Run cleanup script
   - Attempt redeployment

2. **Auth Configuration Issues**
   - Verify User Pool exists
   - Check Client ID is valid
   - Update environment variables manually if needed

3. **Stack Deletion Issues**
   - Delete nested stacks first
   - Wait for complete deletion
   - Verify in AWS Console

### Environment Variable Management

1. **Adding New Variables**
   - Add to Amplify Console
   - Update local `.env` file
   - Document in AWS_Info.md

2. **Updating Variables**
   - Use Amplify Console UI
   - Select appropriate branch scope
   - Verify changes after deployment

3. **Variable Precedence**
   - Branch-specific overrides global
   - Environment-specific overrides branch
   - Local `.env` for development 