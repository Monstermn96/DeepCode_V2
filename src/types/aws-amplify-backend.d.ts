declare module '@aws-amplify/backend' {
  export function defineBackend(config: any): any;
  export function defineAuth(config: any): any;
  export function defineData(config: any): any;
  export function defineFunction(config: any): any;

  export interface PasswordSettings {
    minLength: number;
    complexity: {
      requireNumbers: boolean;
      requireSpecialCharacters: boolean;
      requireLowercase: boolean;
      requireUppercase: boolean;
    };
  }

  export interface EmailLoginConfig {
    verificationEmailSubject?: string;
    verificationEmailBody?: (code: () => string) => string;
    verificationEmailStyle?: 'CODE';
    passwordSettings?: PasswordSettings;
  }

  export interface AuthConfig {
    loginWith: {
      email?: EmailLoginConfig;
    };
    userAttributes?: Record<string, {
      required?: boolean;
      mutable?: boolean;
    }>;
    multifactor?: {
      mode: 'OFF' | 'OPTIONAL' | 'REQUIRED';
    };
    accountRecovery?: 'EMAIL_ONLY' | 'PHONE_ONLY' | 'EMAIL_AND_PHONE' | 'NONE';
    name?: string;
  }

  export function defineAuth(config: AuthConfig): any;
} 