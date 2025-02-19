# Cleanup Script for PreDeploy Environment

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Starting cleanup process for PreDeploy environment..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Log environment variables
Write-Host "Environment Variables:" -ForegroundColor Yellow
Write-Host "AWS_APP_ID: $env:AWS_APP_ID" -ForegroundColor Yellow
Write-Host "AWS_BRANCH: $env:AWS_BRANCH" -ForegroundColor Yellow
Write-Host "AWS_REGION: $env:AWS_REGION" -ForegroundColor Yellow
Write-Host "FORCE_CLEANUP: $env:FORCE_CLEANUP" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Set variables from environment
$APP_ID = $env:AWS_APP_ID
$BRANCH = $env:AWS_BRANCH
$REGION = $env:AWS_REGION
$STACK_PREFIX = "amplify-${APP_ID}-predeploy"

Write-Host "Using configuration:" -ForegroundColor Yellow
Write-Host "Stack Prefix: $STACK_PREFIX" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Function to check if AWS CLI command was successful
function Test-AwsCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AWS command failed. Stopping script." -ForegroundColor Red
        exit 1
    }
}

# 1. List and delete Cognito User Pools
Write-Host "Listing Cognito User Pools..." -ForegroundColor Yellow
$userPoolsJson = aws cognito-idp list-user-pools --max-results 60
Test-AwsCommand
$userPools = $userPoolsJson | ConvertFrom-Json

Write-Host "Found User Pools:" -ForegroundColor Green
foreach ($pool in $userPools.UserPools) {
    Write-Host "- $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
}
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Only match pools that explicitly contain "predeploy" or "PreDeploy" in the name
$predeployPools = $userPools.UserPools | Where-Object { 
    $_.Name -match "predeploy|PreDeploy" -and 
    $_.Name -notlike "*Production*" -and 
    $_.Name -notlike "*Main*"
}

if ($predeployPools) {
    Write-Host "Found PreDeploy User Pools to delete:" -ForegroundColor Green
    foreach ($pool in $predeployPools) {
        Write-Host "- Pool Name: $($pool.Name)" -ForegroundColor Yellow
        Write-Host "  Pool ID: $($pool.Id)" -ForegroundColor Yellow
        Write-Host "Deleting User Pool..." -ForegroundColor Yellow
        aws cognito-idp delete-user-pool --user-pool-id $pool.Id
        Test-AwsCommand
        Write-Host "Pool deleted successfully" -ForegroundColor Green
    }
} else {
    Write-Host "No PreDeploy User Pools found" -ForegroundColor Yellow
}

# 2. List and delete CloudFormation stacks
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Listing CloudFormation stacks..." -ForegroundColor Yellow
$stacksJson = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE UPDATE_ROLLBACK_COMPLETE
Test-AwsCommand
$stacks = $stacksJson | ConvertFrom-Json

Write-Host "Found Stacks:" -ForegroundColor Green
foreach ($stack in $stacks.StackSummaries) {
    Write-Host "- $($stack.StackName)" -ForegroundColor Yellow
}
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Only match stacks that explicitly contain "predeploy" in the name
$predeployStacks = $stacks.StackSummaries | Where-Object { 
    $_.StackName -like "${STACK_PREFIX}*" -or 
    ($_.StackName -like "*predeploy*" -and $_.StackName -like "*${APP_ID}*")
}

if ($predeployStacks) {
    Write-Host "Found PreDeploy stacks to delete:" -ForegroundColor Green
    foreach ($stack in $predeployStacks) {
        Write-Host "- Stack Name: $($stack.StackName)" -ForegroundColor Yellow
        Write-Host "Deleting stack..." -ForegroundColor Yellow
        aws cloudformation delete-stack --stack-name $stack.StackName
        Test-AwsCommand
        
        Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
        aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
        Test-AwsCommand
        Write-Host "Stack deleted successfully" -ForegroundColor Green
    }
} else {
    Write-Host "No PreDeploy stacks found" -ForegroundColor Yellow
}

# 3. Clean local environment
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Cleaning local environment..." -ForegroundColor Yellow

# Remove build artifacts
if (Test-Path "amplify_outputs.json") {
    Remove-Item "amplify_outputs.json" -Force
    Write-Host "Removed amplify_outputs.json" -ForegroundColor Yellow
}
if (Test-Path ".amplify") {
    Remove-Item ".amplify" -Recurse -Force
    Write-Host "Removed .amplify directory" -ForegroundColor Yellow
}
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
    Write-Host "Removed dist directory" -ForegroundColor Yellow
}

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. New resources will be created during the next build" -ForegroundColor Cyan
Write-Host "2. The build will fail with new resource IDs" -ForegroundColor Cyan
Write-Host "3. Update the Amplify environment variables with the new IDs" -ForegroundColor Cyan
Write-Host "4. Trigger a new build" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan 