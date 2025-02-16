# Deploy Sandbox Environment Script

Write-Host "Starting sandbox deployment process..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Yellow

# 1. First, run cleanup
Write-Host "Cleaning up existing sandbox environment..." -ForegroundColor Yellow
./LocalDevScripts/cleanup-sandbox.ps1

# 2. Set environment variables for deployment
$env:AMPLIFY_ENV = "dev"
$env:NODE_ENV = "development"
$env:CI = "1"  # Required for deployment

# 3. Deploy backend
Write-Host "Deploying backend resources..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    # Deploy using Amplify Gen 2
    npx ampx sandbox
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
    Write-Host "Backend deployment completed successfully!" -ForegroundColor Green

    # 4. Get the new User Pool details
    Write-Host "Fetching new User Pool details..." -ForegroundColor Yellow
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

            # 5. Update .env file
            Write-Host "Updating .env file..." -ForegroundColor Yellow
            $envContent = Get-Content .env
            $envContent = $envContent -replace "VITE_AUTH_USER_POOL_ID=.*", "VITE_AUTH_USER_POOL_ID=$($sandboxPool.Id)"
            $envContent = $envContent -replace "VITE_AUTH_USER_POOL_CLIENT_ID=.*", "VITE_AUTH_USER_POOL_CLIENT_ID=$($client.ClientId)"
            $envContent | Set-Content .env

            Write-Host "Environment variables updated successfully!" -ForegroundColor Green
        } else {
            throw "No client found for User Pool"
        }
    } else {
        throw "No sandbox User Pool found"
    }

    # 6. Start the development server
    Write-Host "Starting development server..." -ForegroundColor Yellow
    Write-Host "This will run in a new terminal window..." -ForegroundColor Yellow

    # Start Vite dev server in a new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

    Write-Host "
Sandbox environment is ready!
1. Backend resources have been deployed
2. .env file has been updated with new User Pool details
3. Development server is running in a new terminal window
4. You can now start testing!

To clean up this environment later, run cleanup-sandbox.ps1
" -ForegroundColor Green

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Deployment failed. Please check the error message above." -ForegroundColor Red
    exit 1
} 