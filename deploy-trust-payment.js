require("dotenv").config();
const hre = require("hardhat");

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

  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  const proPrice = await contract.PRO_PLAN_PRICE();
  const trustToken = await contract.trustToken();
  const authorizedWithdrawer = await contract.AUTHORIZED_WITHDRAWER();

  console.log("Pro Plan Price:", proPrice.toString(), "wei");
  console.log("TRUST Token Address:", trustToken);
  console.log("Authorized Withdrawer:", authorizedWithdrawer);

  console.log("\n📋 Update your frontend/src/contracts/addresses.ts with:");
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
