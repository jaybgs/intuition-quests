import hre from "hardhat";

async function main() {
  const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
  const RELAYER_WALLET = "0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2";
  const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const ADMIN_ADDRESS = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  console.log("Deploying contracts to Intuition Chain...\n");

  // 1. Deploy FeeWrapper - SKIPPED (File missing)
  console.log("1. Deploying FeeWrapper... SKIPPED");
  // const FeeWrapper = await hre.ethers.getContractFactory("FeeWrapper");
  // const feeWrapper = await FeeWrapper.deploy(REVENUE_WALLET, ADMIN_ADDRESS);
  // await feeWrapper.waitForDeployment();
  // const feeWrapperAddress = await feeWrapper.getAddress();
  const feeWrapperAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
  console.log(`   FeeWrapper skipped (not found)\n`);

  // 2. Deploy SpaceIdentityFactory - SKIPPED (Deployment failing)
  console.log("2. Deploying SpaceIdentityFactory... SKIPPED");
  // const SpaceIdentityFactory = await hre.ethers.getContractFactory("SpaceIdentityFactory");
  // const spaceIdentityFactory = await SpaceIdentityFactory.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, RELAYER_WALLET);
  // await spaceIdentityFactory.waitForDeployment();
  // const spaceIdentityFactoryAddress = await spaceIdentityFactory.getAddress();
  const spaceIdentityFactoryAddress = "0x0000000000000000000000000000000000000000";
  console.log(`   SpaceIdentityFactory skipped\n`);

  // 3. Deploy PublishQuests
  console.log("3. Deploying PublishQuests...");
  const PublishQuests = await hre.ethers.getContractFactory("PublishQuests");
  const publishQuests = await PublishQuests.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET);
  await publishQuests.waitForDeployment();
  const publishQuestsAddress = await publishQuests.getAddress();
  console.log(`   PublishQuests deployed to: ${publishQuestsAddress}\n`);

  // 4. Deploy QuestEscrow - SKIPPED for now to prioritize PublishQuests
  console.log("4. Deploying QuestEscrow... SKIPPED");
  // const QuestEscrow = await hre.ethers.getContractFactory("QuestEscrow");
  // const questEscrow = await QuestEscrow.deploy(REVENUE_WALLET, RELAYER_WALLET, ADMIN_ADDRESS);
  // await questEscrow.waitForDeployment();
  // const questEscrowAddress = await questEscrow.getAddress();
  const questEscrowAddress = "0x0000000000000000000000000000000000000000";
  console.log(`   QuestEscrow skipped\n`);

  // 5. Deploy ClaimIQ - SKIPPED for now
  console.log("5. Deploying ClaimIQ... SKIPPED");
  // const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
  // const claimIQ = await ClaimIQ.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, 1); 
  // await claimIQ.waitForDeployment();
  // const claimIQAddress = await claimIQ.getAddress();
  const claimIQAddress = "0x0000000000000000000000000000000000000000";
  console.log(`   ClaimIQ skipped\n`);

  // Summary
  console.log("========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`FeeWrapper:            ${feeWrapperAddress}`);
  console.log(`SpaceIdentityFactory:  ${spaceIdentityFactoryAddress}`);
  console.log(`PublishQuests:         ${publishQuestsAddress}`);
  console.log(`QuestEscrow:           ${questEscrowAddress}`);
  console.log(`ClaimIQ:               ${claimIQAddress}`);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });