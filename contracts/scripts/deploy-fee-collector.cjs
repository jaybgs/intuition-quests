const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment of FeeCollector...");

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

    // Get the Contract Factory
    const FeeCollector = await hre.ethers.getContractFactory("FeeCollector");

    // Deploy the contract
    console.log("Deploying FeeCollector...");
    const feeCollector = await FeeCollector.deploy();

    // Wait for deployment to finish
    await feeCollector.waitForDeployment();

    const address = await feeCollector.getAddress();

    console.log("FeeCollector deployed to:", address);
    console.log("-----------------------------------------");
    console.log("Please update your frontend addresses.ts with this address:");
    console.log("FEE_COLLECTOR:", address);

    // Save deployment info to a local file for records
    const deploymentInfo = {
        network: hre.network.name,
        contract: "FeeCollector",
        address: address,
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };

    const deploymentPath = path.join(__dirname, "../deployment-fee-collector.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", deploymentPath);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
