# Deploy Sandbox Environment Script

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

# Log environment state
Write-Host "Current Environment State:" -ForegroundColor Yellow
Write-Host "Node Version: $(node -v)" -ForegroundColor Yellow
Write-Host "NPM Version: $(npm -v)" -ForegroundColor Yellow
Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# 1. First, run cleanup
Write-Host "Cleaning up existing sandbox environment..." -ForegroundColor Yellow
try {
    ./LocalDevScripts/cleanup-sandbox.ps1
    if ($LASTEXITCODE -ne 0) {
        throw "Cleanup script failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Cleanup" -ErrorDetails $_
    exit 1
}

# 2. Set environment variables for deployment
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:AMPLIFY_ENV = "dev"
$env:NODE_ENV = "development"
$env:CI = "1"  # Required for deployment

Write-Host "Environment Variables Set:" -ForegroundColor Yellow
Write-Host "AMPLIFY_ENV: $env:AMPLIFY_ENV" -ForegroundColor Yellow
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow
Write-Host "CI: $env:CI" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# 3. Verify dependencies
Write-Host "Verifying dependencies..." -ForegroundColor Yellow
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
    }
} catch {
    Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Dependency Installation" -ErrorDetails $_
    exit 1
}

# 4. Deploy backend
Write-Host "Deploying backend resources..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    # Deploy using Amplify Gen 2
    Write-Host "Running: npx ampx sandbox" -ForegroundColor Yellow
    Write-Host "Current working directory: $(Get-Location)" -ForegroundColor Yellow
    
    # First check if ampx is installed
    Write-Host "Checking ampx installation..." -ForegroundColor Yellow
    $ampxVersion = npx ampx --version 2>&1
    Write-Host "ampx version: $ampxVersion" -ForegroundColor Yellow
    
    # Run sandbox with progress indication
    Write-Host "Starting sandbox deployment..." -ForegroundColor Yellow
    Write-Host "This process will create a local development environment." -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    
    # Run the sandbox command directly
    npm exec ampx sandbox
    if ($LASTEXITCODE -ne 0) {
        throw "Sandbox deployment failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "Backend deployment completed successfully!" -ForegroundColor Green

    # Wait a moment for resources to be fully created
    Start-Sleep -Seconds 5

    # 5. Get the new User Pool details
    Write-Host "Fetching new User Pool details..." -ForegroundColor Yellow
    $userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
    $sandboxPool = $userPools.UserPools | Where-Object { 
        $_.Name -like "*sandbox*" -or 
        $_.Name -like "*Sandbox*" -or 
        $_.Name -like "*DeepDevAi*" -or
        $_.Name -like "*development*" -or
        $_.Name -like "*Development*"
    } | Sort-Object CreationDate -Descending | Select-Object -First 1

    if ($sandboxPool) {
        Write-Host "Found User Pool:" -ForegroundColor Green
        Write-Host "Name: $($sandboxPool.Name)" -ForegroundColor Yellow
        Write-Host "ID: $($sandboxPool.Id)" -ForegroundColor Yellow

        # Get the client ID
        $clients = aws cognito-idp list-user-pool-clients --user-pool-id $sandboxPool.Id | ConvertFrom-Json
        $client = $clients.UserPoolClients[0]

        if ($client) {
            Write-Host "Found Client ID: $($client.ClientId)" -ForegroundColor Yellow

            # 6. Update .env file
            Write-Host "Updating .env file..." -ForegroundColor Yellow
            $envPath = ".env"
            $envContent = Get-Content $envPath

            # Update or add the environment variables
            $envContent = $envContent | ForEach-Object {
                if ($_ -match "^VITE_AUTH_USER_POOL_ID=") {
                    "VITE_AUTH_USER_POOL_ID=$($sandboxPool.Id)"
                }
                elseif ($_ -match "^VITE_AUTH_USER_POOL_CLIENT_ID=") {
                    "VITE_AUTH_USER_POOL_CLIENT_ID=$($client.ClientId)"
                }
                else {
                    $_
                }
            }

            # Write the updated content back to the file
            $envContent | Set-Content $envPath

            Write-Host "Environment variables updated successfully!" -ForegroundColor Green
            Write-Host "New values:" -ForegroundColor Yellow
            Write-Host "VITE_AUTH_USER_POOL_ID=$($sandboxPool.Id)" -ForegroundColor Yellow
            Write-Host "VITE_AUTH_USER_POOL_CLIENT_ID=$($client.ClientId)" -ForegroundColor Yellow
        } else {
            throw "No client found for User Pool"
        }
    } else {
        throw "No sandbox User Pool found"
    }

    Write-Host "
Sandbox environment is ready!
1. Backend resources have been deployed
2. .env file has been updated with new User Pool details
3. You can now start the development server with 'npm run dev'

To clean up this environment later, run cleanup-sandbox.ps1
" -ForegroundColor Green

} catch {
    Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Deployment" -ErrorDetails $_
    Write-Host "`nTroubleshooting Steps:" -ForegroundColor Yellow
    Write-Host "1. Check if Node.js version 20 is installed" -ForegroundColor Yellow
    Write-Host "2. Verify AWS credentials are configured" -ForegroundColor Yellow
    Write-Host "3. Try running cleanup script manually" -ForegroundColor Yellow
    Write-Host "4. Check for any existing Amplify resources" -ForegroundColor Yellow
    exit 1
} 