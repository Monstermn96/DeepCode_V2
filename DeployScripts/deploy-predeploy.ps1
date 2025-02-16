# Deployment Script for PreDeploy Environment
Write-Host "Starting deployment process for PreDeploy environment..." -ForegroundColor Cyan

# Set variables
$APP_ID = "d17nr8d8s58ya5"
$BRANCH = "PreDeploy"
$REGION = "us-east-1"

# Function to check if AWS CLI command was successful
function Test-AwsCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "AWS command failed. Stopping script." -ForegroundColor Red
        exit 1
    }
}

# 1. Verify AWS credentials
Write-Host "Verifying AWS credentials..." -ForegroundColor Yellow
aws sts get-caller-identity
Test-AwsCommand

# 2. Set required environment variables
Write-Host "Setting deployment environment variables..." -ForegroundColor Yellow
$env:AWS_APP_ID = $APP_ID
$env:AWS_BRANCH = $BRANCH
$env:AMPLIFY_ENV = "staging"
$env:CI = "1"  # Required to run pipeline-deploy locally

# 3. Verify branch exists in Amplify
Write-Host "Verifying branch exists in Amplify..." -ForegroundColor Yellow
$branchInfo = aws amplify get-branch --app-id $APP_ID --branch-name $BRANCH | ConvertFrom-Json
if (-not $branchInfo) {
    Write-Host "Branch does not exist. Creating branch..." -ForegroundColor Yellow
    aws amplify create-branch --app-id $APP_ID --branch-name $BRANCH --framework "Next.js - SSR" --stage PRODUCTION
    Test-AwsCommand
}

# 4. Clean build artifacts
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
if (Test-Path "amplify_outputs.json") {
    Remove-Item "amplify_outputs.json" -Force
}
if (Test-Path ".amplify") {
    Remove-Item ".amplify" -Recurse -Force
}
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
}

# 5. Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Test-AwsCommand
}

# 6. Run the deployment
Write-Host "Starting deployment..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    npx ampx pipeline-deploy --branch $BRANCH --app-id $APP_ID
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "
Deployment complete! Next steps:
1. Check the deployment status in Amplify Console: https://console.aws.amazon.com/amplify/home?region=${REGION}#/${APP_ID}
2. Once backend is deployed, update your environment variables in the Amplify Console with the new User Pool details
3. Monitor the frontend build progress in the Amplify Console
" -ForegroundColor Cyan 