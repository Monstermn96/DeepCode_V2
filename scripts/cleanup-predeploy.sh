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

# Function to parse JSON and filter resources
parse_aws_resources() {
    node -e "
        try {
            const input = process.argv[1];
            if (!input) {
                console.error('No input provided');
                process.exit(1);
            }
            const data = JSON.parse(input);
            const type = process.argv[2];
            
            if (type === 'userPools' && data.UserPools) {
                const pools = data.UserPools
                    .filter(p => p.Name && p.Name.toLowerCase().includes('predeploy'))
                    .map(p => p.Id);
                console.log(pools.join('\\n'));
            } 
            else if (type === 'stacks' && data.StackSummaries) {
                const prefix = '${STACK_PREFIX}';
                const stacks = data.StackSummaries
                    .filter(s => s.StackName && s.StackName.startsWith(prefix))
                    .map(s => s.StackName);
                console.log(stacks.join('\\n'));
            }
        } catch (error) {
            console.error('Error parsing:', error.message);
            process.exit(1);
        }
    "
}

echo "Checking AWS credentials..."
aws sts get-caller-identity > /dev/null
check_aws_command

# 1. List and delete Cognito User Pools
echo "Listing Cognito User Pools..."
USER_POOLS=$(aws cognito-idp list-user-pools --max-results 60 --output json)
check_aws_command

if [ -n "$USER_POOLS" ]; then
    POOL_IDS=$(echo "$USER_POOLS" | parse_aws_resources "$USER_POOLS" "userPools")
    if [ -n "$POOL_IDS" ]; then
        echo "Found User Pools to delete:"
        echo "$POOL_IDS"
        echo "$POOL_IDS" | while read -r pool_id; do
            if [ -n "$pool_id" ]; then
                echo "Deleting User Pool: $pool_id"
                aws cognito-idp delete-user-pool --user-pool-id "$pool_id"
                check_aws_command
            fi
        done
    else
        echo "No PreDeploy User Pools found"
    fi
else
    echo "No User Pools found"
fi

# 2. List and delete CloudFormation stacks
echo "Listing CloudFormation stacks..."
STACKS=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE UPDATE_ROLLBACK_COMPLETE --output json)
check_aws_command

if [ -n "$STACKS" ]; then
    STACK_NAMES=$(echo "$STACKS" | parse_aws_resources "$STACKS" "stacks")
    if [ -n "$STACK_NAMES" ]; then
        echo "Found stacks to delete:"
        echo "$STACK_NAMES"
        echo "$STACK_NAMES" | while read -r stack_name; do
            if [ -n "$stack_name" ]; then
                echo "Deleting stack: $stack_name"
                aws cloudformation delete-stack --stack-name "$stack_name"
                check_aws_command
                
                echo "Waiting for stack deletion to complete..."
                aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
                check_aws_command
            fi
        done
    else
        echo "No PreDeploy stacks found"
    fi
else
    echo "No stacks found"
fi

# 3. Clean local Amplify state
echo "Cleaning local Amplify state..."
rm -rf amplify_outputs.json .amplify dist || true

echo "Cleanup complete! Ready for redeployment." 