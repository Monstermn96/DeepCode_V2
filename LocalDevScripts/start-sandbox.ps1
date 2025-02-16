# Start Script for Sandbox Environment

Write-Host "Starting sandbox environment deployment..." -ForegroundColor Cyan

# Set variables
$REGION = "us-east-1"
$ENV = "sandbox"

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
Write-Host "Setting sandbox environment variables..." -ForegroundColor Yellow
$env:AMPLIFY_ENV = $ENV
$env:NODE_ENV = "development"
$env:CI = "1"  # Required for deployment

# 3. Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Test-AwsCommand
}

# 4. Deploy backend resources
Write-Host "Deploying backend resources..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    npx ampx pipeline-deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
    Write-Host "Backend deployment completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    exit 1
}

# 5. Start the development server
Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host "This will run in a new terminal window..." -ForegroundColor Yellow

# Start Vite dev server in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "
Sandbox environment is ready!
1. Backend resources have been deployed
2. Development server is running in a new terminal window
3. You can now start testing!

To clean up this environment later, run cleanup-sandbox.ps1
" -ForegroundColor Green 