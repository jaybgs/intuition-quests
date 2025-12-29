const hre = require("hardhat");

async function main() {
  // TRUST token address on Intuition chain
  const TRUST_TOKEN_ADDRESS = "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3";

  console.log("Deploying TrustQuestsPayment contract...\n");
  console.log(`TRUST Token Address: ${TRUST_TOKEN_ADDRESS}\n`);

  // Deploy TrustQuestsPayment contract
  console.log("Deploying TrustQuestsPayment...");
  const TrustQuestsPayment = await hre.ethers.getContractFactory("TrustQuestsPayment");
  const trustQuestsPayment = await TrustQuestsPayment.deploy(TRUST_TOKEN_ADDRESS);
  await trustQuestsPayment.waitForDeployment();
  const trustQuestsPaymentAddress = await trustQuestsPayment.getAddress();

  console.log(`✅ TrustQuestsPayment deployed to: ${trustQuestsPaymentAddress}`);
  console.log(`📝 Pro Plan Price: 10 TRUST tokens`);
  console.log(`🔐 Authorized Withdrawer: 0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`);

  // Save deployment info
  const deploymentInfo = {
    contractName: "TrustQuestsPayment",
    address: trustQuestsPaymentAddress,
    trustTokenAddress: TRUST_TOKEN_ADDRESS,
    proPlanPrice: "10 TRUST",
    authorizedWithdrawer: "0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07",
    deployedAt: new Date().toISOString(),
    network: "Intuition Chain (1155)"
  };

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return trustQuestsPaymentAddress;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment successful! Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
