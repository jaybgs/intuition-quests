import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Checking pro status on TrustQuestsPayment contract...");

  // Contract details - Updated contract with reset functions
  const CONTRACT_ADDRESS = "0x57CE7B8051e9684C21955178C56b6eCDAcb5Dfb4";
  const RPC_URL = process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http";

  // Contract ABI (minimal for checking pro status)
  const CONTRACT_ABI = [
    "function isProUser(address user) view returns (bool)",
    "function hasPaidPro(address user) view returns (bool)",
    "function paymentTimestamps(address user) view returns (uint256)"
  ];

  // Setup provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Get contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  // Test with different addresses
  const testAddresses = [
    "0x80D291e82C6f8a11cEC9A9BA699285AFe14d7F4D", // From console logs
    "0x6CB435348f84638b6E2470835E06387448f7c9Ef", // From console logs
    "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07"  // Authorized withdrawer
  ];

  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: ${RPC_URL}`);
  console.log("");

  for (const address of testAddresses) {
    try {
      console.log(`🔍 Checking address: ${address}`);

      const isProUser = await contract.isProUser(address);
      const hasPaidPro = await contract.hasPaidPro(address);
      const paymentTimestamp = await contract.paymentTimestamps(address);

      console.log(`   isProUser: ${isProUser}`);
      console.log(`   hasPaidPro: ${hasPaidPro}`);
      console.log(`   paymentTimestamp: ${paymentTimestamp} (${paymentTimestamp > 0 ? new Date(Number(paymentTimestamp) * 1000).toISOString() : 'Never'})`);
      console.log("");

    } catch (error) {
      console.error(`❌ Error checking ${address}:`, error.message);
      console.log("");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Script failed:");
    console.error(error);
    process.exit(1);
  });
