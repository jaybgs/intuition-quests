import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// QuestEscrow Contract ABI (including owner functions)
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
      { "internalType": "string", "name": "questId", "type": "string" }
    ],
    "name": "getQuestDeposit",
    "outputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "distributedAmount", "type": "uint256" },
      { "internalType": "bool", "name": "isDistributed", "type": "bool" },
      { "internalType": "uint256", "name": "numberOfWinners", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "questId", "type": "string" }
    ],
    "name": "refundDeposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Add emergency withdrawal if it exists (we'll check)
  {
    "inputs": [{ "internalType": "address payable", "name": "to", "type": "address" }],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  console.log('🚨 Emergency withdrawal from QuestEscrow contract...\n');

  // Configuration
  const QUEST_ESCROW_ADDRESS = '0xDaeb8F72678a723b273F7273c628Ad6d31cE3A4e';
  const RPC_URL = process.env.RPC_URL || process.env.INTUITION_RPC_URL || 'https://rpc.intuition.systems/http';

  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Missing PRIVATE_KEY in environment variables');
    process.exit(1);
  }

  try {
    // Setup blockchain connection
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const questEscrowContract = new ethers.Contract(QUEST_ESCROW_ADDRESS, QUEST_ESCROW_ABI, wallet);

    console.log(`🔗 Connected to QuestEscrow contract at: ${QUEST_ESCROW_ADDRESS}`);
    console.log(`👤 Using wallet address: ${wallet.address}\n`);

    // Check contract balance
    const contractBalance = await provider.getBalance(QUEST_ESCROW_ADDRESS);
    const balanceInEther = ethers.formatEther(contractBalance);

    console.log(`💰 Contract ETH/TRUST Balance: ${balanceInEther} TRUST\n`);

    if (contractBalance === 0n) {
      console.log('✅ Contract has no funds to withdraw.');
      return;
    }

    // Check if we're the owner
    const owner = await questEscrowContract.owner();
    console.log(`👑 Contract owner: ${owner}`);
    console.log(`🔑 Our address: ${wallet.address}`);

    const isOwner = owner.toLowerCase() === wallet.address.toLowerCase();
    console.log(`🎯 Are we the owner? ${isOwner ? 'YES' : 'NO'}\n`);

    if (!isOwner) {
      console.log('❌ We are not the contract owner. Cannot perform emergency withdrawal.');
      console.log('💡 Only the contract owner can withdraw all funds.');
      return;
    }

    // Try emergency withdrawal if available
    console.log('🚨 Attempting emergency withdrawal...');

    try {
      const emergencyWithdrawTx = await questEscrowContract.emergencyWithdraw(wallet.address);
      console.log(`⏳ Emergency withdrawal transaction submitted: ${emergencyWithdrawTx.hash}`);

      const receipt = await emergencyWithdrawTx.wait();
      console.log(`✅ Emergency withdrawal successful! Gas used: ${receipt.gasUsed}`);

      // Check new balance
      const newBalance = await provider.getBalance(QUEST_ESCROW_ADDRESS);
      console.log(`📊 New contract balance: ${ethers.formatEther(newBalance)} TRUST`);

    } catch (emergencyError: any) {
      console.log(`❌ Emergency withdrawal function not available or failed: ${emergencyError.message}`);

      // Fallback: try to find and refund individual deposits
      console.log('\n🔄 Attempting to refund individual deposits...');

      // Since we don't have a way to enumerate all deposits, we'll need to check common quest patterns
      // This is a limitation of the current contract design

      console.log('⚠️  Cannot automatically find all deposits to refund.');
      console.log('💡 The contract design requires knowing specific quest IDs to refund.');
      console.log('💡 Consider adding an emergency withdrawal function to the contract.');

      // Alternative: transfer contract ownership and then call selfdestruct if possible
      // But this would require modifying the contract

      console.log('\n📋 RECOMMENDATION:');
      console.log('1. Add an emergency withdrawal function to the QuestEscrow contract');
      console.log('2. Or manually refund known quest deposits using the refund-quest-deposits.ts script');
      console.log('3. Or redeploy the contract with better admin controls');
    }

  } catch (error: any) {
    console.error('❌ Error during emergency withdrawal:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Emergency withdrawal process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
