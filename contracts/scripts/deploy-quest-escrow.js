import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying QuestEscrow contract to Intuition Network...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "TRUST\n");

  // Admin wallet - can be the same as deployer or different
  // Change this to your preferred admin wallet address
  const adminWallet = process.env.ADMIN_WALLET || deployer.address;
  console.log("🔑 Admin wallet:", adminWallet);

  // Deploy QuestEscrow
  console.log("\n📦 Deploying QuestEscrow...");
  const QuestEscrow = await hre.ethers.getContractFactory("QuestEscrow");
  const questEscrow = await QuestEscrow.deploy(adminWallet);

  await questEscrow.waitForDeployment();
  const escrowAddress = await questEscrow.getAddress();

  console.log("✅ QuestEscrow deployed to:", escrowAddress);
  console.log("📋 Transaction hash:", questEscrow.deploymentTransaction()?.hash);

  // Save deployment info
  const deployment = {
    network: "intuition-mainnet",
    chainId: 1155,
    contractName: "QuestEscrow",
    address: escrowAddress,
    adminWallet: adminWallet,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: questEscrow.deploymentTransaction()?.hash,
    features: {
      gracePeriod: "3 days",
      minDeposit: "0.1 TRUST",
      securityFeatures: ["Ownable", "ReentrancyGuard", "Pausable"]
    }
  };

  const deploymentPath = path.join(__dirname, "../deployment-quest-escrow.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Also update the root deployment file
  const rootDeploymentPath = path.join(__dirname, "../../deployment-quest-escrow.json");
  fs.writeFileSync(rootDeploymentPath, JSON.stringify(deployment, null, 2));
  console.log("💾 Root deployment file updated:", rootDeploymentPath);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\nContract Address:", escrowAddress);
  console.log("Admin Wallet:", adminWallet);
  console.log("\n📌 Next steps:");
  console.log("1. Update frontend with new contract address");
  console.log("2. Update backend API if needed");
  console.log("3. Verify contract on explorer (optional)");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
