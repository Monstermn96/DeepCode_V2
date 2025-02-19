# Cleanup Script for Main Environment

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Starting cleanup process for Main environment..." -ForegroundColor Cyan
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
$STACK_PREFIX = "amplify-${APP_ID}-main-branch"

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

# Function to confirm dangerous operations
function Confirm-Action {
    param (
        [string]$Message
    )
    Write-Host "WARNING: $Message" -ForegroundColor Red
    Write-Host "This action cannot be undone!" -ForegroundColor Red
    $confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"
    return $confirmation -eq "yes"
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

# Only match pools that explicitly contain "main", "Main", or "Production" in the name
$mainPools = $userPools.UserPools | Where-Object { 
    ($_.Name -match "main|Main|Production") -and 
    $_.Name -notlike "*predeploy*" -and 
    $_.Name -notlike "*PreDeploy*" -and
    $_.Name -notlike "*sandbox*"
}

if ($mainPools) {
    Write-Host "Found Main/Production User Pools that would be deleted:" -ForegroundColor Red
    foreach ($pool in $mainPools) {
        Write-Host "- Pool Name: $($pool.Name)" -ForegroundColor Yellow
        Write-Host "  Pool ID: $($pool.Id)" -ForegroundColor Yellow
    }
    
    if (Confirm-Action "You are about to delete Main/Production User Pools") {
        foreach ($pool in $mainPools) {
            Write-Host "Deleting User Pool: $($pool.Name)..." -ForegroundColor Yellow
            aws cognito-idp delete-user-pool --user-pool-id $pool.Id
            Test-AwsCommand
            Write-Host "Pool deleted successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "User Pool deletion cancelled" -ForegroundColor Yellow
    }
} else {
    Write-Host "No Main/Production User Pools found" -ForegroundColor Yellow
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

# Match stacks that belong to main branch
$mainStacks = $stacks.StackSummaries | Where-Object { 
    $_.StackName -like "${STACK_PREFIX}*" -or 
    ($_.StackName -like "*main-branch*" -and $_.StackName -like "*${APP_ID}*")
} | Sort-Object StackName

if ($mainStacks) {
    Write-Host "Found Main branch stacks that would be deleted:" -ForegroundColor Red
    foreach ($stack in $mainStacks) {
        Write-Host "- Stack Name: $($stack.StackName)" -ForegroundColor Yellow
    }
    
    if (Confirm-Action "You are about to delete Main branch stacks") {
        # Delete nested stacks first
        $nestedStacks = $mainStacks | Where-Object { $_.StackName -like "*NestedStack*" }
        foreach ($stack in $nestedStacks) {
            Write-Host "Deleting nested stack: $($stack.StackName)" -ForegroundColor Yellow
            aws cloudformation delete-stack --stack-name $stack.StackName
            Test-AwsCommand
            Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
            aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
            Test-AwsCommand
            Write-Host "Stack deleted successfully" -ForegroundColor Green
        }

        # Delete remaining stacks
        $remainingStacks = $mainStacks | Where-Object { $_.StackName -notlike "*NestedStack*" }
        foreach ($stack in $remainingStacks) {
            Write-Host "Deleting stack: $($stack.StackName)" -ForegroundColor Yellow
            aws cloudformation delete-stack --stack-name $stack.StackName
            Test-AwsCommand
            Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
            aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
            Test-AwsCommand
            Write-Host "Stack deleted successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "Stack deletion cancelled" -ForegroundColor Yellow
    }
} else {
    Write-Host "No Main branch stacks found" -ForegroundColor Yellow
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