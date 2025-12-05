require("dotenv").config();
const fs = require("fs");
const hre = require("hardhat");

async function main() {
  const revenueWallet = process.env.REVENUE_WALLET_ADDRESS || "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const multiVaultAddress = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

  console.log("Deploying TransactionWrapper with new fee model...");
  console.log("MultiVault address:", multiVaultAddress);
  console.log("Revenue wallet address:", revenueWallet);
  console.log("Fee model: Base gas fee + 30% dApp fee on gas");

  const TransactionWrapper = await hre.ethers.getContractFactory("TransactionWrapper");
  const wrapper = await TransactionWrapper.deploy(multiVaultAddress, revenueWallet);

  await wrapper.waitForDeployment();

  const wrapperAddress = await wrapper.getAddress();
  
  // Write to file
  const deploymentInfo = {
    address: wrapperAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    multiVault: multiVaultAddress,
    revenueWallet: revenueWallet
  };
  
  fs.writeFileSync("deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  
  console.log("TransactionWrapper deployed to:", wrapperAddress);
  console.log("\nPlease save this address to your .env file:");
  console.log(`VITE_TRANSACTION_WRAPPER_ADDRESS=${wrapperAddress}`);
  
  // Also write to a simple text file
  fs.writeFileSync("contract-address.txt", wrapperAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
