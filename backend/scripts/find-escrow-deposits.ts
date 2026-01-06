import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// QuestEscrow Contract ABI
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
  },
  {
    "inputs": [
      { "internalType": "string", "name": "questId", "type": "string" }
    ],
    "name": "refundDeposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  console.log('🔍 Finding and withdrawing all quest deposits from escrow...\n');

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

    // Get all quests from database
    const { data: allQuests, error: dbError } = await supabase
      .from('published_quests')
      .select('id, title, reward_deposit, creator_address, status, expires_at');

    if (dbError) {
      console.error('❌ Error fetching quests from database:', dbError.message);
      return;
    }

    console.log(`📊 Found ${allQuests?.length || 0} quests in database\n`);

    // Check each quest for deposits
    const questsWithContractDeposits = [];
    let totalContractDeposits = 0n;

    for (const quest of allQuests || []) {
      try {
        console.log(`🔍 Checking quest: ${quest.title} (${quest.id})`);

        const depositInfo = await questEscrowContract.getQuestDeposit(quest.id);
        const [creator, totalAmount, distributedAmount, isDistributed, numberOfWinners] = depositInfo;

        const depositAmount = ethers.formatEther(totalAmount);
        const distributedAmountFormatted = ethers.formatEther(distributedAmount);

        if (parseFloat(depositAmount) > 0) {
          console.log(`   ✅ Found deposit: ${depositAmount} TRUST`);
          console.log(`   👤 Creator: ${creator}`);
          console.log(`   💸 Distributed: ${distributedAmountFormatted} TRUST`);
          console.log(`   🎯 Winners: ${numberOfWinners}`);
          console.log(`   ✅ Is distributed: ${isDistributed}`);

          questsWithContractDeposits.push({
            ...quest,
            contractDeposit: depositAmount,
            contractCreator: creator,
            distributedAmount: distributedAmountFormatted,
            isDistributed,
            numberOfWinners: Number(numberOfWinners)
          });

          totalContractDeposits += totalAmount;
          console.log(`   🎉 Added to withdrawal list\n`);
        } else {
          console.log(`   ❌ No deposit found\n`);
        }

      } catch (error: any) {
        console.log(`   ⚠️  Error checking contract: ${error.message}\n`);
      }
    }

    if (questsWithContractDeposits.length === 0) {
      console.log('❌ No quests with contract deposits found.');
      console.log('💡 This means the 0.2 TRUST in the contract may be from:');
      console.log('   - Failed transactions');
      console.log('   - Direct transfers to the contract');
      console.log('   - Old deposits not tracked in database');
      console.log('   - Contract self-destruction or other mechanisms');

      // Check contract balance to confirm
      const contractBalance = await provider.getBalance(QUEST_ESCROW_ADDRESS);
      console.log(`\n💰 Contract still holds: ${ethers.formatEther(contractBalance)} TRUST`);

      return;
    }

    console.log(`🎯 Found ${questsWithContractDeposits.length} quests with deposits`);
    console.log(`💰 Total contract deposits: ${ethers.formatEther(totalContractDeposits)} TRUST\n`);

    // Withdraw all deposits
    console.log('🚀 Starting withdrawal process...\n');

    for (const quest of questsWithContractDeposits) {
      try {
        console.log(`💸 Refunding quest: ${quest.title} (${quest.id})`);
        console.log(`   Amount: ${quest.contractDeposit} TRUST`);
        console.log(`   To creator: ${quest.contractCreator}`);

        // Check if we can refund (must be the creator)
        if (quest.contractCreator.toLowerCase() !== wallet.address.toLowerCase()) {
          console.log(`   ❌ Cannot refund: We are not the quest creator`);
          console.log(`   Expected creator: ${quest.contractCreator}`);
          console.log(`   Our address: ${wallet.address}\n`);
          continue;
        }

        // Check if already distributed
        if (quest.isDistributed) {
          console.log(`   ❌ Cannot refund: Rewards already distributed\n`);
          continue;
        }

        // Call refundDeposit
        const tx = await questEscrowContract.refundDeposit(quest.id);
        console.log(`   ⏳ Transaction submitted: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`   ✅ Refund successful! Gas used: ${receipt.gasUsed}\n`);

      } catch (refundError: any) {
        console.error(`   ❌ Refund failed: ${refundError.message}\n`);
      }
    }

    // Final balance check
    const finalBalance = await provider.getBalance(QUEST_ESCROW_ADDRESS);
    console.log(`📊 Final contract balance: ${ethers.formatEther(finalBalance)} TRUST`);

    if (finalBalance === 0n) {
      console.log('🎉 All deposits successfully withdrawn!');
    } else {
      console.log(`⚠️  ${ethers.formatEther(finalBalance)} TRUST still remains in contract`);
    }

  } catch (error: any) {
    console.error('❌ Error during deposit withdrawal:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Deposit withdrawal process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
