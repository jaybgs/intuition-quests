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
    process.exit(1);
  }

  console.log("Deploying QuestClaimSurcharge contract...");
  console.log("TRUST Token address:", trustTokenAddress);
  console.log("Revenue wallet address:", revenueWallet);
  console.log("Staking relayer address:", stakingRelayer);

  const QuestClaimSurcharge = await hre.ethers.getContractFactory("QuestClaimSurcharge");
  const questClaimSurcharge = await QuestClaimSurcharge.deploy(
    trustTokenAddress,
    revenueWallet,
    stakingRelayer
  );

  await questClaimSurcharge.waitForDeployment();

  const contractAddress = await questClaimSurcharge.getAddress();
  console.log("\n✅ QuestClaimSurcharge deployed to:", contractAddress);
  
  // Save to file
  const output = {
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
    JSON.stringify(output, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to: deployment-address.json");
  console.log("\n📋 Update your frontend/.env file with:");
  console.log(`VITE_QUEST_CLAIM_SURCHARGE_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
