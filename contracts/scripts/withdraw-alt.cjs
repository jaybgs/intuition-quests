const hre = require("hardhat");

async function main() {
    const claimIQAddress = "0x240A2A6a11704618F20b0807099738aCeFe462D9";

    console.log(`Attaching to ClaimIQ at ${claimIQAddress}...`);
    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const claimIQ = await ClaimIQ.attach(claimIQAddress);

    const balance = await hre.ethers.provider.getBalance(claimIQAddress);
    console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

    if (balance == 0n) return;

    try {
        const revenueWallet = await claimIQ.revenueWallet();
        console.log(`Revenue Wallet: ${revenueWallet}`);

        console.log("Calling withdrawToRevenueWallet()...");
        const tx = await claimIQ.withdrawToRevenueWallet({ gasLimit: 500000 });
        console.log(`Tx submitted: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`Confirmed in block ${receipt.blockNumber}`);

        if (receipt.logs.length > 0) {
            console.log("SUCCESS: Logs emitted!");
        } else {
            console.log("WARNING: Still no logs.");
        }

    } catch (error) {
        console.error("Alternative withdrawal failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
