# Cleanup and Preparation Script for PreDeploy Environment

Write-Host "Starting cleanup process for PreDeploy environment..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "Environment Variables:" -ForegroundColor Yellow
Write-Host "AWS_APP_ID: $env:AWS_APP_ID" -ForegroundColor Yellow
Write-Host "AWS_BRANCH: $env:AWS_BRANCH" -ForegroundColor Yellow
Write-Host "AWS_REGION: $env:AWS_REGION" -ForegroundColor Yellow
Write-Host "FORCE_CLEANUP: $env:FORCE_CLEANUP" -ForegroundColor Yellow
Write-Host "NODE_VERSION: $env:NODE_VERSION" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Set variables from environment or defaults
$APP_ID = if ($env:AWS_APP_ID) { $env:AWS_APP_ID } else { "d17nr8d8s58ya5" }
$BRANCH = if ($env:AWS_BRANCH) { $env:AWS_BRANCH } else { "PreDeploy" }
$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$ROOT_STACK_PREFIX = "amplify-${APP_ID}-${BRANCH}"

# Function to check if AWS CLI command was successful
function Test-AwsCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AWS command failed. Stopping script." -ForegroundColor Red
        exit 1
    }
}

# Verify AWS credentials
Write-Host "Verifying AWS credentials..." -ForegroundColor Yellow
aws sts get-caller-identity
Test-AwsCommand

# List and find the root stack
Write-Host "Finding root stack..." -ForegroundColor Yellow
$stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE | ConvertFrom-Json
Test-AwsCommand

$rootStack = $stacks.StackSummaries | Where-Object { 
    $_.StackName -like "${ROOT_STACK_PREFIX}*" -and 
    $_.StackName -notlike "*-authstack-*" -and 
    $_.StackName -notlike "*-apistack-*" -and 
    $_.StackName -notlike "*-storagestack-*"
} | Select-Object -First 1

if ($rootStack) {
    Write-Host "Found root stack: $($rootStack.StackName)" -ForegroundColor Green
    
    # Delete the root stack (this will trigger deletion of all nested stacks)
    Write-Host "Deleting root stack and all nested resources..." -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name $rootStack.StackName
    Test-AwsCommand
    
    Write-Host "Waiting for root stack deletion to complete (this may take several minutes)..." -ForegroundColor Yellow
    aws cloudformation wait stack-delete-complete --stack-name $rootStack.StackName
    Test-AwsCommand
    
    Write-Host "Stack deletion completed successfully!" -ForegroundColor Green
} else {
    Write-Host "No existing root stack found for branch $BRANCH" -ForegroundColor Yellow
}

# Clean local environment
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

Write-Host "Cleanup complete! Your environment is ready for redeployment." -ForegroundColor Green
Write-Host "
Next steps:
1. Commit and push your changes to the PreDeploy branch
2. The Amplify pipeline will automatically start the redeployment
3. Monitor the deployment in the Amplify Console: https://console.aws.amazon.com/amplify/home?region=${REGION}#/${APP_ID}
" -ForegroundColor Cyan 