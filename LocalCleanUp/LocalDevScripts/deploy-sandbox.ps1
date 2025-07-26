# Deploy Sandbox Environment Script for Local Development

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

# Function to verify Node.js installation
function Test-NodeInstallation {
    try {
        Write-Host "Verifying Node.js installation..." -ForegroundColor Yellow
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
        Write-Host "npm version: $npmVersion" -ForegroundColor Green
        return $true
    } catch {
        Write-ErrorLog -ErrorMessage "Node.js is not installed or not in PATH" -Stage "Node.js Verification" -ErrorDetails $_
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
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

# Function to start development server
function Start-DevServer {
    try {
        Write-Host "Starting development server..." -ForegroundColor Yellow
        
        # Start the development server in the background
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
        
        Write-Host "Development server started successfully!" -ForegroundColor Green
        Write-Host "Server will be available at http://localhost:5173" -ForegroundColor Cyan
        return $true
    } catch {
        Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Development Server Setup" -ErrorDetails $_
        return $false
    }
}

# Verify prerequisites
if (-not (Test-NodeInstallation)) {
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

    # Start development server
    if (-not (Start-DevServer)) {
        exit 1
    }

    Write-Host "
Sandbox environment deployed successfully!
----------------------------------------
- Amplify sandbox is running
- Application is running at http://localhost:5173
- AWS resources have been provisioned
- Environment variables have been configured

To stop the sandbox:
1. Stop the development server (Ctrl+C in terminal)
2. Run cleanup-sandbox.ps1 to remove AWS resources
" -ForegroundColor Green

} catch {
    Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Deployment" -ErrorDetails $_
    exit 1
}
