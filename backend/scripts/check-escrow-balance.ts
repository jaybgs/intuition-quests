import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: './.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// QuestEscrow Contract ABI (only the functions we need)
const QUEST_ESCROW_ABI = [
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
  }
];

async function main() {
  console.log('🔍 Checking QuestEscrow contract balance...\n');

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

    // Get contract balance (ETH/TRUST balance)
    const contractBalance = await provider.getBalance(QUEST_ESCROW_ADDRESS);
    const balanceInEther = ethers.formatEther(contractBalance);

    console.log(`💰 Contract ETH/TRUST Balance: ${balanceInEther} TRUST\n`);

    // Get all quests from database that have deposits
    console.log('📊 Checking individual quest deposits...\n');

    const { data: questsWithDeposits, error: dbError } = await supabase
      .from('published_quests')
      .select('id, title, reward_deposit, creator_address')
      .not('reward_deposit', 'is', null);

    if (dbError) {
      console.error('❌ Error fetching quests from database:', dbError.message);
    }

    const questIds = questsWithDeposits?.map(q => q.id) || [];
    console.log(`📋 Found ${questIds.length} quests with deposits in database`);

    let totalDeposits = 0n;
    let questCount = 0;

    for (const questId of testQuestIds) {
      try {
        console.log(`🔍 Checking quest: ${questId}`);

        const depositInfo = await questEscrowContract.getQuestDeposit(questId);
        const [creator, totalAmount, distributedAmount, isDistributed, numberOfWinners] = depositInfo;

        const depositAmount = ethers.formatEther(totalAmount);
        const distributedAmountFormatted = ethers.formatEther(distributedAmount);

        if (parseFloat(depositAmount) > 0) {
          console.log(`   ✅ Has deposit: ${depositAmount} TRUST`);
          console.log(`   👤 Creator: ${creator}`);
          console.log(`   💸 Distributed: ${distributedAmountFormatted} TRUST`);
          console.log(`   🎯 Winners: ${numberOfWinners}`);
          console.log(`   ✅ Is distributed: ${isDistributed}\n`);

          totalDeposits += totalAmount;
          questCount++;
        } else {
          console.log(`   ❌ No deposit found\n`);
        }

      } catch (error: any) {
        console.log(`   ⚠️  Error checking quest: ${error.message}\n`);
      }
    }

    const totalDepositsFormatted = ethers.formatEther(totalDeposits);
    console.log(`📈 SUMMARY:`);
    console.log(`   Total quests with deposits: ${questCount}`);
    console.log(`   Total deposited amount: ${totalDepositsFormatted} TRUST`);
    console.log(`   Contract balance: ${balanceInEther} TRUST`);

    if (parseFloat(totalDepositsFormatted) !== parseFloat(balanceInEther)) {
      console.log(`   ⚠️  WARNING: Deposit total (${totalDepositsFormatted}) doesn't match contract balance (${balanceInEther})`);
    } else {
      console.log(`   ✅ Deposit total matches contract balance`);
    }

  } catch (error: any) {
    console.error('❌ Error checking escrow balance:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Balance check completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
