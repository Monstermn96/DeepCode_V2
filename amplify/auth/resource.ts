import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Welcome to DeepCode - Verify your email',
      verificationEmailBody: 'Thanks for signing up! Your verification code is {####}',
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
  signUpVerification: {
    verificationEmailStyle: 'CODE',
  },
});