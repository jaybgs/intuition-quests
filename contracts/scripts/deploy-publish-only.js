
import hre from "hardhat";
import fs from "fs";

async function main() {
    const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
    const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

    console.log("Deploying PublishQuests...");
    const PublishQuests = await hre.ethers.getContractFactory("PublishQuests");
    const publishQuests = await PublishQuests.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET);
    await publishQuests.waitForDeployment();
    const address = await publishQuests.getAddress();

    console.log(`PublishQuests deployed to: ${address}`);
    fs.writeFileSync("publish-quests-address.txt", address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
