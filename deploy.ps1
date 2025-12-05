$ErrorActionPreference = "Stop"
Set-Location "c:\intuition quests"

Write-Host "Starting deployment..." -ForegroundColor Green

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

Write-Host "Running Hardhat deployment..." -ForegroundColor Yellow
$output = npx hardhat run scripts/deploy-wrapper.js --network intuition 2>&1

Write-Host "`n=== Deployment Output ===" -ForegroundColor Cyan
Write-Host $output

# Try to extract contract address
if ($output -match "TransactionWrapper deployed to:\s*(0x[a-fA-F0-9]{40})") {
    $contractAddress = $matches[1]
    Write-Host "`n✅ Contract Address Found: $contractAddress" -ForegroundColor Green
    
    # Write to file
    Set-Content -Path "contract-address.txt" -Value $contractAddress
    Write-Host "Address saved to contract-address.txt" -ForegroundColor Green
}
