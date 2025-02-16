# Cleanup and Preparation Script for PreDeploy Environment
Write-Host "Starting cleanup process for PreDeploy environment..." -ForegroundColor Cyan

# Set variables
$APP_ID = "d17nr8d8s58ya5"
$BRANCH = "PreDeploy"
$REGION = "us-east-1"
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
$predeployPools = $userPools.UserPools | Where-Object { $_.Name -like "*predeploy*" -or $_.Name -like "*PreDeploy*" }

foreach ($pool in $predeployPools) {
    Write-Host "Deleting User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
    aws cognito-idp delete-user-pool --user-pool-id $pool.Id
    Test-AwsCommand
}

# 2. List and delete CloudFormation stacks
Write-Host "Listing CloudFormation stacks..." -ForegroundColor Yellow
$stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE | ConvertFrom-Json
$predeployStacks = $stacks.StackSummaries | Where-Object { $_.StackName -like "${STACK_PREFIX}*" }

foreach ($stack in $predeployStacks) {
    Write-Host "Deleting stack: $($stack.StackName)" -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name $stack.StackName
    Test-AwsCommand
    
    Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
    aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
    Test-AwsCommand
}

# 3. Clean local environment
Write-Host "Cleaning local environment..." -ForegroundColor Yellow

# Remove build artifacts
if (Test-Path "amplify_outputs.json") {
    Remove-Item "amplify_outputs.json" -Force
}
if (Test-Path ".amplify") {
    Remove-Item ".amplify" -Recurse -Force
}
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
}

# Clean npm
Write-Host "Cleaning npm..." -ForegroundColor Yellow
npm cache clean --force
Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall dependencies
Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
npm install

# 4. Verify AWS credentials and configuration
Write-Host "Verifying AWS configuration..." -ForegroundColor Yellow
aws sts get-caller-identity
Test-AwsCommand

Write-Host "Cleanup complete! Your environment is ready for redeployment." -ForegroundColor Green
Write-Host "
Next steps:
1. Commit and push your changes to the PreDeploy branch
2. The Amplify pipeline will automatically start the redeployment
3. Monitor the deployment in the Amplify Console: https://console.aws.amazon.com/amplify/home?region=${REGION}#/${APP_ID}
" -ForegroundColor Cyan 