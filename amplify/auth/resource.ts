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
      verificationEmailSubject: 'Welcome to DeepDevAi - Verify your email'
    },
    phone: undefined
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true
    },
    nickname: {
      required: true,
      mutable: false
    }
  },
  multifactor: {
    mode: 'OFF'
  },
  accountRecovery: 'EMAIL_ONLY',
  name: getPoolName()
});