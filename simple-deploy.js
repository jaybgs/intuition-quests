require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function deploy() {
  try {
    const hre = require("hardhat");
    
    const revenueWallet = process.env.REVENUE_WALLET_ADDRESS || "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
    const multiVaultAddress = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

    console.log("=== TransactionWrapper Deployment ===");
    console.log("MultiVault:", multiVaultAddress);
    console.log("Revenue Wallet:", revenueWallet);
    console.log("Network: Intuition (Chain ID: 1155)");
    console.log("\nDeploying contract...");

    const TransactionWrapper = await hre.ethers.getContractFactory("TransactionWrapper");
    const wrapper = await TransactionWrapper.deploy(multiVaultAddress, revenueWallet);

    console.log("Waiting for deployment confirmation...");
    await wrapper.waitForDeployment();

    const wrapperAddress = await wrapper.getAddress();
    
    const result = {
      address: wrapperAddress,
      network: "intuition",
      chainId: 1155,
      deployedAt: new Date().toISOString(),
      multiVault: multiVaultAddress,
      revenueWallet: revenueWallet
    };

    // Write to multiple files for redundancy
    fs.writeFileSync("deployment-result.json", JSON.stringify(result, null, 2));
    fs.writeFileSync("contract-address.txt", wrapperAddress);
    fs.writeFileSync("DEPLOYED_ADDRESS.txt", `VITE_TRANSACTION_WRAPPER_ADDRESS=${wrapperAddress}`);

    console.log("\n✅ SUCCESS!");
    console.log("Contract Address:", wrapperAddress);
    console.log("\nFiles created:");
    console.log("  - deployment-result.json");
    console.log("  - contract-address.txt");
    console.log("  - DEPLOYED_ADDRESS.txt");
    
    return wrapperAddress;
  } catch (error) {
    const errorMsg = `Deployment failed: ${error.message}\n${error.stack}`;
    fs.writeFileSync("deployment-error.txt", errorMsg);
    console.error("\n❌ ERROR:", error.message);
    throw error;
  }
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
