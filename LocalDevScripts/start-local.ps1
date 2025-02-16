# Start Script for Local Development Environment

Write-Host "Starting local development environment..." -ForegroundColor Cyan

# Set variables
$REGION = "us-east-1"
$ENV = "development"

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
Write-Host "Setting development environment variables..." -ForegroundColor Yellow
$env:AMPLIFY_ENV = $ENV
$env:NODE_ENV = "development"

# 3. Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Test-AwsCommand
}

# 4. Start the development server
Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host "This will run in a new terminal window..." -ForegroundColor Yellow

# Start Vite dev server in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "
Local development environment is ready!
1. Development server is running in a new terminal window
2. Backend is configured for local development
3. You can now start coding!

To clean up this environment later, run cleanup-local.ps1
" -ForegroundColor Green 