import { CognitoIdentityProviderClient, ListUserPoolsCommand, ListUserPoolClientsCommand, DeleteUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AmplifyClient, UpdateEnvironmentVariableCommand } from '@aws-sdk/client-amplify';

// Log environment variables
console.log('----------------------------------------');
console.log('Environment Variables:');
console.log('AWS_APP_ID:', process.env.AWS_APP_ID);
console.log('AWS_BRANCH:', process.env.AWS_BRANCH);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AUTO_UPDATE_AUTH:', process.env.AUTO_UPDATE_AUTH);
console.log('NODE_VERSION:', process.env.NODE_VERSION);
console.log('AMPLIFY_ENV:', process.env.AMPLIFY_ENV);
console.log('----------------------------------------');

async function updateAuthConfig() {
  try {
    const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
    const amplifyClient = new AmplifyClient({ region: process.env.AWS_REGION });

    // Get the app and branch details
    const appId = process.env.AWS_APP_ID;
    const branch = process.env.AWS_BRANCH;
    
    // List user pools to find the one matching our naming convention
    const listPoolsCommand = new ListUserPoolsCommand({ MaxResults: 60 });
    const userPools = await cognito.send(listPoolsCommand);
    const branchLower = branch.toLowerCase();
    const targetPool = userPools.UserPools.find(pool => 
      pool.Name.toLowerCase().includes(branchLower)
    );

    if (!targetPool) {
      throw new Error(`No user pool found for branch ${branch}`);
    }

    // Get the client ID for this user pool
    const listClientsCommand = new ListUserPoolClientsCommand({
      UserPoolId: targetPool.Id,
      MaxResults: 60
    });
    const clients = await cognito.send(listClientsCommand);
    
    const client = clients.UserPoolClients[0];
    
    if (!client) {
      throw new Error(`No client found for user pool ${targetPool.Id}`);
    }

    // Update Amplify environment variables
    const envVarPrefix = branch.toUpperCase().replace('-', '_');
    const updates = [
      {
        key: `VITE_${envVarPrefix}_AUTH_USER_POOL_ID`,
        value: targetPool.Id
      },
      {
        key: `VITE_${envVarPrefix}_AUTH_USER_POOL_CLIENT_ID`,
        value: client.ClientId
      }
    ];

    console.log('Updating environment variables:', updates);

    // Update each environment variable
    for (const update of updates) {
      const command = new UpdateEnvironmentVariableCommand({
        appId,
        environmentName: branch,
        variable: {
          name: update.key,
          value: update.value
        }
      });
      await amplifyClient.send(command);
      console.log(`Updated ${update.key} = ${update.value}`);
    }

    console.log('Successfully updated auth configuration:', {
      userPoolId: targetPool.Id,
      clientId: client.ClientId
    });

  } catch (error) {
    console.error('Error updating auth configuration:', error);
    process.exit(1);
  }
}

updateAuthConfig(); 