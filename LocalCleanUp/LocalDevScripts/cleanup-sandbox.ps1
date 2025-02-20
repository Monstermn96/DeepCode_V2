# Cleanup Script for Sandbox Environment

Write-Host "Starting cleanup process for Sandbox environment..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Set variables
$REGION = "us-east-1"
$APP_ID = "d17nr8d8s58ya5"

# Function to check if AWS CLI command was successful
function Test-AwsCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AWS command failed. Stopping script." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Scanning for resources to clean up..." -ForegroundColor Yellow

# 1. List Cognito User Pools
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
$sandboxPools = $userPools.UserPools | Where-Object { 
    $_.Name -like "*sandbox*" -or 
    $_.Name -like "*Sandbox*" -or 
    ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*Development*") 
}

# 2. List CloudFormation stacks
$stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE | ConvertFrom-Json
$sandboxStacks = $stacks.StackSummaries | Where-Object { 
    ($_.StackName -like "*sandbox*") -or 
    ($_.StackName -like "*amplify*" -and $_.StackName -like "*development*") -or
    ($_.StackName -like "*amplify-$APP_ID*" -and $_.StackName -like "*sandbox*")
}

# Display all resources that will be deleted
Write-Host "`nResources to be deleted:" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "Cognito User Pools:" -ForegroundColor Yellow
if ($sandboxPools) {
    foreach ($pool in $sandboxPools) {
        Write-Host "- $($pool.Name) ($($pool.Id))" -ForegroundColor White
    }
} else {
    Write-Host "- No User Pools found" -ForegroundColor White
}

Write-Host "`nCloudFormation Stacks:" -ForegroundColor Yellow
if ($sandboxStacks) {
    foreach ($stack in $sandboxStacks) {
        Write-Host "- $($stack.StackName)" -ForegroundColor White
    }
} else {
    Write-Host "- No Stacks found" -ForegroundColor White
}

Write-Host "`nLocal Resources to Clean:" -ForegroundColor Yellow
Write-Host "- Frontend node_modules" -ForegroundColor White
Write-Host "- Backend (amplify) node_modules" -ForegroundColor White
Write-Host "- Build artifacts and environment files" -ForegroundColor White

# Ask for single confirmation
$userResponse = Read-Host "`nDo you want to delete all these resources? (y/n)"
if ($userResponse -eq 'y') {
    # Delete User Pools
    foreach ($pool in $sandboxPools) {
        Write-Host "Deleting User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
        aws cognito-idp delete-user-pool --user-pool-id $pool.Id
        Test-AwsCommand
    }

    # Delete CloudFormation stacks
    foreach ($stack in $sandboxStacks) {
        Write-Host "Deleting stack: $($stack.StackName)" -ForegroundColor Yellow
        aws cloudformation delete-stack --stack-name $stack.StackName
        Test-AwsCommand
        
        Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
        aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
        Test-AwsCommand
    }

    # Clean local sandbox-specific files
    Write-Host "Cleaning local sandbox files..." -ForegroundColor Yellow

    # Remove sandbox-specific build artifacts and dependencies
    $filesToRemove = @(
        "amplify_outputs.json",
        ".amplify",
        "node_modules",
        "amplify/node_modules",
        "dist",
        ".env",
        "package-lock.json",
        "amplify/package-lock.json"
    )

    foreach ($file in $filesToRemove) {
        if (Test-Path $file) {
            Write-Host "Removing $file..." -ForegroundColor Yellow
            if (Test-Path $file -PathType Container) {
                Remove-Item $file -Recurse -Force -ErrorAction SilentlyContinue
            } else {
                Remove-Item $file -Force -ErrorAction SilentlyContinue
            }
            Write-Host "Removed: $file" -ForegroundColor Green
        }
    }

    # Clean npm cache
    Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
    npm cache clean --force

    Write-Host "Verifying AWS configuration..." -ForegroundColor Yellow
    aws sts get-caller-identity
    Test-AwsCommand

    Write-Host "`nSandbox cleanup complete!" -ForegroundColor Green
} else {
    Write-Host "`nCleanup cancelled by user." -ForegroundColor Yellow
}

Write-Host "
Next steps:
1. Run deploy-sandbox.ps1 to initialize your sandbox environment
2. Or run start-dev-server.ps1 if you want to use existing resources
" -ForegroundColor Cyan 