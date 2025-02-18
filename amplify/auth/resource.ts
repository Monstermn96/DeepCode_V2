import { defineAuth } from '@aws-amplify/backend';

// Define valid environment types
type AmplifyEnv = 'prod' | 'staging' | 'dev';

// Helper function to get environment-specific pool name
const getPoolName = () => {
  const env = (process.env.AMPLIFY_ENV || 'dev') as AmplifyEnv;
  
  // Use environment-specific backend naming variables, fall back to defaults if not set
  const poolNames: Record<AmplifyEnv, string> = {
    'prod': process.env.AMPLIFY_BACKEND_PROD_POOL_NAME || 'DeepDevAi-Fallback-Production',
    'staging': process.env.AMPLIFY_BACKEND_STAGING_POOL_NAME || 'DeepDevAi-Fallback-PreDeploy',
    'dev': process.env.AMPLIFY_BACKEND_DEV_POOL_NAME || 'DeepDevAi-Fallback-Development'
  };
  
  return poolNames[env];
};

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Welcome to DeepDevAi - Verify your email',
      verificationEmailBody: (code: () => string) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .code {
              font-size: 24px;
              font-weight: bold;
              color: #007bff;
              padding: 10px;
              margin: 15px 0;
            }
            .footer {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to DeepDevAi!</h2>
            
            <p>Your verification code is:</p>
            <div class="code">${code()}</div>
            
            <p>Please enter this code in the verification window to complete your registration.</p>
            
            <p>If you didn't request this code, please ignore this email.</p>
            
            <p>Best regards,<br>Eric</p>
            
            <p class="footer">P.S. Account wipes will happen often as the Site is a BIIIIG WIP.</p>
          </div>
        </body>
        </html>
      `,
      verificationEmailStyle: 'CODE'
    }
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    nickname: {
      required: true,
      mutable: false,
    },
  },
  multifactor: {
    mode: 'OFF',
  },
  accountRecovery: 'EMAIL_ONLY',
  name: getPoolName()
});