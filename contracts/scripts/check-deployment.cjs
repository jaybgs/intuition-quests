const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Checking recent deployments...\n");

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http");

  // Check deployer wallet
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Deployer wallet:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} TRUST`);

  // Check recent transactions from deployer
  console.log("\nChecking recent transactions...");
  try {
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Check last 10 blocks for transactions from deployer
    for (let i = 0; i < 10; i++) {
      const block = await provider.getBlock(latestBlock - i, true);
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          if (tx.from?.toLowerCase() === wallet.address.toLowerCase()) {
            console.log(`Found transaction: ${tx.hash}`);
            console.log(`  To: ${tx.to}`);
            console.log(`  Value: ${ethers.formatEther(tx.value)} TRUST`);

            // Check if it's a contract creation
            if (!tx.to) {
              console.log(`  📝 Contract creation transaction!`);
              // Get transaction receipt to find contract address
              const receipt = await provider.getTransactionReceipt(tx.hash);
              if (receipt && receipt.contractAddress) {
                console.log(`  🏗️  Contract deployed at: ${receipt.contractAddress}`);
              }
            }
            console.log(`  Gas used: ${tx.gasLimit}`);
            console.log(`---`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking transactions:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
