import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { ai } from './functions/ai/resource';

// Define the backend with explicit type annotations
const backend = defineBackend({
  auth,
  data,
  ai
});

// Export the backend type and instance
export type Backend = typeof backend;
export default backend;
