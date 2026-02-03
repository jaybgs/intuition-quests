const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer Address:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer Balance:", hre.ethers.formatEther(balance));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
