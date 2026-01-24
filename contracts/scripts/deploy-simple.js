const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
  const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  console.log("Deploying ClaimIQ contract directly with ethers...\n");

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Wallet address:", wallet.address);
  console.log("Network:", await provider.getNetwork());

  // Get contract factory
  const fs = require("fs");
  const path = require("path");
  const contractPath = path.join(__dirname, "../out/ClaimIQ.sol/ClaimIQ.json");

  if (!fs.existsSync(contractPath)) {
    throw new Error("Contract artifacts not found. Run 'npx hardhat compile' first.");
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("Deploying ClaimIQ...");
  const contract = await factory.deploy(
    MULTIVAULT_ADDRESS,
    REVENUE_WALLET,
    1, // completedPredicateAtomId
    {
      gasLimit: 5000000
    }
  );

  console.log("Waiting for deployment...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`ClaimIQ deployed to: ${address}\n`);

  console.log("========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`ClaimIQ: ${address}`);
  console.log("========================================");
  console.log("\nUpdate frontend/src/contracts/addresses.ts with:");
  console.log(`CLAIM_IQ: "${address}",`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
