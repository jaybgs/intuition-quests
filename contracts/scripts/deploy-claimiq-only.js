import hre from "hardhat";

async function main() {
  const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
  const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  console.log("Deploying ClaimIQ contract to Intuition Chain...\n");

  // Deploy ClaimIQ
  console.log("Deploying ClaimIQ...");
  const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
  const claimIQ = await ClaimIQ.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, 1); // completedPredicateAtomId = 1
  await claimIQ.waitForDeployment();
  const claimIQAddress = await claimIQ.getAddress();
  console.log(`ClaimIQ deployed to: ${claimIQAddress}\n`);

  // Summary
  console.log("========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`ClaimIQ: ${claimIQAddress}`);
  console.log("========================================");
  console.log("\nUpdate frontend/src/contracts/addresses.ts with the new ClaimIQ address:");
  console.log(`CLAIM_IQ: "${claimIQAddress}",`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

