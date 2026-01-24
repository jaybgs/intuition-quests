const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Testing revenue wallet address...\n");

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Sender wallet:", wallet.address);

  // Test the user's suggested address
  const receiveTestAddress = "0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2";
  console.log("Testing address:", receiveTestAddress);

  // Check current balance of test address
  const balance = await provider.getBalance(receiveTestAddress);
  console.log(`Test address current balance: ${ethers.formatEther(balance)} TRUST`);

  // Check if it has code (is contract or EOA)
  const code = await provider.getCode(receiveTestAddress);
  console.log(`Test address has code: ${code !== '0x'}`);

  // Test sending 0.001 TRUST to the test address
  console.log("\nTesting small transfer (0.001 TRUST) to test address...");
  try {
    const tx = await wallet.sendTransaction({
      to: receiveTestAddress,
      value: ethers.parseEther("0.001"),
    });

    console.log("Transaction hash:", tx.hash);
    await tx.wait();

    // Check new balance
    const newBalance = await provider.getBalance(receiveTestAddress);
    console.log(`Test address new balance: ${ethers.formatEther(newBalance)} TRUST`);

    if (newBalance > balance) {
      console.log("✅ Test address can receive TRUST tokens!");
      console.log("✅ This address should work as revenue wallet!");
    } else {
      console.log("❌ Transfer didn't increase balance");
    }
  } catch (error) {
    console.error("❌ Transfer failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
