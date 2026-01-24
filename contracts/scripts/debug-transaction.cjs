const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Debugging failed transaction...\n");

  const provider = new ethers.JsonRpcProvider(process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http");

  // The failed transaction hash (latest one from logs)
  const txHash = "0xe2b122cd876e5156f9b9eb5162fd5b3be9ba049382732fc4293104869bed11ed";

  try {
    console.log("Fetching transaction receipt...");
    const receipt = await provider.getTransactionReceipt(txHash);

    if (receipt) {
      console.log("Transaction status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
      console.log("Gas used:", receipt.gasUsed.toString());
      console.log("Block number:", receipt.blockNumber);

      // Try to get revert reason if it failed
      if (receipt.status === 0) {
        console.log("\n🔍 Attempting to decode revert reason...");

        // Get the transaction
        const tx = await provider.getTransaction(txHash);
        if (tx) {
          console.log("Transaction details:");
          console.log("  To:", tx.to);
          console.log("  From:", tx.from);
          console.log("  Value:", ethers.formatEther(tx.value), "TRUST");
          console.log("  Data length:", tx.data.length);

          // Try to simulate the call to get revert reason
          try {
            await provider.call({
              to: tx.to,
              from: tx.from,
              data: tx.data,
              value: tx.value,
              blockTag: receipt.blockNumber - 1n // Simulate at the block before
            });
          } catch (callError) {
            console.log("Revert reason:", callError.message);
            if (callError.data) {
              console.log("Revert data:", callError.data);
            }
          }
        }
      }
    } else {
      console.log("Transaction receipt not found");
    }
  } catch (error) {
    console.error("Error debugging transaction:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
