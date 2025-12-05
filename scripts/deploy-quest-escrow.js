const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying QuestEscrow contract...");
  console.log("Note: QuestEscrow now uses native TRUST tokens (no ERC20 token address needed)");

  // Deploy QuestEscrow (no constructor parameters needed for native token)
  const QuestEscrow = await hre.ethers.getContractFactory("QuestEscrow");
  const questEscrow = await QuestEscrow.deploy();

  await questEscrow.waitForDeployment();
  const questEscrowAddress = await questEscrow.getAddress();

  console.log("✅ QuestEscrow deployed to:", questEscrowAddress);

  // Save deployment address to file
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: questEscrowAddress,
    tokenType: "native", // Native TRUST token
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address,
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-quest-escrow.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to:", deploymentPath);

  // Verify contract on block explorer (if on mainnet/testnet)
  if (hre.network.name === "intuition" || hre.network.name === "intuitionTestnet") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await questEscrow.deploymentTransaction().wait(5);

    try {
      console.log("🔍 Verifying contract on block explorer...");
      await hre.run("verify:verify", {
        address: questEscrowAddress,
        constructorArguments: [], // No constructor arguments for native token version
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.warn("⚠️ Verification failed (this is okay if contract is already verified):", error.message);
    }
  }

  console.log("\n📋 Deployment Summary:");
  console.log("Contract Address:", questEscrowAddress);
  console.log("Token Type: Native TRUST (no ERC20 address needed)");
  console.log("\n💡 Add this to your frontend/.env file:");
  console.log(`VITE_QUEST_ESCROW_ADDRESS=${questEscrowAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

