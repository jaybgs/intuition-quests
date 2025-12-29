import { ethers } from "ethers";
import fs from "fs";

// Load environment variables manually
function loadEnv() {
  try {
    const envContent = fs.readFileSync('./.env', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    return envVars;
  } catch (error) {
    console.error("Error reading .env file:", error.message);
    return {};
  }
}

async function main() {
  // Load environment variables
  const env = loadEnv();

  // Configuration
  const RPC_URL = "https://rpc.intuition.systems";
  const PRIVATE_KEY = env.PRIVATE_KEY;
  const TRUST_TOKEN_ADDRESS = "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3";

  console.log("Environment check:");
  console.log("PRIVATE_KEY exists:", !!PRIVATE_KEY);
  console.log("PRIVATE_KEY length:", PRIVATE_KEY ? PRIVATE_KEY.length : 0);

  if (!PRIVATE_KEY) {
    console.log("Available env vars:", Object.keys(env));
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  console.log("🚀 Deploying TrustQuestsPayment contract...");
  console.log("RPC URL:", RPC_URL);
  console.log("TRUST Token Address:", TRUST_TOKEN_ADDRESS);

  // Connect to network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deployer address:", wallet.address);

  // Contract bytecode and ABI from artifacts
  const artifactPath = "./out/src/TrustQuestsPayment.sol/TrustQuestsPayment.json";

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npm run compile' first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  console.log("📦 Deploying contract...");

  // Create contract factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  // Deploy contract
  const contract = await factory.deploy();
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
