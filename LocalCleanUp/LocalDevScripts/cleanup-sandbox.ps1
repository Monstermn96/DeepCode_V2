# Cleanup Script for Sandbox Environment

Write-Host "Starting cleanup process for Sandbox environment..." -ForegroundColor Cyan

# Set variables
$REGION = "us-east-1"

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
$sandboxPools = $userPools.UserPools | Where-Object { 
    $_.Name -like "*sandbox*" -or 
    $_.Name -like "*Sandbox*" -or 
    ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*Development*") 
}

foreach ($pool in $sandboxPools) {
    Write-Host "Found sandbox User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
    $userResponse = Read-Host "Do you want to delete this User Pool? (y/n)"
    if ($userResponse -eq 'y') {
        Write-Host "Deleting User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
        aws cognito-idp delete-user-pool --user-pool-id $pool.Id
        Test-AwsCommand
    }
}

# 2. List and delete CloudFormation stacks
Write-Host "Listing CloudFormation stacks..." -ForegroundColor Yellow
$stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE | ConvertFrom-Json
$sandboxStacks = $stacks.StackSummaries | Where-Object { 
    $_.StackName -like "*sandbox*" -or 
    ($_.StackName -like "*amplify*" -and $_.StackName -like "*development*") 
}

foreach ($stack in $sandboxStacks) {
    Write-Host "Found sandbox stack: $($stack.StackName)" -ForegroundColor Yellow
    $userResponse = Read-Host "Do you want to delete this stack? (y/n)"
    if ($userResponse -eq 'y') {
        Write-Host "Deleting stack: $($stack.StackName)" -ForegroundColor Yellow
        aws cloudformation delete-stack --stack-name $stack.StackName
        Test-AwsCommand
        
        Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
        aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
        Test-AwsCommand
    }
}

# 3. Clean local sandbox-specific files
Write-Host "Cleaning local sandbox files..." -ForegroundColor Yellow

# Remove sandbox-specific build artifacts
if (Test-Path "amplify_outputs.json") {
    Remove-Item "amplify_outputs.json" -Force
}
if (Test-Path ".amplify") {
    Remove-Item ".amplify" -Recurse -Force
}

Write-Host "Verifying AWS configuration..." -ForegroundColor Yellow
aws sts get-caller-identity
Test-AwsCommand

Write-Host "Sandbox cleanup complete!" -ForegroundColor Green
Write-Host "
Next steps:
1. Run deploy-sandbox.ps1 to initialize your sandbox environment
2. Or run start-dev-server.ps1 if you want to use existing resources
" -ForegroundColor Cyan 