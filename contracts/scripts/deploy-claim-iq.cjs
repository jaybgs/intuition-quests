const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
    const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
    const COMPLETED_PREDICATE_ATOM_ID = 1;

    console.log("🚀 Deploying ClaimIQ contract...");
    console.log(`Revenue Wallet: ${REVENUE_WALLET}`);
    console.log(`MultiVault: ${MULTIVAULT_ADDRESS}`);
    console.log(`Completed Predicate Atom ID: ${COMPLETED_PREDICATE_ATOM_ID}`);

    const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
    const claimIQ = await ClaimIQ.deploy(
        REVENUE_WALLET,
        MULTIVAULT_ADDRESS,
        COMPLETED_PREDICATE_ATOM_ID
    );

    await claimIQ.waitForDeployment();
    const address = await claimIQ.getAddress();

    console.log("✅ ClaimIQ deployed successfully!");
    console.log(`📍 Address: ${address}`);

    // Verify code existence immediately
    const code = await hre.ethers.provider.getCode(address);
    console.log(`Code size: ${code.length} bytes`);

    if (code.length <= 2) {
        throw new Error("Deployment failed: No code at address!");
    }

    // Save to file for easy access
    fs.writeFileSync("claim-iq-address.txt", address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
