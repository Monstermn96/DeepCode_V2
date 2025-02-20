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
"@

    Set-Content -Path ".env" -Value $envContent
    Write-Host "Environment variables updated successfully!" -ForegroundColor Green
    Write-Host "New values:" -ForegroundColor Yellow
    Write-Host "VITE_AUTH_USER_POOL_ID=$PoolId" -ForegroundColor Yellow
    Write-Host "VITE_AUTH_USER_POOL_CLIENT_ID=$ClientId" -ForegroundColor Yellow
}

# Function to ensure correct Node.js version
function Ensure-NodeVersion {
    $nodeVersion = (node -v).Replace('v', '')
    $major = [int]($nodeVersion.Split('.')[0])
    
    if ($major -ne 20) {
        Write-Host "Current Node.js version is $nodeVersion" -ForegroundColor Yellow
        Write-Host "Attempting to switch to Node.js 20..." -ForegroundColor Yellow
        
        # Try using fnm first
        try {
            & fnm use 20
            $nodeVersion = (node -v).Replace('v', '')
            $major = [int]($nodeVersion.Split('.')[0])
            if ($major -eq 20) {
                Write-Host "Successfully switched to Node.js $nodeVersion" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "Could not switch Node.js version using fnm" -ForegroundColor Yellow
        }
        
        Write-Host "Please install Node.js v20 manually from https://nodejs.org/" -ForegroundColor Red
        Write-Host "Current Node.js version ($nodeVersion) is not compatible." -ForegroundColor Red
        return $false
    }
    return $true
}

# Function to ensure Amplify CLI and backend package are installed
function Ensure-AmplifyCLI {
    try {
        Write-Host "Ensuring Amplify packages are installed correctly..." -ForegroundColor Yellow
        
        # First, uninstall any existing global packages to ensure clean state
        Write-Host "Cleaning up existing installations..." -ForegroundColor Yellow
        npm uninstall -g @aws-amplify/cli @aws-amplify/backend-cli 2>$null
        
        # Install backend-cli globally first
        Write-Host "Installing @aws-amplify/backend-cli globally..." -ForegroundColor Yellow
        npm install -g @aws-amplify/backend-cli
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install @aws-amplify/backend-cli globally"
        }
        
        # Install CLI globally
        Write-Host "Installing @aws-amplify/cli globally..." -ForegroundColor Yellow
        npm install -g @aws-amplify/cli
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install @aws-amplify/cli globally"
        }
        
        # Install backend package locally
        Write-Host "Installing @aws-amplify/backend locally..." -ForegroundColor Yellow
        npm install @aws-amplify/backend
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install @aws-amplify/backend locally"
        }
        
        # Verify ampx is available
        Write-Host "Verifying ampx installation..." -ForegroundColor Yellow
        $ampxPath = ""
        
        # Check in local node_modules first
        if (Test-Path "node_modules/.bin/ampx.cmd") {
            $ampxPath = "node_modules/.bin/ampx.cmd"
        } elseif (Test-Path "node_modules/.bin/ampx") {
            $ampxPath = "node_modules/.bin/ampx"
        } else {
            # Check in global npm bin
            $npmBin = npm bin -g
            if (Test-Path "$npmBin/ampx.cmd") {
                $ampxPath = "$npmBin/ampx.cmd"
            } elseif (Test-Path "$npmBin/ampx") {
                $ampxPath = "$npmBin/ampx"
            }
        }
        
        if (-not $ampxPath) {
            throw "ampx executable not found after installation"
        }
        
        Write-Host "Amplify packages installed and verified successfully!" -ForegroundColor Green
        return $true
    } catch {
        Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Amplify CLI Installation" -ErrorDetails $_
        return $false
    }
}

# Function to install backend dependencies
function Install-BackendDependencies {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    
    # Change to the amplify directory
    Push-Location amplify
    
    try {
        # Install backend dependencies
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install backend dependencies"
        }
        Write-Host "Backend dependencies installed successfully!" -ForegroundColor Green
    }
    catch {
        Write-ErrorLog -ErrorMessage $_.Exception.Message -Stage "Backend Dependencies Installation" -ErrorDetails $_
        return $false
    }
    finally {
        # Return to the original directory
        Pop-Location
    }
    
    return $true
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

# Log environment state
Write-Host "Current Environment State:" -ForegroundColor Yellow
Write-Host "Node Version: $(node -v)" -ForegroundColor Yellow
Write-Host "NPM Version: $(npm -v)" -ForegroundColor Yellow
Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Set environment variables for deployment
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:AMPLIFY_ENV = "dev"
$env:NODE_ENV = "development"
$env:CI = "1"  # Required for deployment

Write-Host "Environment Variables Set:" -ForegroundColor Yellow
Write-Host "AMPLIFY_ENV: $env:AMPLIFY_ENV" -ForegroundColor Yellow
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow
Write-Host "CI: $env:CI" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Verify AWS credentials before proceeding
if (-not (Test-AwsCredentials)) {
    Write-Host "Please configure your AWS credentials and try again." -ForegroundColor Red
    Write-Host "You can set them up using 'aws configure' or by setting the appropriate environment variables." -ForegroundColor Yellow
    exit 1
}

# Check Node.js version and Amplify CLI
if (-not (Ensure-NodeVersion)) {
    exit 1
}

if (-not (Ensure-AmplifyCLI)) {
    exit 1
}

# Verify frontend dependencies
Write-Host "Verifying frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorLog -ErrorMessage "Frontend npm install failed" -Stage "Frontend Dependency Installation"
        exit 1
    }
}

# Install backend dependencies
if (-not (Install-BackendDependencies)) {
    exit 1
}

# Deploy backend
Write-Host "Deploying backend resources..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

try {
    Write-Host "Starting sandbox deployment..." -ForegroundColor Yellow
    Write-Host "This process will create a local development environment." -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    
    # Try to run ampx using different methods
    $ampxPath = ""
    
    # Check in local node_modules first
    if (Test-Path "node_modules/.bin/ampx.cmd") {
        $ampxPath = "node_modules/.bin/ampx.cmd"
    } elseif (Test-Path "node_modules/.bin/ampx") {
        $ampxPath = "node_modules/.bin/ampx"
    } else {
        # Check in global npm bin
        $npmBin = npm bin -g
        if (Test-Path "$npmBin/ampx.cmd") {
            $ampxPath = "$npmBin/ampx.cmd"
        } elseif (Test-Path "$npmBin/ampx") {
            $ampxPath = "$npmBin/ampx"
        }
    }
    
    if ($ampxPath) {
        Write-Host "Running ampx from: $ampxPath" -ForegroundColor Yellow
        & $ampxPath sandbox
    } else {
        Write-Host "Falling back to npx execution..." -ForegroundColor Yellow
        npx --package @aws-amplify/backend-cli ampx sandbox
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Sandbox deployment failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "Backend deployment completed successfully!" -ForegroundColor Green

    # Wait a moment for resources to be fully created
    Start-Sleep -Seconds 5

    # Get the new User Pool details
    Write-Host "Fetching new User Pool details..." -ForegroundColor Yellow
    $userPools = aws cognito-idp list-user-pools --max-results 60 | ConvertFrom-Json
    $sandboxPool = $userPools.UserPools | Where-Object { 
        $_.Name -like "*sandbox*" -or 
        $_.Name -like "*Sandbox*" -or 
        ($_.Name -like "*DeepDevAi*" -and $_.Name -like "*Development*")
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
            Update-EnvFile -PoolId $sandboxPool.Id -ClientId $client.ClientId
        } else {
            throw "No client found for User Pool"
        }
    } else {
        throw "No sandbox User Pool found"
    }

    Write-Host "
Sandbox environment is ready!
1. Frontend and backend resources have been deployed
2. All dependencies are installed (frontend and backend)
3. .env file has been updated with new User Pool details
4. You can now start the development server with 'npm run dev'

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
