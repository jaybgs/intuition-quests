require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying QuestEscrow...\n");

  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // ethers v6 syntax
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "TRUST");

    const adminWallet = deployer.address;
    console.log("Admin:", adminWallet);

    console.log("\nDeploying...");
    const Factory = await hre.ethers.getContractFactory("QuestEscrow");
    const contract = await Factory.deploy(adminWallet);

    console.log("Waiting for confirmation...");
    await contract.waitForDeployment();

    const addr = await contract.getAddress();
    console.log("\n✅ SUCCESS! Address:", addr);

    // Save to file
    const fs = require("fs");
    fs.writeFileSync("deployment-quest-escrow.json", JSON.stringify({
      address: addr,
      network: "intuition",
      chainId: 1155,
      adminWallet: adminWallet,
      deployer: deployer.address,
      deployedAt: new Date().toISOString()
    }, null, 2));
    console.log("💾 Saved to deployment-quest-escrow.json");

    // Also save to root
    fs.writeFileSync("../deployment-quest-escrow.json", JSON.stringify({
      address: addr,
      network: "intuition",
      chainId: 1155,
      adminWallet: adminWallet,
      deployer: deployer.address,
      deployedAt: new Date().toISOString()
    }, null, 2));

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    if (err.code) console.error("Code:", err.code);
    if (err.reason) console.error("Reason:", err.reason);
    throw err;
  }
}

main();
