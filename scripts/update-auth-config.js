import { CognitoIdentityProviderClient, ListUserPoolsCommand, ListUserPoolClientsCommand } from '@aws-sdk/client-cognito-identity-provider';
import pkg from '@aws-sdk/client-amplify';
const { AmplifyClient, UpdateEnvironmentVariableCommand } = pkg;

// Log environment variables
console.log('----------------------------------------');
console.log('Starting Auth Configuration Update');
console.log('----------------------------------------');
console.log('Environment Variables:');
console.log('AWS_APP_ID:', process.env.AWS_APP_ID);
console.log('AWS_BRANCH:', process.env.AWS_BRANCH);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('FIRST_DEPLOY:', process.env.FIRST_DEPLOY);
console.log('AMPLIFY_ENV:', process.env.AMPLIFY_ENV);
console.log('AMPLIFY_BACKEND_POOL_NAME:', process.env.AMPLIFY_BACKEND_POOL_NAME);
console.log('----------------------------------------');

async function updateAuthConfig() {
  try {
    const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
    const amplifyClient = new AmplifyClient({ region: process.env.AWS_REGION });

    // Get the app and branch details
    const appId = process.env.AWS_APP_ID;
    const branch = process.env.AWS_BRANCH;
    const poolName = process.env.AMPLIFY_BACKEND_POOL_NAME;
    const branchLower = branch.toLowerCase();
    
    if (!poolName) {
      console.error('Error: AMPLIFY_BACKEND_POOL_NAME is not set');
      process.exit(1);
    }
    
    console.log('Searching for User Pools...');
    // List user pools to find the one matching our naming convention
    const listPoolsCommand = new ListUserPoolsCommand({ MaxResults: 60 });
    const userPools = await cognito.send(listPoolsCommand);
    
    console.log('Found User Pools:');
    userPools.UserPools.forEach(pool => {
      console.log(`- ${pool.Name} (${pool.Id})`);
    });
    console.log('----------------------------------------');

    // Find pool by matching branch name or pool name
    const targetPool = userPools.UserPools.find(pool => {
      const name = pool.Name.toLowerCase();
      return (
        name.includes(branchLower) || 
        name.includes('predeploy') ||
        name.includes('staging') ||
        name.includes('deepdevai')
      );
    });

    if (!targetPool) {
      console.log('----------------------------------------');
      console.log('No matching User Pool found.');
      console.log('Searched for pools containing:');
      console.log(`- Branch name: ${branch}`);
      console.log('- "predeploy"');
      console.log('- "staging"');
      console.log('- "deepdevai"');
      console.log('Please wait for the new User Pool to be created');
      console.log('Then update the following environment variables in Amplify Console:');
      console.log('1. VITE_AUTH_USER_POOL_ID');
      console.log('2. VITE_AUTH_USER_POOL_CLIENT_ID');
      console.log('----------------------------------------');
      process.exit(1);
    }

    console.log('Found User Pool:', {
      Name: targetPool.Name,
      Id: targetPool.Id
    });

    // Get the client ID for this user pool
    const listClientsCommand = new ListUserPoolClientsCommand({
      UserPoolId: targetPool.Id,
      MaxResults: 60
    });
    const clients = await cognito.send(listClientsCommand);
    
    console.log('Found Clients:');
    clients.UserPoolClients?.forEach(client => {
      console.log(`- ${client.ClientName} (${client.ClientId})`);
    });
    console.log('----------------------------------------');
    
    const client = clients.UserPoolClients[0];
    
    if (!client) {
      console.log('----------------------------------------');
      console.log('No Client found for User Pool:', targetPool.Id);
      console.log('Please wait for the User Pool Client to be created');
      console.log('Then update the following environment variables in Amplify Console:');
      console.log('1. VITE_AUTH_USER_POOL_ID =', targetPool.Id);
      console.log('2. VITE_AUTH_USER_POOL_CLIENT_ID = [new client id]');
      console.log('----------------------------------------');
      process.exit(1);
    }

    // Store the new values for final output
    const newConfig = {
      userPoolName: targetPool.Name,
      userPoolId: targetPool.Id,
      clientId: client.ClientId
    };

    // Update Amplify environment variables
    const updates = [
      {
        key: 'VITE_AUTH_USER_POOL_ID',
        value: targetPool.Id
      },
      {
        key: 'VITE_AUTH_USER_POOL_CLIENT_ID',
        value: client.ClientId
      }
    ];

    console.log('----------------------------------------');
    console.log('New Auth Configuration:');
    console.log('User Pool Name:', targetPool.Name);
    console.log('User Pool ID:', targetPool.Id);
    console.log('Client ID:', client.ClientId);
    console.log('----------------------------------------');
    console.log('Updating Amplify environment variables...');

    try {
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

      // After successful update, set FIRST_DEPLOY to false
      const firstDeployCommand = new UpdateEnvironmentVariableCommand({
        appId,
        environmentName: branch,
        variable: {
          name: 'FIRST_DEPLOY',
          value: 'false'
        }
      });
      await amplifyClient.send(firstDeployCommand);
      console.log('Set FIRST_DEPLOY = false');

      console.log('----------------------------------------');
      console.log('Successfully updated auth configuration!');
      console.log('----------------------------------------');
      console.log('IMPORTANT: Copy these values to your Amplify Console:');
      console.log('1. VITE_AUTH_USER_POOL_ID =', newConfig.userPoolId);
      console.log('2. VITE_AUTH_USER_POOL_CLIENT_ID =', newConfig.clientId);
      console.log('----------------------------------------');

    } catch (error) {
      console.log('----------------------------------------');
      console.log('Failed to update environment variables automatically');
      console.log('Please manually update the following in Amplify Console:');
      console.log(`1. VITE_AUTH_USER_POOL_ID = ${newConfig.userPoolId}`);
      console.log(`2. VITE_AUTH_USER_POOL_CLIENT_ID = ${newConfig.clientId}`);
      console.log('3. FIRST_DEPLOY = false');
      console.log('----------------------------------------');
      throw error;
    }

  } catch (error) {
    console.error('Error updating auth configuration:', error);
    process.exit(1);
  }
}

updateAuthConfig(); 