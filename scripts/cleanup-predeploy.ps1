# Cleanup Script for PreDeploy Environment

Write-Host "Starting cleanup process for PreDeploy environment..." -ForegroundColor Cyan

# Set variables
$APP_ID = $env:AWS_APP_ID
$BRANCH = $env:AWS_BRANCH
$REGION = $env:AWS_REGION
$STACK_PREFIX = "amplify-${APP_ID}-predeploy"

# Function to check if AWS CLI command was successful
function Test-AwsCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AWS command failed. Stopping script." -ForegroundColor Red
        exit 1
    }
}

# 1. List and delete Cognito User Pools
Write-Host "Listing Cognito User Pools..." -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
Test-AwsCommand

$predeployPools = $userPools.UserPools | Where-Object { $_.Name -like "*predeploy*" -or $_.Name -like "*PreDeploy*" }

foreach ($pool in $predeployPools) {
    Write-Host "Deleting User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
    aws cognito-idp delete-user-pool --user-pool-id $pool.Id
    Test-AwsCommand
}

# 2. List and delete CloudFormation stacks
Write-Host "Listing CloudFormation stacks..." -ForegroundColor Yellow
$stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE | ConvertFrom-Json
Test-AwsCommand

$predeployStacks = $stacks.StackSummaries | Where-Object { $_.StackName -like "${STACK_PREFIX}*" }

foreach ($stack in $predeployStacks) {
    Write-Host "Deleting stack: $($stack.StackName)" -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name $stack.StackName
    Test-AwsCommand
    
    Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
    aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
    Test-AwsCommand
}

Write-Host "Cleanup complete! Ready for redeployment." -ForegroundColor Green 