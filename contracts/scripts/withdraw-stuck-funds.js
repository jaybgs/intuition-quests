const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Withdrawing stuck funds from old ClaimIQ contract...\n");

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Wallet address:", wallet.address);

  // Old contract address
  const oldContractAddress = "0x8d917e783Bd0d92F5BA2CB9310AdDB6aF62e1c8e";

  // Load contract ABI
  const fs = require("fs");
  const path = require("path");
  const contractPath = path.join(__dirname, "../out/src/ClaimIQ.sol/ClaimIQ.json");

  if (!fs.existsSync(contractPath)) {
    throw new Error("Contract artifacts not found. Run 'npx hardhat compile' first.");
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const contract = new ethers.Contract(oldContractAddress, contractJson.abi, wallet);

  // Check contract balance
  const balance = await provider.getBalance(oldContractAddress);
  console.log(`Old contract balance: ${ethers.formatEther(balance)} TRUST`);

  if (balance > 0n) {
    console.log("Calling emergencyWithdraw...");

    try {
      const tx = await contract.emergencyWithdraw();
      console.log("Transaction submitted:", tx.hash);

      await tx.wait();
      console.log("✅ Stuck funds withdrawn successfully!");

      // Check new balance
      const newBalance = await provider.getBalance(oldContractAddress);
      console.log(`Remaining balance: ${ethers.formatEther(newBalance)} TRUST`);
    } catch (error) {
      console.error("Withdrawal failed:", error);
    }
  } else {
    console.log("No stuck funds to withdraw.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

