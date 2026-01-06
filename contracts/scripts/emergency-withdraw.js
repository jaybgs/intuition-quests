import hre from "hardhat";

async function main() {
  console.log("🚨 Emergency withdrawal from QuestEscrow contract...");

  // Contract address
  const QUEST_ESCROW_ADDRESS = "0xDaeb8F72678a723b273F7273c628Ad6d31cE3A4e";

  // Get signer (should be the contract owner now)
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Using signer:", signer.address);

  // Get contract instance
  const questEscrow = await hre.ethers.getContractAt("QuestEscrow", QUEST_ESCROW_ADDRESS, signer);

  // Check current balance
  const balance = await hre.ethers.provider.getBalance(QUEST_ESCROW_ADDRESS);
  console.log("💰 Contract balance:", hre.ethers.formatEther(balance), "TRUST");

  if (balance === 0n) {
    console.log("✅ Contract has no funds");
    return;
  }

  // Check if we're the owner
  const owner = await questEscrow.owner();
  console.log("👑 Contract owner:", owner);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ We are not the contract owner!");
    return;
  }

  console.log("✅ We are the contract owner");

  // Since the contract doesn't have an emergency withdrawal function,
  // we'll need to use a low-level approach to transfer funds

  // Method 1: Try to call a non-existent function with value (might trigger fallback)
  try {
    console.log("\n🔄 Attempting low-level transfer...");

    // Create a transaction that sends value to the contract
    // This might not work, but let's try
    const tx = await signer.sendTransaction({
      to: QUEST_ESCROW_ADDRESS,
      value: 0, // Send 0, but maybe we can trigger something
      data: "0x" // Empty data
    });

    console.log("⏳ Transaction submitted:", tx.hash);
    await tx.wait();
    console.log("✅ Transaction completed");

  } catch (error) {
    console.log("❌ Low-level transfer failed:", error.message);
  }

  // Method 2: Since we can't directly withdraw from the contract,
  // we need to redeploy the contract with emergency withdrawal functionality

  console.log("\n🔄 Deploying emergency contract...");

  // Deploy the emergency contract
  const QuestEscrowEmergency = await hre.ethers.getContractFactory("QuestEscrowEmergency");
  const emergencyContract = await QuestEscrowEmergency.deploy();

  await emergencyContract.waitForDeployment();
  const emergencyAddress = await emergencyContract.getAddress();

  console.log("✅ Emergency contract deployed at:", emergencyAddress);

  // Now we need to transfer funds from the old contract to the new one
  // But since the old contract doesn't have transfer functions, we're stuck

  console.log("\n❌ CONCLUSION:");
  console.log("The QuestEscrow contract doesn't have emergency withdrawal functionality.");
  console.log("To rescue the funds, you would need to:");
  console.log("1. Modify the contract code to add emergency withdrawal");
  console.log("2. Redeploy the contract at the same address (if possible)");
  console.log("3. Or contact the blockchain team for assistance");
  console.log("\n💰 Funds remain locked in contract:", hre.ethers.formatEther(balance), "TRUST");

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
