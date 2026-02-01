const hre = require("hardhat");

async function main() {
    const claimIQAddress = "0x240A2A6a11704618F20b0807099738aCeFe462D9";

    console.log(`Attaching to ClaimIQ contract at ${claimIQAddress}...`);
    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const claimIQ = await ClaimIQ.attach(claimIQAddress);

    const balance = await hre.ethers.provider.getBalance(claimIQAddress);
    console.log(`Current Contract Balance: ${hre.ethers.formatEther(balance)} ETH`);

    if (balance == 0n) {
        console.log("Empty balance. Nothing to withdraw.");
        return;
    }

    console.log("Attempting withdrawal...");
    try {
        // Explicit gas limit and legacy tx type if needed, but 1155 chain usually standard
        const tx = await claimIQ.withdrawFees({
            gasLimit: 500000
        });
        console.log(`Transaction submitted: ${tx.hash}`);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`Confirmed in block ${receipt.blockNumber}`);
        console.log(`Status: ${receipt.status}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

        // Check logs
        if (receipt.logs.length === 0) {
            console.log("WARNING: No events emitted! Withdrawal might not have happened.");
        } else {
            console.log("Events emitted:");
            receipt.logs.forEach(l => console.log(` - ${l.topics[0]}`));
        }

    } catch (error) {
        console.error("WITHDRAWAL FAILED:");
        console.error(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
