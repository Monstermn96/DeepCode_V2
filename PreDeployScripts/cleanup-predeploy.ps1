# Cleanup Script for PreDeploy Environment

Write-Host "Starting cleanup process for PreDeploy environment..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Set variables
$APP_ID = "d17nr8d8s58ya5"
$BRANCH = "PreDeploy"
$REGION = "us-east-1"
$ECR_REPO = "deepdevai-predeploy"

# Function to check if AWS CLI command was successful
function Test-AwsCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AWS command failed. Stopping script." -ForegroundColor Red
        exit 1
    }
}

# Function to verify AWS credentials
function Test-AwsCredentials {
    try {
        Write-Host "Verifying AWS credentials..." -ForegroundColor Yellow
        $identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Host "Using AWS Account: $($identity.Account)" -ForegroundColor Green
        Write-Host "Using IAM User: $($identity.Arn)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "AWS credentials verification failed" -ForegroundColor Red
        return $false
    }
}

Write-Host "Scanning for resources to clean up..." -ForegroundColor Yellow

# Verify AWS credentials
if (-not (Test-AwsCredentials)) {
    Write-Host "Please configure your AWS credentials and try again." -ForegroundColor Red
    exit 1
}

# 1. List Cognito User Pools
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
$predeployPools = $userPools.UserPools | Where-Object { 
    $_.Name -like "*predeploy*" -or 
    ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*PreDeploy*")
}

# 2. List CloudFormation stacks
$stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE | ConvertFrom-Json
$predeployStacks = $stacks.StackSummaries | Where-Object { 
    ($_.StackName -like "*predeploy*") -or 
    ($_.StackName -like "*amplify*" -and $_.StackName -like "*predeploy*") -or
    ($_.StackName -like "*amplify-$APP_ID*" -and $_.StackName -like "*predeploy*")
}

# Display all resources that will be deleted
Write-Host "`nResources to be deleted:" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

Write-Host "Docker/ECR Resources:" -ForegroundColor Yellow
Write-Host "- ECR Repository: $ECR_REPO" -ForegroundColor White

Write-Host "`nCognito User Pools:" -ForegroundColor Yellow
if ($predeployPools) {
    foreach ($pool in $predeployPools) {
        Write-Host "- $($pool.Name) ($($pool.Id))" -ForegroundColor White
    }
} else {
    Write-Host "- No User Pools found" -ForegroundColor White
}

Write-Host "`nCloudFormation Stacks:" -ForegroundColor Yellow
if ($predeployStacks) {
    foreach ($stack in $predeployStacks) {
        Write-Host "- $($stack.StackName)" -ForegroundColor White
    }
} else {
    Write-Host "- No Stacks found" -ForegroundColor White
}

Write-Host "`nLocal Resources to Clean:" -ForegroundColor Yellow
Write-Host "- Build artifacts and environment files" -ForegroundColor White
Write-Host "- Docker images" -ForegroundColor White

# Ask for confirmation
$userResponse = Read-Host "`nDo you want to delete all these resources? (y/n)"
if ($userResponse -eq 'y') {
    # Clean up ECR repository
    Write-Host "Cleaning up ECR repository..." -ForegroundColor Yellow
    aws ecr delete-repository --repository-name $ECR_REPO --force 2>$null
    
    # Delete User Pools
    foreach ($pool in $predeployPools) {
        Write-Host "Deleting User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
        aws cognito-idp delete-user-pool --user-pool-id $pool.Id
        Test-AwsCommand
    }

    # Delete CloudFormation stacks
    foreach ($stack in $predeployStacks) {
        Write-Host "Deleting stack: $($stack.StackName)" -ForegroundColor Yellow
        aws cloudformation delete-stack --stack-name $stack.StackName
        Test-AwsCommand
        
        Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
        aws cloudformation wait stack-delete-complete --stack-name $stack.StackName
        Test-AwsCommand
    }

    # Clean local sandbox-specific files
    Write-Host "Cleaning local files..." -ForegroundColor Yellow

    $filesToRemove = @(
        "amplify_outputs.json",
        ".amplify",
        "dist",
        ".env",
        "docker-compose.override.yml"
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

    # Clean up Docker images
    Write-Host "Cleaning up Docker images..." -ForegroundColor Yellow
    docker rmi amplify-predeploy -f 2>$null
    $ecrUri = "$($identity.Account).dkr.ecr.$REGION.amazonaws.com/$ECR_REPO"
    docker rmi $ecrUri`:latest -f 2>$null

    Write-Host "`nPreDeploy cleanup complete!" -ForegroundColor Green
    Write-Host "
Next steps:
1. Run deploy-predeploy.ps1 to create a new PreDeploy environment
" -ForegroundColor Cyan 
} else {
    Write-Host "`nCleanup cancelled by user." -ForegroundColor Yellow
} 