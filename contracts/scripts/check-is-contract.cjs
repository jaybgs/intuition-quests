const hre = require("hardhat");

async function main() {
    const addr = "0x9aD94f90588bBB82C11EE1518B291b5b6ceAEf02"; // From publish-quests-address.txt
    const code = await hre.ethers.provider.getCode(addr);
    console.log(`Address: ${addr}`);
    console.log(`Code Length: ${(code.length - 2) / 2} bytes`);
    console.log(`Is Contract: ${code.length > 2}`);

    const bal = await hre.ethers.provider.getBalance(addr);
    console.log(`Balance: ${hre.ethers.formatEther(bal)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
