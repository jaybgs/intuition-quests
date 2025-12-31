import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔄 Resetting pro status for wallet...");

  // Contract details
  const CONTRACT_ADDRESS = "0x57CE7B8051e9684C21955178C56b6eCDAcb5Dfb4"; // New contract address
  const AUTHORIZED_WITHDRAWER = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const RPC_URL = process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http";

  // Get wallet to reset from command line args
  const walletToReset = process.argv[2];
  if (!walletToReset) {
    console.error("❌ Please provide a wallet address to reset:");
    console.error("Usage: node scripts/reset-pro-status.js <wallet_address>");
    process.exit(1);
  }

  // Validate address
  if (!ethers.isAddress(walletToReset)) {
    console.error("❌ Invalid wallet address:", walletToReset);
    process.exit(1);
  }

  console.log(`🎯 Resetting pro status for: ${walletToReset}`);
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: ${RPC_URL}`);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Signer address:", wallet.address);

  // Verify signer is authorized
  if (wallet.address.toLowerCase() !== AUTHORIZED_WITHDRAWER.toLowerCase()) {
    throw new Error(`❌ Signer ${wallet.address} is not the authorized withdrawer ${AUTHORIZED_WITHDRAWER}`);
  }

  // Contract ABI (minimal for reset function)
  const CONTRACT_ABI = [
    "function resetProStatus(address user) external",
    "function isProUser(address user) view returns (bool)",
    "function hasPaidPro(address user) view returns (bool)",
    "function paymentTimestamps(address user) view returns (uint256)"
  ];

  // Get contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  // Check current status before reset
  console.log("\n📊 Checking current status...");
  const isProBefore = await contract.isProUser(walletToReset);
  const hasPaidBefore = await contract.hasPaidPro(walletToReset);
  const timestampBefore = await contract.paymentTimestamps(walletToReset);

  console.log(`   Before reset - isProUser: ${isProBefore}`);
  console.log(`   Before reset - hasPaidPro: ${hasPaidBefore}`);
  console.log(`   Before reset - timestamp: ${timestampBefore} (${timestampBefore > 0 ? new Date(Number(timestampBefore) * 1000).toISOString() : 'Never'})`);

  if (!hasPaidBefore) {
    console.log("ℹ️  Wallet already has no pro status - nothing to reset!");
    return;
  }

  // Reset pro status
  console.log(`\n🔄 Resetting pro status for ${walletToReset}...`);
  const tx = await contract.resetProStatus(walletToReset);
  console.log("⏳ Waiting for transaction confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Reset successful!");
  console.log("📋 Transaction hash:", receipt.hash);

  // Check status after reset
  console.log("\n📊 Checking status after reset...");
  const isProAfter = await contract.isProUser(walletToReset);
  const hasPaidAfter = await contract.hasPaidPro(walletToReset);
  const timestampAfter = await contract.paymentTimestamps(walletToReset);

  console.log(`   After reset - isProUser: ${isProAfter}`);
  console.log(`   After reset - hasPaidPro: ${hasPaidAfter}`);
  console.log(`   After reset - timestamp: ${timestampAfter} (${timestampAfter > 0 ? new Date(Number(timestampAfter) * 1000).toISOString() : 'Never'})`);

  if (!hasPaidAfter) {
    console.log("\n🎉 Pro status successfully reset!");
    console.log("💡 The wallet can now make a new pro subscription payment.");
  } else {
    console.log("\n❌ Reset may not have worked properly.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Reset failed:");
    console.error(error);
    process.exit(1);
  });
