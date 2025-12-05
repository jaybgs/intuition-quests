const hre = require("hardhat");

async function main() {
  // Revenue wallet address (receives 30% dApp fee)
  const revenueWallet = process.env.REVENUE_WALLET_ADDRESS || "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  // MultiVault address on Intuition Mainnet (Chain ID: 1155)
  const multiVaultAddress = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

  console.log("Deploying TransactionWrapper with new fee model...");
  console.log("MultiVault address:", multiVaultAddress);
  console.log("Revenue wallet address:", revenueWallet);
  console.log("Fee model: Base gas fee + 30% dApp fee on gas");

  const TransactionWrapper = await hre.ethers.getContractFactory("TransactionWrapper");
  const wrapper = await TransactionWrapper.deploy(multiVaultAddress, revenueWallet);

  await wrapper.waitForDeployment();

  const wrapperAddress = await wrapper.getAddress();
  console.log("TransactionWrapper deployed to:", wrapperAddress);
  console.log("\nPlease save this address to your .env file:");
  console.log(`VITE_TRANSACTION_WRAPPER_ADDRESS=${wrapperAddress}`);

  // Verify on block explorer (optional)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for block confirmations before verification...");
    await wrapper.deploymentTransaction().wait(5);

    try {
      await hre.run("verify:verify", {
        address: wrapperAddress,
        constructorArguments: [multiVaultAddress, revenueWallet],
      });
      console.log("Contract verified on block explorer!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

