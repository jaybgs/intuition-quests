const hre = require("hardhat");

async function main() {
    const claimIQAddress = "0x240A2A6a11704618F20b0807099738aCeFe462D9";

    console.log(`Attaching to ClaimIQ contract at ${claimIQAddress}...`);
    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const claimIQ = await ClaimIQ.attach(claimIQAddress);

    // Check balance before
    const balance = await hre.ethers.provider.getBalance(claimIQAddress);
    console.log(`Contract Balance: ${hre.ethers.formatEther(balance)} TRUST (ETH)`);

    if (balance == 0n) {
        console.log("No funds to withdraw.");
        return;
    }

    // Withdraw
    console.log("Withdrawing fees to owner...");
    const tx = await claimIQ.withdrawFees();
    console.log(`Transaction submitted: ${tx.hash}`);

    await tx.wait();
    console.log("Withdrawal confirmed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
