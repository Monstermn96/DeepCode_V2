# DeepDevAi - AI-Powered Code Training Platform

DeepDevAi is an immersive, dynamic platform designed to help developers improve their coding skills through personalized AI-driven challenges and feedback, built with AWS Amplify Gen2.

## 🚀 Features

- **AI-Powered Learning**: Personalized coding challenges based on user's skill level
- **Real-time Progress Tracking**: Live updates of your learning journey
- **Secure Authentication**: Amazon Cognito with multi-factor authentication support
- **Responsive Design**: Beautiful UI that works across all devices
- **Offline Support**: Continue learning even without internet connection
- **Real-time Updates**: Instant feedback and progress synchronization
- **Multi-Model AI Support**: Compatible with GPT-4, o1, o4 series models
- **Enhanced Security**: Prompt injection protection and secure AI interactions

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **State Management**: React Context + Custom Hooks
- **Styling**: CSS Modules + Custom Animations
- **Testing**: Vitest + React Testing Library

### Backend (AWS Amplify Gen2)
- **Authentication**: Amazon Cognito
- **API**: AWS AppSync (GraphQL)
- **Database**: Amazon DynamoDB
- **Functions**: AWS Lambda (TypeScript)
- **AI Integration**: OpenAI API (via Lambda)
- **File Storage**: Amazon S3
- **CDN**: Amazon CloudFront

## 📋 Prerequisites

- Node.js (v18+)
- AWS Account
- OpenAI API Key
- Git

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/deepdevai.git
   cd deepdevai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file or configure in Amplify Console:
   ```env
   # OpenAI Configuration (will be stored securely in AWS)
   VITE_OPENAI_API_KEY=your_api_key
   VITE_OPENAI_MODEL=gpt-4  # or o4-mini, o1-preview, etc.

   # Additional configurations will be managed by Amplify
   ```

4. **Start local development**
   ```bash
   # Start frontend
   npm run dev

   # Start Amplify sandbox
   npx ampx sandbox
   ```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts for state management
├── services/           # API and external service integrations
│   ├── ai/            # OpenAI service integration
│   ├── auth/          # Authentication service
│   └── api/           # GraphQL operations
├── types/             # TypeScript definitions
├── utils/             # Helper functions
├── hooks/             # Custom React hooks
└── pages/             # Application pages

amplify/
├── data/              # GraphQL schema and resolvers
├── auth/              # Authentication configuration
└── functions/         # Lambda functions
    └── ai/            # AI integration functions
```

## 🚀 Development Workflow

### Branch Strategy
- **main**: Production branch - https://main.d17nr8d8s58ya5.amplifyapp.com
- **PreDeploy**: Pre-production testing - https://predeploy.d17nr8d8s58ya5.amplifyapp.com

### Backend Deployment
- **Automatic**: Backend deploys automatically when files in `amplify/` change
- **Manual**: Set `FORCE_BACKEND_DEPLOY=true` in Amplify Console to force deployment
- **Outputs**: `amplify_outputs.json` is automatically generated for each environment

### Local Development
1. **Setup and Testing**
   ```bash
   # Clean and prepare
   npm run clean
   Remove-Item -Path amplify_outputs.json -Force -ErrorAction SilentlyContinue
   Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
   npm install

   # Start local development
   npm run dev  # Frontend
   npx ampx sandbox  # Backend
   ```

2. **Testing Process**
   - Develop and test locally using sandbox environment
   - Verify changes in local environment first
   - Commit changes to feature branch
   - Push to remote and create PR to PreDeploy

3. **CI/CD Deployment**
   - Automated deployment will run in CI/CD pipeline
   - Do not use `pipeline-deploy` command locally
   - Monitor deployment in Amplify Console
   - Verify changes in PreDeploy environment

4. **Production Deployment**
   - After PreDeploy verification, merge to main
   - Automated deployment will handle production release
   - Monitor production deployment in Amplify Console

### Configuration
```typescript
// main.tsx Amplify configuration
import { Amplify } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { defaultStorage } from "aws-amplify/utils";

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
```

## 🔒 Security Features

- Secure storage of API keys in AWS Secrets Manager
- JWT-based authentication with Cognito
- Rate limiting on AI endpoints
- Data encryption at rest and in transit
- Regular security audits and updates
- **AI Security**:
  - Prompt injection protection in all AI interactions
  - Secure system prompts that prevent command execution
  - User input treated as data, never as instructions
  - No execution of user-provided code
- **Authentication Flow**:
  - Sign In: Redirects to dashboard after successful authentication
  - Sign Out: Properly clears Cognito session and redirects to welcome page
  - Protected Routes: Automatically redirects to login for unauthenticated access
  - Session Management: Handles token refresh and expiration automatically

## 📈 Monitoring and Analytics

- CloudWatch Logs for application monitoring
- AppSync analytics for API usage
- Custom event tracking for user engagement
- Error tracking and reporting

## 🔄 Recent Updates (January 2025)

### AWS Amplify Gen2 Migration
- **Backend Deployment**: Automated backend deployment with conditional logic
- **Configuration Management**: `amplify_outputs.json` auto-generation for each environment
- **Branch-specific Resources**: Each branch has its own Cognito pools, APIs, and databases
- **CI/CD Pipeline**: Optimized build process with intelligent caching

### OpenAI Integration Improvements
- **Multi-Model Support**: Now supports GPT-4, o1, and o4 series models
- **Dynamic Token Handling**: Automatically uses `max_tokens` or `max_completion_tokens` based on model
- **Enhanced Security**: All prompts include security instructions to prevent injection attacks

### Build & Deployment Enhancements
- **Conditional Backend Deployment**: Only deploys when backend files change
- **Environment Variable Management**: Centralized configuration in Amplify Console
- **Test Phase Compliance**: Fixed Amplify test artifacts requirements
- **TypeScript Compatibility**: Resolved type issues with Amplify Gen2 imports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS Amplify Team
- OpenAI
- React Community
- All contributors and users