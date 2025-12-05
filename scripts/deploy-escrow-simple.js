const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying QuestEscrow contract...");
  console.log("Note: QuestEscrow now uses native TRUST tokens (no ERC20 token address needed)");

  try {
    // Deploy QuestEscrow (no constructor parameters needed for native token)
    const QuestEscrow = await hre.ethers.getContractFactory("QuestEscrow");
    console.log("Contract factory created");
    
    const questEscrow = await QuestEscrow.deploy();
    console.log("Deployment transaction sent, waiting for confirmation...");

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

    console.log("\n📋 Deployment Summary:");
    console.log("Contract Address:", questEscrowAddress);
    console.log("Token Type: Native TRUST (no ERC20 address needed)");
    console.log("\n💡 Add this to your frontend/.env file:");
    console.log(`VITE_QUEST_ESCROW_ADDRESS=${questEscrowAddress}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();
