const hre = require("hardhat");

async function main() {
    const contractAddr = "0x9aD94f90588bBB82C11EE1518B291b5b6ceAEf02"; // Real contract candidate
    const deployerAddr = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

    console.log(`Checking ${contractAddr}...`);
    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const contract = await ClaimIQ.attach(contractAddr);

    try {
        const owner = await contract.owner();
        console.log(`Contract Owner:   ${owner}`);
        console.log(`Expected Owner:   ${deployerAddr}`);
        console.log(`Owner Match?      ${owner.toLowerCase() === deployerAddr.toLowerCase()}`);
    } catch (e) {
        console.log(`Error fetching owner: ${e.message}`);
    }

    const bal = await hre.ethers.provider.getBalance(contractAddr);
    console.log(`Contract Balance: ${hre.ethers.formatEther(bal)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
