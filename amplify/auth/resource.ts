import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Welcome to DeepCode - Verify your email',
      verificationEmailBody: (code: () => string) => `OOOOOWEEEEEE rick!Thanks for signing up! Your Flarble code is ${code()}`,
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