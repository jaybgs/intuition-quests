import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying TrustQuestsPayment contract...");
  console.log("Network:", hre.network.name);

  const TRUST_TOKEN_ADDRESS = "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3";
  const AUTHORIZED_WITHDRAWER = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  console.log("TRUST Token Address:", TRUST_TOKEN_ADDRESS);
  console.log("Authorized Withdrawer:", AUTHORIZED_WITHDRAWER);
  console.log("Pro Plan Price: 10 TRUST tokens");

  console.log("\n📦 Deploying TrustQuestsPayment...");
  const TrustQuestsPayment = await hre.ethers.getContractFactory("TrustQuestsPayment");
  const contract = await TrustQuestsPayment.deploy(TRUST_TOKEN_ADDRESS);

  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("\n✅ TrustQuestsPayment deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("💰 Pro Plan Price: 10 TRUST tokens");
  console.log("🔐 Authorized Withdrawer: 0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07");

  // Save deployment info
  const deploymentInfo = {
    contractName: "TrustQuestsPayment",
    address: contractAddress,
    network: "Intuition Chain",
    trustTokenAddress: TRUST_TOKEN_ADDRESS,
    proPlanPrice: "10 TRUST",
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync('trust-payment-deployment.json', JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📋 Update frontend/src/contracts/addresses.ts:");
  console.log(`TRUST_QUESTS_PAYMENT: "${contractAddress}" as \`0x\${string}\`,`);

  console.log("\n🎉 TrustQuestsPayment deployment completed!");
  console.log("Users can now pay 10 TRUST tokens for pro subscriptions!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
