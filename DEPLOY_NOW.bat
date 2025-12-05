@echo off
echo ========================================
echo TransactionWrapper Contract Deployment
echo ========================================
echo.

cd /d "%~dp0"

echo Compiling contract...
call npx hardhat compile
if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo.
echo Deploying to Intuition Network...
call npx hardhat run scripts/deploy-wrapper.js --network intuition

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Please check the output above for the contract address.
echo Then update frontend/src/config/contracts.ts with the new address.
echo.
pause
