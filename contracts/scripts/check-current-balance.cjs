const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    // Read address dynamically to be safe
    const addressPath = path.join(__dirname, '../claim-iq-address.txt');
    const claimIQAddress = fs.readFileSync(addressPath, 'utf8').trim();
    const ownerAddress = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";   // Deployer

    console.log(`--- Checking Balance for ${claimIQAddress} ---`);

    const contractBal = await hre.ethers.provider.getBalance(claimIQAddress);
    const ownerBal = await hre.ethers.provider.getBalance(ownerAddress);

    const output = `
Contract Address: ${claimIQAddress}
Contract Balance: ${hre.ethers.formatEther(contractBal)} ETH
Owner Address: ${ownerAddress}
Owner Balance: ${hre.ethers.formatEther(ownerBal)} ETH
    `;

    console.log(output);
    fs.writeFileSync('contract-balance.txt', output);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
