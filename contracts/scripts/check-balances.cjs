const hre = require("hardhat");

async function main() {
    const claimIQAddress = "0x240A2A6a11704618F20b0807099738aCeFe462D9"; // Contract
    const ownerAddress = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";   // Deployer

    console.log("--- Current Native Balances ---");

    const contractBal = await hre.ethers.provider.getBalance(claimIQAddress);
    console.log(`Contract (${claimIQAddress}): ${hre.ethers.formatEther(contractBal)} ETH`);

    const ownerBal = await hre.ethers.provider.getBalance(ownerAddress);
    console.log(`Owner    (${ownerAddress}): ${hre.ethers.formatEther(ownerBal)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
