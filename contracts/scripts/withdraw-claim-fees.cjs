const hre = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0x507736bC7D79bf5588a8A94ab62c82C69592F514";

    console.log("💰 Withdrawing fees from ClaimIQ contract...");
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);

    // Get signer (owner)
    const [owner] = await hre.ethers.getSigners();
    console.log(`🔑 Signer (Owner): ${owner.address}`);

    // Get contract instance
    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const claimIQ = ClaimIQ.attach(CONTRACT_ADDRESS);

    // Check balance
    const balanceBefore = await hre.ethers.provider.getBalance(CONTRACT_ADDRESS);
    console.log(`💵 Balance before withdrawal: ${hre.ethers.formatEther(balanceBefore)} ETH/TRUST`);

    if (balanceBefore === 0n) {
        console.log("⚠️ No funds to withdraw.");
        return;
    }

    // Withdraw
    try {
        console.log("💸 Initiating withdrawal...");
        const tx = await claimIQ.withdrawFees();
        console.log(`⏳ Transaction submitted: ${tx.hash}`);

        await tx.wait();
        console.log("✅ Withdrawal successful!");

        // Check balance after
        const balanceAfter = await hre.ethers.provider.getBalance(CONTRACT_ADDRESS);
        console.log(`💵 Balance after withdrawal: ${hre.ethers.formatEther(balanceAfter)} ETH/TRUST`);

    } catch (error) {
        console.error("❌ Withdrawal failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
