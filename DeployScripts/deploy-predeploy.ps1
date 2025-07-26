# Deploy PreDeploy Environment Script

Write-Host "Starting PreDeploy deployment process..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

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

# Function to update environment variables
function Update-EnvFile {
    param (
        [string]$PoolId,
        [string]$ClientId
    )
    Write-Host "Creating/Updating .env file..." -ForegroundColor Yellow
    
    $envContent = @"
VITE_AMPLIFY_ENV=Predeploy
VITE_AUTH_USER_POOL_ID=$PoolId
VITE_AUTH_USER_POOL_CLIENT_ID=$ClientId
NODE_ENV=staging
AMPLIFY_ENV=staging
AMPLIFY_BACKEND_POOL_NAME=DeepDevAi-PreDeploy
AMPLIFY_BACKEND_PASSWORD_MIN_LENGTH=8
AMPLIFY_BACKEND_PASSWORD_REQUIRE_LOWERCASE=true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_NUMBERS=true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_SPECIAL=true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_UPPERCASE=true
FORCE_CLEANUP=false
"@

    Set-Content -Path ".env" -Value $envContent
    Write-Host "Environment variables updated successfully!" -ForegroundColor Green
}

# Verify AWS credentials
if (-not (Test-AwsCredentials)) {
    Write-Host "Please configure your AWS credentials and try again." -ForegroundColor Red
    exit 1
}

# Ensure we're in the right directory
Set-Location -Path $PSScriptRoot\..

# Clean existing artifacts
Write-Host "Cleaning existing artifacts..." -ForegroundColor Yellow
Remove-Item -Path amplify_outputs.json -Force -ErrorAction SilentlyContinue
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the application locally first
Write-Host "Building application locally..." -ForegroundColor Yellow
$env:NODE_ENV = "staging"
$env:VITE_AMPLIFY_ENV = "predeploy"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

# Deploy to PreDeploy branch using Amplify CLI
Write-Host "Deploying to PreDeploy branch..." -ForegroundColor Yellow

# First, check if the branch exists in Amplify
$branches = aws amplify list-branches --app-id $APP_ID | ConvertFrom-Json
$predeployBranch = $branches.branches | Where-Object { $_.branchName -eq $BRANCH }

if (-not $predeployBranch) {
    Write-Host "Creating PreDeploy branch in Amplify..." -ForegroundColor Yellow
    aws amplify create-branch --app-id $APP_ID --branch-name $BRANCH --stage BETA
    Test-AwsCommand
}

# Push current code to the branch and trigger deployment
Write-Host "Pushing code to PreDeploy branch..." -ForegroundColor Yellow
git add .
git commit -m "Automated deployment to PreDeploy" -ErrorAction SilentlyContinue
git push origin PreDeploy
Test-AwsCommand

# Start a new deployment job
Write-Host "Starting deployment job..." -ForegroundColor Yellow
$deployment = aws amplify start-deployment --app-id $APP_ID --branch-name $BRANCH | ConvertFrom-Json
$jobId = $deployment.jobSummary.jobId

Write-Host "Deployment job started with ID: $jobId" -ForegroundColor Green
Write-Host "Monitoring deployment status..." -ForegroundColor Yellow

# Monitor deployment status
$maxAttempts = 60  # 10 minutes max wait
$attempt = 0
$deploymentComplete = $false

while ($attempt -lt $maxAttempts -and -not $deploymentComplete) {
    Start-Sleep -Seconds 10
    $job = aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $jobId | ConvertFrom-Json
    $status = $job.job.summary.status
    
    Write-Host "[$attempt/$maxAttempts] Deployment status: $status" -ForegroundColor Yellow
    
    if ($status -eq "SUCCEED") {
        $deploymentComplete = $true
        Write-Host "Deployment completed successfully!" -ForegroundColor Green
    } elseif ($status -eq "FAILED" -or $status -eq "CANCELLED") {
        Write-Host "Deployment failed with status: $status" -ForegroundColor Red
        exit 1
    }
    
    $attempt++
}

if (-not $deploymentComplete) {
    Write-Host "Deployment timed out" -ForegroundColor Red
    exit 1
}

# Get Cognito User Pool details
Write-Host "Retrieving Cognito User Pool details..." -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
$currentPool = $userPools.UserPools | Where-Object { 
    $_.Name -like "*predeploy*" -or 
    ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*PreDeploy*")
} | Sort-Object CreationDate -Descending | Select-Object -First 1

if ($currentPool) {
    $clients = aws cognito-idp list-user-pool-clients --user-pool-id $currentPool.Id | ConvertFrom-Json
    $client = $clients.UserPoolClients[0]

    if ($client) {
        Update-EnvFile -PoolId $currentPool.Id -ClientId $client.ClientId
    }
}

# Get the deployed URL
$app = aws amplify get-app --app-id $APP_ID | ConvertFrom-Json
$deployedUrl = "https://$BRANCH.$($app.app.defaultDomain)"

Write-Host "
PreDeploy environment deployed successfully!
----------------------------------------
- Application deployed to: $deployedUrl
- AWS resources have been provisioned
- Environment variables have been configured
- Branch: $BRANCH
- App ID: $APP_ID

To clean up this environment:
1. Run cleanup-predeploy.ps1
" -ForegroundColor Green 