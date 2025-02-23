# Deploy Sandbox Environment Script with Docker Support

Write-Host "Starting sandbox deployment process..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Function to log errors with details
function Write-ErrorLog {
    param (
        [string]$ErrorMessage,
        [string]$Stage,
        $ErrorDetails
    )
    Write-Host "`nERROR during $Stage" -ForegroundColor Red
    Write-Host "----------------------------------------" -ForegroundColor Red
    Write-Host "Error Message: $ErrorMessage" -ForegroundColor Red
    if ($ErrorDetails) {
        Write-Host "Error Details:" -ForegroundColor Red
        Write-Host ($ErrorDetails | ConvertTo-Json -Depth 3) -ForegroundColor Red
    }
    Write-Host "----------------------------------------" -ForegroundColor Red
}

# Function to update environment variables
function Update-EnvFile {
    param (
        [string]$PoolId,
        [string]$ClientId
    )
    Write-Host "Creating/Updating .env file..." -ForegroundColor Yellow
    
    $envContent = @"
VITE_AMPLIFY_ENV=development
VITE_AUTH_USER_POOL_ID=$PoolId
VITE_AUTH_USER_POOL_CLIENT_ID=$ClientId
NODE_ENV=development
AMPLIFY_ENV=dev
AMPLIFY_BACKEND_POOL_NAME=DeepDevAi-Sandbox
AMPLIFY_BACKEND_PASSWORD_MIN_LENGTH=8
AMPLIFY_BACKEND_PASSWORD_REQUIRE_LOWERCASE=true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_NUMBERS=true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_SPECIAL=true
AMPLIFY_BACKEND_PASSWORD_REQUIRE_UPPERCASE=true
"@

    Set-Content -Path ".env" -Value $envContent
    Write-Host "Environment variables updated successfully!" -ForegroundColor Green
}

# Function to verify Docker installation
function Test-DockerInstallation {
    try {
        Write-Host "Verifying Docker installation..." -ForegroundColor Yellow
        $dockerVersion = docker --version
        Write-Host "Docker version: $dockerVersion" -ForegroundColor Green
        return $true
    } catch {
        Write-ErrorLog -ErrorMessage "Docker is not installed or not running" -Stage "Docker Verification" -ErrorDetails $_
        Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        return $false
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
        Write-ErrorLog -ErrorMessage "AWS credentials verification failed" -Stage "AWS Credentials Check" -ErrorDetails $_
        return $false
    }
}

# Function to build and start Docker container
function Start-DockerContainer {
    try {
        Write-Host "Building Docker image..." -ForegroundColor Yellow
        docker build -t amplify-app .
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }

        Write-Host "Starting Docker container..." -ForegroundColor Yellow
        docker run -d --name amplify-sandbox `
            -p 3000:3000 -p 5173:5173 -p 20002:20002 `
            -v ${PWD}:/app `
            -e AWS_ACCESS_KEY_ID=$env:AWS_ACCESS_KEY_ID `
            -e AWS_SECRET_ACCESS_KEY=$env:AWS_SECRET_ACCESS_KEY `
            -e AWS_SESSION_TOKEN=$env:AWS_SESSION_TOKEN `
            -e AWS_REGION=$env:AWS_REGION `
            -e VITE_AMPLIFY_ENV=$env:AMPLIFY_ENV `
            -e NODE_ENV=$env:NODE_ENV `
            -e npm_config_user_agent=$env:npm_config_user_agent `
            -e AMPLIFY_BACKEND_POOL_NAME=$env:AMPLIFY_BACKEND_POOL_NAME `
            amplify-app
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker container start failed"
        }

        Write-Host "Docker container started successfully!" -ForegroundColor Green
        return $true
    } catch {
        Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Docker Container Setup" -ErrorDetails $_
        return $false
    }
}

# Verify prerequisites
if (-not (Test-DockerInstallation)) {
    exit 1
}

if (-not (Test-AwsCredentials)) {
    Write-Host "Please configure your AWS credentials and try again." -ForegroundColor Red
    Write-Host "You can set them up using 'aws configure' or by setting the appropriate environment variables." -ForegroundColor Yellow
    exit 1
}

# Set environment variables for deployment
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:AMPLIFY_ENV = "dev"
$env:NODE_ENV = "development"
$env:CI = "1"  # Required for deployment
$env:npm_config_user_agent = "npm/10.2.4 node/v20.18.3 win32 x64 workspaces/false"
$env:AMPLIFY_BACKEND_POOL_NAME = "DeepDevAi-Sandbox"

# First ensure we're in the right directory
Set-Location -Path $PSScriptRoot\..\..\

# Clean existing artifacts
Write-Host "Cleaning existing artifacts..." -ForegroundColor Yellow
Remove-Item -Path amplify_outputs.json -Force -ErrorAction SilentlyContinue
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue

# Install dependencies and initialize sandbox
Write-Host "Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    
    Write-Host "Initializing Amplify sandbox..." -ForegroundColor Yellow
    npx ampx sandbox
    
    if ($LASTEXITCODE -ne 0) {
        throw "Amplify sandbox initialization failed"
    }

    # Get Cognito User Pool details after sandbox is ready
    $userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
    $currentPool = $userPools.UserPools | Where-Object { 
        $_.Name -like "*sandbox*" -or 
        ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*Development*")
    } | Sort-Object CreationDate -Descending | Select-Object -First 1

    if ($currentPool) {
        $clients = aws cognito-idp list-user-pool-clients --user-pool-id $currentPool.Id | ConvertFrom-Json
        $client = $clients.UserPoolClients[0]

        if ($client) {
            Update-EnvFile -PoolId $currentPool.Id -ClientId $client.ClientId
        }
    }

    # Build and start Docker container
    if (-not (Start-DockerContainer)) {
        exit 1
    }

    Write-Host "
Sandbox environment deployed successfully!
----------------------------------------
- Amplify sandbox is running at http://localhost:20002
- Application is running at http://localhost:5173
- AWS resources have been provisioned
- Environment variables have been configured

To stop the sandbox:
1. Run cleanup-sandbox.ps1 to remove all resources
" -ForegroundColor Green

} catch {
    Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Deployment" -ErrorDetails $_
    exit 1
}
