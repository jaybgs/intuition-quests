require("dotenv").config();
const fs = require("fs");
const hre = require("hardhat");

// Write status immediately
fs.writeFileSync("deploy-status.txt", "Starting deployment...\n");

async function main() {
  try {
    fs.appendFileSync("deploy-status.txt", "Loading configuration...\n");
    
    const revenueWallet = process.env.REVENUE_WALLET_ADDRESS || "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
    const multiVaultAddress = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

    fs.appendFileSync("deploy-status.txt", `MultiVault: ${multiVaultAddress}\n`);
    fs.appendFileSync("deploy-status.txt", `Revenue Wallet: ${revenueWallet}\n`);
    fs.appendFileSync("deploy-status.txt", "Getting contract factory...\n");

    const TransactionWrapper = await hre.ethers.getContractFactory("TransactionWrapper");
    
    fs.appendFileSync("deploy-status.txt", "Deploying contract...\n");
    const wrapper = await TransactionWrapper.deploy(multiVaultAddress, revenueWallet);

    fs.appendFileSync("deploy-status.txt", "Waiting for deployment...\n");
    await wrapper.waitForDeployment();

    const wrapperAddress = await wrapper.getAddress();
    
    fs.appendFileSync("deploy-status.txt", `SUCCESS! Address: ${wrapperAddress}\n`);
    fs.writeFileSync("NEW_CONTRACT_ADDRESS.txt", wrapperAddress);
    
    // Update frontend config
    const contractsPath = "frontend/src/config/contracts.ts";
    let contractsContent = fs.readFileSync(contractsPath, "utf8");
    contractsContent = contractsContent.replace(
      /TRANSACTION_WRAPPER: \(import\.meta\.env\.VITE_TRANSACTION_WRAPPER_ADDRESS \|\|[\s\S]*?"([^"]+)"/,
      `TRANSACTION_WRAPPER: (import.meta.env.VITE_TRANSACTION_WRAPPER_ADDRESS || 
    "${wrapperAddress}")`
    );
    fs.writeFileSync(contractsPath, contractsContent);
    
    fs.appendFileSync("deploy-status.txt", "Frontend config updated!\n");
    fs.appendFileSync("deploy-status.txt", `\n✅ Deployment complete!\nContract: ${wrapperAddress}\n`);
    
    console.log("✅ TransactionWrapper deployed to:", wrapperAddress);
    console.log("Frontend config updated automatically.");
    
  } catch (error) {
    const errorMsg = `ERROR: ${error.message}\n${error.stack}`;
    fs.appendFileSync("deploy-status.txt", errorMsg);
    fs.writeFileSync("deploy-error.txt", errorMsg);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
