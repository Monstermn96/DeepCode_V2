# Start Development Server Script

Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Function to update environment variables
function Update-EnvFile {
    param (
        [string]$PoolId,
        [string]$ClientId
    )
    Write-Host "Updating .env file..." -ForegroundColor Yellow
    $envContent = Get-Content .env
    $envContent = $envContent -replace "VITE_AUTH_USER_POOL_ID=.*", "VITE_AUTH_USER_POOL_ID=$PoolId"
    $envContent = $envContent -replace "VITE_AUTH_USER_POOL_CLIENT_ID=.*", "VITE_AUTH_USER_POOL_CLIENT_ID=$ClientId"
    $envContent | Set-Content .env
    Write-Host "Environment variables updated successfully!" -ForegroundColor Green
}

# 1. Verify environment setup
Write-Host "Verifying environment setup..." -ForegroundColor Yellow

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "No .env file found. Please run deploy-sandbox.ps1 first." -ForegroundColor Red
    exit 1
}

# 2. Get the current User Pool details
Write-Host "Checking current User Pool configuration..." -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
$currentPool = $userPools.UserPools | Where-Object { 
    $_.Name -like "*sandbox*" -or 
    $_.Name -like "*Sandbox*" -or 
    ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*Development*")
} | Sort-Object CreationDate -Descending | Select-Object -First 1

if ($currentPool) {
    Write-Host "Found User Pool:" -ForegroundColor Green
    Write-Host "Name: $($currentPool.Name)" -ForegroundColor Yellow
    Write-Host "ID: $($currentPool.Id)" -ForegroundColor Yellow

    # Get the client ID
    $clients = aws cognito-idp list-user-pool-clients --user-pool-id $currentPool.Id | ConvertFrom-Json
    $client = $clients.UserPoolClients[0]

    if ($client) {
        Write-Host "Found Client ID: $($client.ClientId)" -ForegroundColor Yellow
        
        # Update .env file with current pool details
        Update-EnvFile -PoolId $currentPool.Id -ClientId $client.ClientId
    }
}

# 3. Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies. Please check npm errors above." -ForegroundColor Red
        exit 1
    }
}

# 4. Start the development server
Write-Host "Starting Vite development server..." -ForegroundColor Yellow
Write-Host "
Server is starting...
- The development server will be available at http://localhost:5173
- Press Ctrl+C to stop the server
" -ForegroundColor Green

npm run dev 