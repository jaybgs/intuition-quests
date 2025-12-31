import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function main() {
  console.log("🚀 Deploying updated TrustQuestsPayment contract...");
  console.log("Network: Intuition Chain");

  const TRUST_TOKEN_ADDRESS = "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3";
  const AUTHORIZED_WITHDRAWER = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const RPC_URL = process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http";

  console.log("TRUST Token Address:", TRUST_TOKEN_ADDRESS);
  console.log("Authorized Withdrawer:", AUTHORIZED_WITHDRAWER);
  console.log("Pro Plan Price: 10 TRUST tokens");
  console.log("Network RPC:", RPC_URL);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer address:", wallet.address);

  // Read contract artifact
  const artifactPath = './out/src/TrustQuestsPayment.sol/TrustQuestsPayment.json';
  if (!fs.existsSync(artifactPath)) {
    throw new Error("❌ Contract artifact not found. Run 'npx hardhat compile' first.");
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  console.log("\n📦 Deploying TrustQuestsPayment...");

  // Deploy contract
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("\n✅ TrustQuestsPayment deployed successfully!");
  console.log("📍 New Contract Address:", contractAddress);
  console.log("💰 Pro Plan Price: 10 TRUST tokens");
  console.log("🔐 Authorized Withdrawer: 0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07");
  console.log("🔄 Reset functions added for testing");

  // Save deployment info
  const deploymentInfo = {
    contractName: "TrustQuestsPayment",
    address: contractAddress,
    network: "Intuition Chain",
    trustTokenAddress: TRUST_TOKEN_ADDRESS,
    proPlanPrice: "10 TRUST",
    features: ["Reset functions for testing", "Native TRUST payments"],
    deployedAt: new Date().toISOString(),
    previousAddress: "0xF43b19c406B5178e13B9B9e576109F915bCef20C"
  };

  fs.writeFileSync('trust-payment-updated-deployment.json', JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📋 Update frontend/src/contracts/addresses.ts:");
  console.log(`TRUST_QUESTS_PAYMENT: "${contractAddress}" as \`0x\${string}\`,`);

  console.log("\n🎉 Updated TrustQuestsPayment deployment completed!");
  console.log("Now you can reset pro status for testing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
