#!/bin/bash

echo "Starting cleanup process for PreDeploy environment..."

# Set variables
APP_ID=$AWS_APP_ID
BRANCH=$AWS_BRANCH
REGION=$AWS_REGION
STACK_PREFIX="amplify-${APP_ID}-predeploy"

# Function to check if AWS CLI command was successful
check_aws_command() {
    if [ $? -ne 0 ]; then
        echo "AWS command failed. Stopping script."
        exit 1
    fi
}

# Function to parse JSON with Node.js
parse_json() {
    node -e "
        const data = JSON.parse(process.argv[1]);
        if (process.argv[2] === 'userPools') {
            const pools = data.UserPools.filter(p => 
                p.Name.toLowerCase().includes('predeploy')
            ).map(p => p.Id);
            console.log(pools.join('\n'));
        } else if (process.argv[2] === 'stacks') {
            const stacks = data.StackSummaries.filter(s => 
                s.StackName.startsWith('$STACK_PREFIX')
            ).map(s => s.StackName);
            console.log(stacks.join('\n'));
        }
    "
}

# 1. List and delete Cognito User Pools
echo "Listing Cognito User Pools..."
USER_POOLS=$(aws cognito-idp list-user-pools --max-results 60)
check_aws_command

# Delete pools with "predeploy" in name (case insensitive)
echo "$USER_POOLS" | parse_json "$USER_POOLS" "userPools" | while read -r pool_id; do
    if [ ! -z "$pool_id" ]; then
        echo "Deleting User Pool: $pool_id"
        aws cognito-idp delete-user-pool --user-pool-id "$pool_id"
        check_aws_command
    fi
done

# 2. List and delete CloudFormation stacks
echo "Listing CloudFormation stacks..."
STACKS=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE)
check_aws_command

# Delete stacks with our prefix
echo "$STACKS" | parse_json "$STACKS" "stacks" | while read -r stack_name; do
    if [ ! -z "$stack_name" ]; then
        echo "Deleting stack: $stack_name"
        aws cloudformation delete-stack --stack-name "$stack_name"
        check_aws_command
        
        echo "Waiting for stack deletion to complete..."
        aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
        check_aws_command
    fi
done

echo "Cleanup complete! Ready for redeployment." 