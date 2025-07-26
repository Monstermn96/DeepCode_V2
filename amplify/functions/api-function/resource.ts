import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({
  name: 'api-function',
  entry: './handler.ts',
  // Correction: Assign the function to the API stack (not "data") to resolve circular dependency issues.
  resourceGroupName: 'data',
  environment: {
    USER_TABLE_NAME: 'Users'
  }
});