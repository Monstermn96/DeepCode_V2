#!/bin/bash

echo "Starting cleanup process for PreDeploy environment..."
echo "----------------------------------------"
echo "Environment Variables:"
echo "AWS_APP_ID: $AWS_APP_ID"
echo "AWS_BRANCH: $AWS_BRANCH"
echo "AWS_REGION: $AWS_REGION"
echo "FORCE_CLEANUP: $FORCE_CLEANUP"
echo "NODE_VERSION: $NODE_VERSION"
echo "----------------------------------------"

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

echo "Checking AWS credentials..."
aws sts get-caller-identity > /dev/null
check_aws_command

# 1. List and delete Cognito User Pools
echo "Listing Cognito User Pools..."
USER_POOLS=$(aws cognito-idp list-user-pools --max-results 60)
check_aws_command

echo "Found User Pools:"
echo "$USER_POOLS" | jq -r '.UserPools[] | "- \(.Name) (\(.Id))"'
echo "----------------------------------------"

POOL_IDS=$(echo "$USER_POOLS" | jq -r '.UserPools[] | select(.Name | ascii_downcase | contains("predeploy")) | .Id')

if [ -n "$POOL_IDS" ]; then
    echo "Found PreDeploy User Pools to delete:"
    echo "$POOL_IDS" | while read -r pool_id; do
        if [ -n "$pool_id" ]; then
            echo "Deleting User Pool: $pool_id"
            aws cognito-idp delete-user-pool --user-pool-id "$pool_id"
            check_aws_command
            echo "Pool deleted successfully"
        fi
    done
else
    echo "No PreDeploy User Pools found"
fi

# 2. List and delete CloudFormation stacks
echo "Listing CloudFormation stacks..."
STACKS=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE UPDATE_ROLLBACK_COMPLETE)
check_aws_command

echo "Found Stacks:"
echo "$STACKS" | jq -r '.StackSummaries[] | "- \(.StackName)"'
echo "----------------------------------------"

STACK_NAMES=$(echo "$STACKS" | jq -r ".StackSummaries[] | select(.StackName | startswith(\"$STACK_PREFIX\")) | .StackName")

if [ -n "$STACK_NAMES" ]; then
    echo "Found PreDeploy stacks to delete:"
    echo "$STACK_NAMES" | while read -r stack_name; do
        if [ -n "$stack_name" ]; then
            echo "Deleting stack: $stack_name"
            aws cloudformation delete-stack --stack-name "$stack_name"
            check_aws_command
            
            echo "Waiting for stack deletion to complete..."
            aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
            check_aws_command
            echo "Stack deleted successfully"
        fi
    done
else
    echo "No PreDeploy stacks found"
fi

# 3. Clean local Amplify state
echo "Cleaning local Amplify state..."
rm -rf amplify_outputs.json .amplify dist || true

echo "Cleanup complete! Ready for redeployment." 