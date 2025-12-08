import hre from "hardhat";

async function main() {
  const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
  const RELAYER_WALLET = "0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2";
  const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const ADMIN_ADDRESS = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  console.log("Deploying contracts to Intuition Chain...\n");

  // 1. Deploy FeeWrapper
  console.log("1. Deploying FeeWrapper...");
  const FeeWrapper = await hre.ethers.getContractFactory("FeeWrapper");
  const feeWrapper = await FeeWrapper.deploy(REVENUE_WALLET, ADMIN_ADDRESS);
  await feeWrapper.waitForDeployment();
  const feeWrapperAddress = await feeWrapper.getAddress();
  console.log(`   FeeWrapper deployed to: ${feeWrapperAddress}\n`);

  // 2. Deploy SpaceIdentityFactory
  console.log("2. Deploying SpaceIdentityFactory...");
  const SpaceIdentityFactory = await hre.ethers.getContractFactory("SpaceIdentityFactory");
  const spaceIdentityFactory = await SpaceIdentityFactory.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, RELAYER_WALLET);
  await spaceIdentityFactory.waitForDeployment();
  const spaceIdentityFactoryAddress = await spaceIdentityFactory.getAddress();
  console.log(`   SpaceIdentityFactory deployed to: ${spaceIdentityFactoryAddress}\n`);

  // 3. Deploy QuestAtomFactory
  console.log("3. Deploying QuestAtomFactory...");
  const QuestAtomFactory = await hre.ethers.getContractFactory("QuestAtomFactory");
  const questAtomFactory = await QuestAtomFactory.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET);
  await questAtomFactory.waitForDeployment();
  const questAtomFactoryAddress = await questAtomFactory.getAddress();
  console.log(`   QuestAtomFactory deployed to: ${questAtomFactoryAddress}\n`);

  // 4. Deploy QuestEscrow
  console.log("4. Deploying QuestEscrow...");
  const QuestEscrow = await hre.ethers.getContractFactory("QuestEscrow");
  const questEscrow = await QuestEscrow.deploy(REVENUE_WALLET, RELAYER_WALLET, ADMIN_ADDRESS);
  await questEscrow.waitForDeployment();
  const questEscrowAddress = await questEscrow.getAddress();
  console.log(`   QuestEscrow deployed to: ${questEscrowAddress}\n`);

  // 5. Deploy ClaimIQ
  console.log("5. Deploying ClaimIQ...");
  const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
  const claimIQ = await ClaimIQ.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, RELAYER_WALLET);
  await claimIQ.waitForDeployment();
  const claimIQAddress = await claimIQ.getAddress();
  console.log(`   ClaimIQ deployed to: ${claimIQAddress}\n`);

  // Summary
  console.log("========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`FeeWrapper:            ${feeWrapperAddress}`);
  console.log(`SpaceIdentityFactory:  ${spaceIdentityFactoryAddress}`);
  console.log(`QuestAtomFactory:      ${questAtomFactoryAddress}`);
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

async function main() {
  const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
  const RELAYER_WALLET = "0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2";
  const REVENUE_WALLET = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";
  const ADMIN_ADDRESS = "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07";

  console.log("Deploying contracts to Intuition Chain...\n");

  // 1. Deploy FeeWrapper
  console.log("1. Deploying FeeWrapper...");
  const FeeWrapper = await hre.ethers.getContractFactory("FeeWrapper");
  const feeWrapper = await FeeWrapper.deploy(REVENUE_WALLET, ADMIN_ADDRESS);
  await feeWrapper.waitForDeployment();
  const feeWrapperAddress = await feeWrapper.getAddress();
  console.log(`   FeeWrapper deployed to: ${feeWrapperAddress}\n`);

  // 2. Deploy SpaceIdentityFactory
  console.log("2. Deploying SpaceIdentityFactory...");
  const SpaceIdentityFactory = await hre.ethers.getContractFactory("SpaceIdentityFactory");
  const spaceIdentityFactory = await SpaceIdentityFactory.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, RELAYER_WALLET);
  await spaceIdentityFactory.waitForDeployment();
  const spaceIdentityFactoryAddress = await spaceIdentityFactory.getAddress();
  console.log(`   SpaceIdentityFactory deployed to: ${spaceIdentityFactoryAddress}\n`);

  // 3. Deploy QuestAtomFactory
  console.log("3. Deploying QuestAtomFactory...");
  const QuestAtomFactory = await hre.ethers.getContractFactory("QuestAtomFactory");
  const questAtomFactory = await QuestAtomFactory.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET);
  await questAtomFactory.waitForDeployment();
  const questAtomFactoryAddress = await questAtomFactory.getAddress();
  console.log(`   QuestAtomFactory deployed to: ${questAtomFactoryAddress}\n`);

  // 4. Deploy QuestEscrow
  console.log("4. Deploying QuestEscrow...");
  const QuestEscrow = await hre.ethers.getContractFactory("QuestEscrow");
  const questEscrow = await QuestEscrow.deploy(REVENUE_WALLET, RELAYER_WALLET, ADMIN_ADDRESS);
  await questEscrow.waitForDeployment();
  const questEscrowAddress = await questEscrow.getAddress();
  console.log(`   QuestEscrow deployed to: ${questEscrowAddress}\n`);

  // 5. Deploy ClaimIQ
  console.log("5. Deploying ClaimIQ...");
  const ClaimIQ = await hre.ethers.getContractFactory("ClaimIQ");
  const claimIQ = await ClaimIQ.deploy(MULTIVAULT_ADDRESS, REVENUE_WALLET, RELAYER_WALLET);
  await claimIQ.waitForDeployment();
  const claimIQAddress = await claimIQ.getAddress();
  console.log(`   ClaimIQ deployed to: ${claimIQAddress}\n`);

  // Summary
  console.log("========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`FeeWrapper:            ${feeWrapperAddress}`);
  console.log(`SpaceIdentityFactory:  ${spaceIdentityFactoryAddress}`);
  console.log(`QuestAtomFactory:      ${questAtomFactoryAddress}`);
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