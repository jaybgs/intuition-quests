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
  const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  // Check revenue wallet
  console.log("Checking revenue wallet:", REVENUE_WALLET);
  const revenueBalance = await provider.getBalance(REVENUE_WALLET);
  const revenueCode = await provider.getCode(REVENUE_WALLET);
  console.log(`Revenue wallet balance: ${ethers.formatEther(revenueBalance)} TRUST`);
  console.log(`Revenue wallet has code: ${revenueCode !== '0x'}`);

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
    console.log("Attempting to withdraw stuck funds...");

    // First, test if we can send funds directly to revenue wallet
    console.log("Testing direct transfer to revenue wallet...");
    try {
      const testTx = await wallet.sendTransaction({
        to: REVENUE_WALLET,
        value: ethers.parseEther("0.01") // Send 0.01 TRUST as test
      });
      await testTx.wait();
      console.log("✅ Revenue wallet can receive funds");
    } catch (testError) {
      console.log("❌ Revenue wallet cannot receive funds:", testError.message);
    }

    // Now try the emergencyWithdraw function
    try {
      console.log("Trying emergencyWithdraw...");
      const tx = await contract.emergencyWithdraw();
      console.log("Transaction submitted:", tx.hash);

      await tx.wait();
      console.log("✅ Stuck funds withdrawn successfully via emergencyWithdraw!");

      // Check new balance
      const newBalance = await provider.getBalance(oldContractAddress);
      console.log(`Remaining balance: ${ethers.formatEther(newBalance)} TRUST`);
      return;
    } catch (error) {
      console.log("emergencyWithdraw failed:", error.message);
    }

    // If emergencyWithdraw fails, try to self-destruct or direct transfer
    // Since we can't modify the contract, let's try calling it from the revenue wallet
    console.log("Switching to revenue wallet for withdrawal...");

    const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
    const revenueWallet = new ethers.Wallet(process.env.REVENUE_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);

    console.log("Revenue wallet address:", revenueWallet.address);

    const contractWithRevenueWallet = new ethers.Contract(oldContractAddress, contractJson.abi, revenueWallet);

    try {
      // Try the new emergencyWithdrawToDeployer function (works with any caller)
      console.log("Trying emergencyWithdrawToDeployer...");
      const tx = await contract.emergencyWithdrawToDeployer();
      console.log("Transaction submitted:", tx.hash);

      await tx.wait();
      console.log("✅ Stuck funds withdrawn successfully to deployer!");

      // Check new balance
      const newBalance = await provider.getBalance(oldContractAddress);
      console.log(`Remaining balance: ${ethers.formatEther(newBalance)} TRUST`);
    } catch (error) {
      console.error("All withdrawal methods failed:", error);
      console.log("Manual recovery may be needed. Contract balance:", ethers.formatEther(balance), "TRUST");
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
