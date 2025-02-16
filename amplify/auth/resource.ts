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
        Welcome to DeepDevAi!\n\n
        Your verification code is: ${code()}\n\n
        Please enter this code in the verification window to complete your registration.\n\n
        If you didn't request this code, please ignore this email.\n\n
        
        Best regards,
        Eric

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