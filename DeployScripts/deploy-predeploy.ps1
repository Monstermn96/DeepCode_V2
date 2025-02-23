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

# Build Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t amplify-predeploy .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed" -ForegroundColor Red
    exit 1
}

# Push Docker image to ECR
Write-Host "Creating ECR repository if it doesn't exist..." -ForegroundColor Yellow
$ecrRepo = "deepdevai-predeploy"
aws ecr describe-repositories --repository-names $ecrRepo 2>$null
if ($LASTEXITCODE -ne 0) {
    aws ecr create-repository --repository-name $ecrRepo
    Test-AwsCommand
}

# Get ECR login token
Write-Host "Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password | docker login --username AWS --password-stdin "$($identity.Account).dkr.ecr.$REGION.amazonaws.com"
Test-AwsCommand

# Tag and push image
$ecrUri = "$($identity.Account).dkr.ecr.$REGION.amazonaws.com/$ecrRepo:latest"
docker tag amplify-predeploy $ecrUri
docker push $ecrUri
Test-AwsCommand

# Update Amplify app build settings
Write-Host "Updating Amplify build settings..." -ForegroundColor Yellow
$buildSpec = @{
    version = 1
    applications = @(
        @{
            frontend = @{
                phases = @{
                    preBuild = @{
                        commands = @("npm ci")
                    }
                    build = @{
                        commands = @("npm run build")
                    }
                }
                artifacts = @{
                    baseDirectory = "dist"
                    files = @("**/*")
                }
                cache = @{
                    paths = @("node_modules/**/*")
                }
            }
            appRoot = "."
            customHeaders = @(
                @{
                    pattern = "**/*"
                    headers = @(
                        @{
                            key = "Strict-Transport-Security"
                            value = "max-age=31536000; includeSubDomains"
                        }
                        @{
                            key = "X-Frame-Options"
                            value = "SAMEORIGIN"
                        }
                        @{
                            key = "X-XSS-Protection"
                            value = "1; mode=block"
                        }
                    )
                }
            )
            build = @{
                image = $ecrUri
                commands = @("npm run build")
            }
        }
    )
}

$buildSpecJson = $buildSpec | ConvertTo-Json -Depth 10
Set-Content -Path "amplify.yml" -Value $buildSpecJson

# Deploy to PreDeploy branch
Write-Host "Deploying to PreDeploy branch..." -ForegroundColor Yellow
npx ampx pipeline-deploy --branch $BRANCH --app-id $APP_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

# Get Cognito User Pool details
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

Write-Host "
PreDeploy environment deployed successfully!
----------------------------------------
- Docker image pushed to ECR: $ecrUri
- Application deployed to: https://predeploy.$APP_ID.amplifyapp.com
- AWS resources have been provisioned
- Environment variables have been configured

To clean up this environment:
1. Run cleanup-predeploy.ps1
" -ForegroundColor Green 