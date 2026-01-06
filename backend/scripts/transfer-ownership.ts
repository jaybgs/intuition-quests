import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// QuestEscrow Contract ABI (ownership functions)
const QUEST_ESCROW_ABI = [
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  console.log('👑 Transferring QuestEscrow contract ownership...\n');

  // Configuration
  const QUEST_ESCROW_ADDRESS = '0xDaeb8F72678a723b273F7273c628Ad6d31cE3A4e';
  const RPC_URL = process.env.RPC_URL || process.env.INTUITION_RPC_URL || 'https://rpc.intuition.systems/http';

  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Missing PRIVATE_KEY in environment variables');
    console.error('💡 This should be the contract owner\'s private key');
    process.exit(1);
  }

  // Get new owner address from command line or use current wallet
  const newOwnerAddress = process.argv[2] || '0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07';

  try {
    // Setup blockchain connection
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const questEscrowContract = new ethers.Contract(QUEST_ESCROW_ADDRESS, QUEST_ESCROW_ABI, wallet);

    console.log(`🔗 Connected to QuestEscrow contract at: ${QUEST_ESCROW_ADDRESS}`);
    console.log(`👤 Using wallet address: ${wallet.address}`);
    console.log(`🎯 Transferring ownership to: ${newOwnerAddress}\n`);

    // Check current owner
    const currentOwner = await questEscrowContract.owner();
    console.log(`👑 Current owner: ${currentOwner}`);

    if (currentOwner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log('✅ You are the current owner');
    } else {
      console.log('❌ You are NOT the current owner');
      console.log('💡 Make sure PRIVATE_KEY belongs to the contract owner');
      return;
    }

    // Transfer ownership
    console.log(`\n🚀 Transferring ownership to ${newOwnerAddress}...`);

    const tx = await questEscrowContract.transferOwnership(newOwnerAddress);
    console.log(`⏳ Transaction submitted: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Ownership transfer successful! Gas used: ${receipt.gasUsed}`);

    // Verify new owner
    const verifyOwner = await questEscrowContract.owner();
    console.log(`🔍 Verified new owner: ${verifyOwner}`);

    if (verifyOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
      console.log('🎉 Ownership transfer completed successfully!');
    } else {
      console.log('⚠️  Ownership transfer may have failed - please verify');
    }

  } catch (error: any) {
    console.error('❌ Error during ownership transfer:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Ownership transfer process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
