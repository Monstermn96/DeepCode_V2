# Cleanup Script for Local Development Environment

Write-Host "Starting cleanup process for Local Development environment..." -ForegroundColor Cyan

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
$localPools = $userPools.UserPools | Where-Object { $_.Name -like "*development*" -or $_.Name -like "*Development*" }

foreach ($pool in $localPools) {
    Write-Host "Deleting User Pool: $($pool.Name) ($($pool.Id))" -ForegroundColor Yellow
    aws cognito-idp delete-user-pool --user-pool-id $pool.Id
    Test-AwsCommand
}

# 2. Clean local environment
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

# 3. Verify AWS credentials and configuration
Write-Host "Verifying AWS configuration..." -ForegroundColor Yellow
aws sts get-caller-identity
Test-AwsCommand

Write-Host "Cleanup complete! Your local development environment is ready." -ForegroundColor Green
Write-Host "
Next steps:
1. Run start-local.ps1 to initialize your local development environment
2. Start coding!
" -ForegroundColor Cyan 