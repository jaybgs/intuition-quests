const { ethers } = require("ethers");

// Configuration
const RPC_URL = "https://rpc.intuition.systems";
const PRIVATE_KEY = "0x769c4eb62eeb239d2510a42f94ba3803db0a29145056c65f44a235a75fb6f5b9"; // From setup.js
const TRUST_TOKEN_ADDRESS = "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3";

async function main() {
  console.log("🚀 Deploying TrustQuestsPayment contract...");
  console.log("Network: Intuition Chain");
  console.log("RPC URL:", RPC_URL);
  console.log("TRUST Token:", TRUST_TOKEN_ADDRESS);

  // Connect to network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deployer address:", wallet.address);

  // Get contract factory
  const contractPath = "./contracts/src/TrustQuestsPayment.sol";
  console.log("Loading contract from:", contractPath);

  // For simplicity, let's use a manual approach
  // We'll create the contract bytecode directly
  const fs = require('fs');
  const path = require('path');

  // Read the compiled bytecode if it exists
  const artifactsPath = path.join(__dirname, 'contracts', 'out', 'TrustQuestsPayment.sol', 'TrustQuestsPayment.json');

  if (!fs.existsSync(artifactsPath)) {
    console.log("❌ Contract not compiled. Please run: npx hardhat compile");
    console.log("Or manually compile and deploy the contract.");
    console.log("\n📋 Manual deployment command:");
    console.log(`forge create contracts/src/TrustQuestsPayment.sol:TrustQuestsPayment --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} --constructor-args ${TRUST_TOKEN_ADDRESS}`);
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  console.log("📦 Deploying contract...");

  // Create contract factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  // Deploy contract
  const contract = await factory.deploy(TRUST_TOKEN_ADDRESS);
  console.log("⏳ Waiting for deployment...");

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

  console.log("\n🎉 Deployment completed! Users can now pay for pro subscriptions!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
