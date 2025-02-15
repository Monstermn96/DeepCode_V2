import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Welcome to DeepDevAi - Verify your email',
      verificationEmailBody: (code: () => string) => `
        Welcome to DeepDevAi!
        
        Your verification code is: ${code()}
        
        Please enter this code in the verification window to complete your registration.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        The DeepDevAi Team

        P.S. Account wipes will happen often the Site is a WIP.
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
  accountRecovery: 'EMAIL_ONLY'
});