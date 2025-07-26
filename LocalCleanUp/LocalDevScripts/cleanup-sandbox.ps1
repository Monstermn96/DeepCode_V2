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

# Function to stop local development server if running
function Stop-LocalServer {
    Write-Host "Checking for running development servers..." -ForegroundColor Yellow
    
    # Kill any processes using common dev ports
    $ports = @(3000, 5173, 20002)
    foreach ($port in $ports) {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        foreach ($processId in $processes) {
            if ($processId) {
                Write-Host "Stopping process on port $port (PID: $processId)..." -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    Write-Host "Local server cleanup completed!" -ForegroundColor Green
}

Write-Host "Scanning for resources to clean up..." -ForegroundColor Yellow

# 1. List Cognito User Pools
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
$sandboxPools = $userPools.UserPools | Where-Object { 
    $_.Name -like "*sandbox*" -or 
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

Write-Host "Local Development:" -ForegroundColor Yellow
Write-Host "- Stop any running dev servers on ports 3000, 5173, 20002" -ForegroundColor White

Write-Host "`nCognito User Pools:" -ForegroundColor Yellow
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
Write-Host "- Build artifacts and temporary files" -ForegroundColor White
Write-Host "- Stop running development servers" -ForegroundColor White

# Ask for confirmation
$userResponse = Read-Host "`nDo you want to delete all these resources? (y/n)"
if ($userResponse -eq 'y') {
    # Stop local development servers first
    Stop-LocalServer
    
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

    $filesToRemove = @(
        "amplify_outputs.json",
        ".amplify",
        "dist",
        "node_modules/.cache"
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

    Write-Host "`nSandbox cleanup complete!" -ForegroundColor Green
    Write-Host "
Next steps:
1. Run deploy-sandbox.ps1 to create a new sandbox environment
" -ForegroundColor Cyan 
} else {
    Write-Host "`nCleanup cancelled by user." -ForegroundColor Yellow
} 