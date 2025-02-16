# Start Development Server Script

Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

# 1. Get the new User Pool details
Write-Host "Fetching User Pool details..." -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
$sandboxPool = $userPools.UserPools | Where-Object { 
    $_.Name -like "*development*" -or 
    $_.Name -like "*Development*" -or 
    $_.Name -like "*DeepDevAi*" 
} | Select-Object -First 1

if ($sandboxPool) {
    Write-Host "Found User Pool:" -ForegroundColor Green
    Write-Host "Name: $($sandboxPool.Name)" -ForegroundColor Yellow
    Write-Host "ID: $($sandboxPool.Id)" -ForegroundColor Yellow

    # Get the client ID
    $clients = aws cognito-idp list-user-pool-clients --user-pool-id $sandboxPool.Id | ConvertFrom-Json
    $client = $clients.UserPoolClients[0]

    if ($client) {
        Write-Host "Found Client ID: $($client.ClientId)" -ForegroundColor Yellow

        # 2. Update .env file
        Write-Host "Updating .env file..." -ForegroundColor Yellow
        $envContent = Get-Content .env
        $envContent = $envContent -replace "VITE_AUTH_USER_POOL_ID=.*", "VITE_AUTH_USER_POOL_ID=$($sandboxPool.Id)"
        $envContent = $envContent -replace "VITE_AUTH_USER_POOL_CLIENT_ID=.*", "VITE_AUTH_USER_POOL_CLIENT_ID=$($client.ClientId)"
        $envContent | Set-Content .env

        Write-Host "Environment variables updated successfully!" -ForegroundColor Green

        # 3. Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
        }

        # 4. Start the development server
        Write-Host "Starting Vite development server..." -ForegroundColor Yellow
        npm run dev

    } else {
        Write-Host "No client found for User Pool" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No sandbox User Pool found" -ForegroundColor Red
    exit 1
} 