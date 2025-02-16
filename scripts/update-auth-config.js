import cognitoPackage from '@aws-sdk/client-cognito-identity-provider';
import amplifyPackage from '@aws-sdk/client-amplify';

const { CognitoIdentityProviderClient, ListUserPoolsCommand, ListUserPoolClientsCommand, DeleteUserPoolCommand } = cognitoPackage;
const { AmplifyClient, UpdateEnvironmentVariableCommand } = amplifyPackage;

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
    
    console.log('Searching for User Pools...');
    // List user pools to find the one matching our naming convention
    const listPoolsCommand = new ListUserPoolsCommand({ MaxResults: 60 });
    const userPools = await cognito.send(listPoolsCommand);
    const branchLower = branch.toLowerCase();
    const targetPool = userPools.UserPools.find(pool => 
      pool.Name.toLowerCase().includes(branchLower)
    );

    if (!targetPool) {
      console.log('----------------------------------------');
      console.log('No User Pool found for branch:', branch);
      console.log('Please wait for the new User Pool to be created');
      console.log('Then update the following environment variables in Amplify Console:');
      console.log('1. VITE_[BRANCH]_AUTH_USER_POOL_ID');
      console.log('2. VITE_[BRANCH]_AUTH_USER_POOL_CLIENT_ID');
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
    
    const client = clients.UserPoolClients[0];
    
    if (!client) {
      console.log('----------------------------------------');
      console.log('No Client found for User Pool:', targetPool.Id);
      console.log('Please wait for the User Pool Client to be created');
      console.log('Then update the following environment variables in Amplify Console:');
      console.log('1. VITE_[BRANCH]_AUTH_USER_POOL_ID =', targetPool.Id);
      console.log('2. VITE_[BRANCH]_AUTH_USER_POOL_CLIENT_ID = [new client id]');
      console.log('----------------------------------------');
      process.exit(1);
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

      console.log('----------------------------------------');
      console.log('Successfully updated auth configuration!');
      console.log('----------------------------------------');

    } catch (error) {
      console.log('----------------------------------------');
      console.log('Failed to update environment variables automatically');
      console.log('Please manually update the following in Amplify Console:');
      console.log(`1. ${updates[0].key} = ${updates[0].value}`);
      console.log(`2. ${updates[1].key} = ${updates[1].value}`);
      console.log('----------------------------------------');
      throw error;
    }

  } catch (error) {
    console.error('Error updating auth configuration:', error);
    process.exit(1);
  }
}

updateAuthConfig(); 