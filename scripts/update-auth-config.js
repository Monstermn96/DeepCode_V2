import { CognitoIdentityServiceProvider, Amplify } from 'aws-sdk';

async function updateAuthConfig() {
  try {
    const cognito = new CognitoIdentityServiceProvider();
    const amplify = new Amplify();

    // Get the app and branch details
    const appId = process.env.AWS_APP_ID;
    const branch = process.env.AWS_BRANCH;
    
    // List user pools to find the one matching our naming convention
    const userPools = await cognito.listUserPools({ MaxResults: 60 }).promise();
    const branchLower = branch.toLowerCase();
    const targetPool = userPools.UserPools.find(pool => 
      pool.Name.toLowerCase().includes(branchLower)
    );

    if (!targetPool) {
      throw new Error(`No user pool found for branch ${branch}`);
    }

    // Get the client ID for this user pool
    const clients = await cognito.listUserPoolClients({
      UserPoolId: targetPool.Id,
      MaxResults: 60
    }).promise();
    
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

    // Update each environment variable
    for (const update of updates) {
      await amplify.updateEnvironmentVariable({
        appId,
        environmentName: branch,
        variable: {
          name: update.key,
          value: update.value
        }
      }).promise();
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