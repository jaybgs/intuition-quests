require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  console.log("Network:", hre.network.name);
  
  const revenueWallet = process.env.REVENUE_WALLET_ADDRESS || "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const multiVaultAddress = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

  console.log("MultiVault address:", multiVaultAddress);
  console.log("Revenue wallet address:", revenueWallet);
  console.log("Fee model: Base gas fee + 30% dApp fee on gas");

  console.log("\nDeploying TransactionWrapper...");
  const TransactionWrapper = await hre.ethers.getContractFactory("TransactionWrapper");
  const wrapper = await TransactionWrapper.deploy(multiVaultAddress, revenueWallet);

  console.log("Waiting for deployment...");
  await wrapper.waitForDeployment();

  const wrapperAddress = await wrapper.getAddress();
  console.log("\n✅ TransactionWrapper deployed to:", wrapperAddress);
  console.log("\n📋 Please save this address to your .env file:");
  console.log(`VITE_TRANSACTION_WRAPPER_ADDRESS=${wrapperAddress}`);
  console.log("\nOr update frontend/src/config/contracts.ts with:");
  console.log(`TRANSACTION_WRAPPER: "${wrapperAddress}" as Address,`);
}

main()
  .then(() => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
