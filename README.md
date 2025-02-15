# DeepCode - AI-Powered Code Training Platform

DeepCode is an immersive, dynamic platform designed to help developers improve their coding skills through personalized AI-driven challenges and feedback, built with AWS Amplify Gen2.

## 🚀 Features

- **AI-Powered Learning**: Personalized coding challenges based on user's skill level
- **Real-time Progress Tracking**: Live updates of your learning journey
- **Secure Authentication**: Amazon Cognito with multi-factor authentication support
- **Responsive Design**: Beautiful UI that works across all devices
- **Offline Support**: Continue learning even without internet connection
- **Real-time Updates**: Instant feedback and progress synchronization

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
   git clone https://github.com/yourusername/deepcode.git
   cd deepcode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   # OpenAI Configuration (will be stored securely in AWS)
   OPENAI_API_KEY=your_api_key

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

### Local Development
1. Make changes in feature branches
2. Test locally using `npm run dev` and `npx ampx sandbox`
3. Push to PreDeploy for testing
4. Merge to main for production deployment

## 🔒 Security Features

- Secure storage of API keys in AWS Secrets Manager
- JWT-based authentication with Cognito
- Rate limiting on AI endpoints
- Data encryption at rest and in transit
- Regular security audits and updates
- Authentication Flow:
  - Sign In: Redirects to dashboard after successful authentication
  - Sign Out: Properly clears Cognito session and redirects to welcome page
  - Protected Routes: Automatically redirects to login for unauthenticated access
  - Session Management: Handles token refresh and expiration automatically

## 📈 Monitoring and Analytics

- CloudWatch Logs for application monitoring
- AppSync analytics for API usage
- Custom event tracking for user engagement
- Error tracking and reporting

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