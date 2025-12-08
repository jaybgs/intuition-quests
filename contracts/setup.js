import { ethers } from "ethers";

const RPC_URL = "https://rpc.intuition.systems";
const PRIVATE_KEY = "0x769c4eb62eeb239d2510a42f94ba3803db0a29145056c65f44a235a75fb6f5b9";

// Deployed contract addresses
const CONTRACTS = {
  FeeWrapper: "0xc661fb7854C6c8c4732A9f290bfFFF0439c46855",
  SpaceIdentityFactory: "0x0602BE125789ee6B1F650EA7F26AB9854F7Cd6DB",
  QuestAtomFactory: "0xaFCb0Bbe04eb4fee63164FBEBa700423424e2095",
  QuestEscrow: "0x1482f61346246E40e3109C5141bb2ec0e1dD6b8f",
  ClaimIQ: "0x999Ac582091Bf7Dd52449ee1eBD319Ece1D5A92D"
};

const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Running post-deployment setup...\n");

  // Whitelist targets in FeeWrapper
  console.log("Whitelisting contracts in FeeWrapper...\n");
  const feeWrapperABI = ["function setTargetAllowed(address target, bool allowed)"];
  const feeWrapper = new ethers.Contract(CONTRACTS.FeeWrapper, feeWrapperABI, wallet);
  
  const targets = [
    { name: "SpaceIdentityFactory", address: CONTRACTS.SpaceIdentityFactory },
    { name: "QuestAtomFactory", address: CONTRACTS.QuestAtomFactory },
    { name: "QuestEscrow", address: CONTRACTS.QuestEscrow },
    { name: "ClaimIQ", address: CONTRACTS.ClaimIQ },
    { name: "MultiVault", address: MULTIVAULT_ADDRESS }
  ];

  for (const target of targets) {
    console.log(`  Whitelisting ${target.name}...`);
    const tx = await feeWrapper.setTargetAllowed(target.address, true);
    await tx.wait();
    console.log(`  Done! TX: ${tx.hash}\n`);
  }

  console.log("========================================");
  console.log("WHITELISTING COMPLETE!");
  console.log("========================================");
  console.log("\nNote: ClaimIQ predicate initialization skipped.");
  console.log("Run initializeCompletedPredicate() manually when needed.");
}

main().catch(console.error);

const RPC_URL = "https://rpc.intuition.systems";
const PRIVATE_KEY = "0x769c4eb62eeb239d2510a42f94ba3803db0a29145056c65f44a235a75fb6f5b9";

// Deployed contract addresses
const CONTRACTS = {
  FeeWrapper: "0xc661fb7854C6c8c4732A9f290bfFFF0439c46855",
  SpaceIdentityFactory: "0x0602BE125789ee6B1F650EA7F26AB9854F7Cd6DB",
  QuestAtomFactory: "0xaFCb0Bbe04eb4fee63164FBEBa700423424e2095",
  QuestEscrow: "0x1482f61346246E40e3109C5141bb2ec0e1dD6b8f",
  ClaimIQ: "0x999Ac582091Bf7Dd52449ee1eBD319Ece1D5A92D"
};

const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Running post-deployment setup...\n");

  // Whitelist targets in FeeWrapper
  console.log("Whitelisting contracts in FeeWrapper...\n");
  const feeWrapperABI = ["function setTargetAllowed(address target, bool allowed)"];
  const feeWrapper = new ethers.Contract(CONTRACTS.FeeWrapper, feeWrapperABI, wallet);
  
  const targets = [
    { name: "SpaceIdentityFactory", address: CONTRACTS.SpaceIdentityFactory },
    { name: "QuestAtomFactory", address: CONTRACTS.QuestAtomFactory },
    { name: "QuestEscrow", address: CONTRACTS.QuestEscrow },
    { name: "ClaimIQ", address: CONTRACTS.ClaimIQ },
    { name: "MultiVault", address: MULTIVAULT_ADDRESS }
  ];

  for (const target of targets) {
    console.log(`  Whitelisting ${target.name}...`);
    const tx = await feeWrapper.setTargetAllowed(target.address, true);
    await tx.wait();
    console.log(`  Done! TX: ${tx.hash}\n`);
  }

  console.log("========================================");
  console.log("WHITELISTING COMPLETE!");
  console.log("========================================");
  console.log("\nNote: ClaimIQ predicate initialization skipped.");
  console.log("Run initializeCompletedPredicate() manually when needed.");
}

main().catch(console.error);