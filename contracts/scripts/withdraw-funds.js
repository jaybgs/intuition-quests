import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("💰 Withdrawing funds from TrustQuestsPayment contract...");

  // Contract address - Updated contract with reset functions
  const CONTRACT_ADDRESS = "0x57CE7B8051e9684C21955178C56b6eCDAcb5Dfb4";
  const AUTHORIZED_WITHDRAWER = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const RPC_URL = process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http";

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

  // Contract ABI (minimal for withdrawal functions)
  const CONTRACT_ABI = [
    "function getContractBalance() view returns (uint256)",
    "function withdrawAllFunds(address payable to) external",
    "event FundsWithdrawn(address indexed to, uint256 amount, address indexed by)"
  ];

  // Get contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  // Check current balance
  const balance = await contract.getContractBalance();
  const balanceInEther = ethers.formatEther(balance);
  console.log(`\n📊 Current contract balance: ${balanceInEther} TRUST`);

  if (balance === 0n) {
    console.log("❌ No funds to withdraw!");
    return;
  }

  // Withdraw all funds to authorized withdrawer
  console.log(`\n💸 Withdrawing ${balanceInEther} TRUST to ${AUTHORIZED_WITHDRAWER}...`);

  const tx = await contract.withdrawAllFunds(AUTHORIZED_WITHDRAWER);
  console.log("⏳ Waiting for transaction confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Withdrawal successful!");
  console.log("📋 Transaction hash:", receipt.hash);

  // Verify new balance is zero
  const newBalance = await contract.getContractBalance();
  console.log(`\n📊 New contract balance: ${ethers.formatEther(newBalance)} TRUST`);

  console.log("\n🎉 All funds withdrawn successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Withdrawal failed:");
    console.error(error);
    process.exit(1);
  });
