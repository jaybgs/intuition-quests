const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Configuration from environment variables
  const trustTokenAddress = process.env.TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3";
  const revenueWallet = process.env.REVENUE_WALLET_ADDRESS || "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const stakingRelayer = process.env.STAKING_RELAYER_ADDRESS || "0x0000000000000000000000000000000000000000";

  if (stakingRelayer === "0x0000000000000000000000000000000000000000") {
    console.error("ERROR: STAKING_RELAYER_ADDRESS must be set in .env file");
    console.error("Please set STAKING_RELAYER_ADDRESS to the address that will receive 0.6 TRUST per claim");
    process.exit(1);
  }

  console.log("Deploying QuestClaimSurcharge contract...");
  console.log("TRUST Token address:", trustTokenAddress);
  console.log("Revenue wallet address:", revenueWallet);
  console.log("Staking relayer address:", stakingRelayer);
  console.log("\nFee split:");
  console.log("  - 0.6 TRUST (60%) → Staking Relayer");
  console.log("  - 0.4 TRUST (40%) → Revenue Wallet");
  console.log("  - Total surcharge: 1 TRUST per claim\n");

  const QuestClaimSurcharge = await hre.ethers.getContractFactory("QuestClaimSurcharge");
  const questClaimSurcharge = await QuestClaimSurcharge.deploy(
    trustTokenAddress,
    revenueWallet,
    stakingRelayer
  );

  await questClaimSurcharge.waitForDeployment();

  const contractAddress = await questClaimSurcharge.getAddress();
  console.log("QuestClaimSurcharge deployed to:", contractAddress);
  console.log("\nPlease save this address to your .env files:");
  console.log(`VITE_QUEST_CLAIM_SURCHARGE_ADDRESS=${contractAddress}`);
  console.log("\nAnd update your frontend/.env file with:");
  console.log(`VITE_QUEST_CLAIM_SURCHARGE_ADDRESS=${contractAddress}`);
  
  // Save deployment info to file
  const deploymentInfo = {
    contractAddress,
    trustTokenAddress,
    revenueWallet,
    stakingRelayer,
    deployedAt: new Date().toISOString(),
    network: "intuition",
    chainId: 1155
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployment-address.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n✅ Deployment info saved to: deployment-address.json");

  // Verify on block explorer (optional)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting for block confirmations before verification...");
    await questClaimSurcharge.deploymentTransaction().wait(5);

    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [trustTokenAddress, revenueWallet, stakingRelayer],
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
