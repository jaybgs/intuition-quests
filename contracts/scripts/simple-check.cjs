const hre = require("hardhat");

async function main() {
    const contractAddr = "0x240A2A6a11704618F20b0807099738aCeFe462D9";
    const ownerAddr = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

    const contractBal = await hre.ethers.provider.getBalance(contractAddr);
    console.log(`CONTRACT_BALANCE_WEI:${contractBal.toString()}`);
    console.log(`CONTRACT_BALANCE:${hre.ethers.formatEther(contractBal)}`);

    const ownerBal = await hre.ethers.provider.getBalance(ownerAddr);
    console.log(`OWNER_BALANCE:${hre.ethers.formatEther(ownerBal)}`);

    // Also check if owner has enough gas
    const gasPrice = (await hre.ethers.provider.getFeeData()).gasPrice;
    console.log(`GAS_PRICE:${hre.ethers.formatUnits(gasPrice, 'gwei')} gwei`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
