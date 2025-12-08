import { getAddress, type Address, toHex, stringToHex } from 'viem';
import { useAccount, useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { intuitionChain } from '../config/wagmi';
// Contract services disabled - contracts deleted
// import { createTriplesWithFee, depositWithFee, estimateTransactionCost } from './transactionWrapperService';
import { createAtomFromString } from '@0xintuition/sdk';
import { getMultiVaultAddressFromChainId } from '@0xintuition/protocol';
import { showToast } from '../components/Toast';

export interface QuestCompletionParams {
  questId: string;
  questTitle: string;
  userAddress: Address;
  questAtomId?: `0x${string}`; // Atom ID created when quest was created
}

/**
 * Create a triple/claim for quest completion: [User][completed][Quest]
 * Then stake on that triple
 */
export async function completeQuestOnChain(
  params: QuestCompletionParams,
  walletClient: any,
  publicClient: any
): Promise<{ tripleId: `0x${string}`; txHash: string }> {
  try {
    const { questId, questTitle, userAddress, questAtomId } = params;

    // Step 1: Ensure we have quest atom ID (should be created when quest is created)
    if (!questAtomId) {
      throw new Error('Quest atom ID not found. Quest must be created on-chain first.');
    }

    // Step 2: Create or get the necessary atoms for the triple
    // Subject: User's identity atom (or create one)
    // Predicate: "completed" atom
    // Object: Quest atom (already exists)

    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);

    // Create "completed" predicate atom if it doesn't exist
    // For now, we'll assume it exists or create it
    // In production, you might want to check if it exists first
    
    // Create user identity atom (if needed)
    // For now, we'll use a simplified approach: create atoms inline
    
    // Step 3: Create the triple [User][completed][Quest]
    // For simplicity, we'll create the atoms and triple in one transaction
    
    // Create atoms needed for the triple
    const userAtomData = stringToHex(`user:${userAddress.toLowerCase()}`);
    const completedAtomData = stringToHex('completed');
    const questAtomData = stringToHex(`quest:${questTitle}`);

    // Note: We need to create atoms first, then create the triple
    // This is a simplified version - in production, you'd want to:
    // 1. Check if atoms exist
    // 2. Create only missing atoms
    // 3. Then create the triple

    // For now, let's create the triple assuming atoms exist
    // In a real implementation, you'd need to:
    // 1. Get or create user identity atom
    // 2. Get or create "completed" predicate atom
    // 3. Use questAtomId as object atom
    // 4. Create triple connecting them

    // Simplified: Create triple with existing quest atom
    // This assumes user atom and "completed" atom already exist
    // You'll need to implement atom creation/checking logic

    // Contract functionality disabled - contracts deleted
    throw new Error('Quest completion on-chain disabled - contracts deleted');

  } catch (error: any) {
    console.error('Error completing quest on-chain:', error);
    showToast(error.message || 'Failed to complete quest on-chain', 'error');
    throw error;
  }
}

/**
 * Stake on a quest completion triple (claim)
 */
export async function stakeOnQuestCompletion(
  tripleId: `0x${string}`,
  userAddress: Address,
  depositAmount: bigint,
  walletClient: any,
  publicClient: any
): Promise<{ shares: bigint; txHash: string }> {
  // Contract functionality disabled - contracts deleted
  throw new Error('Staking functionality disabled - contracts deleted');
  // try {
  //   // Use the wrapper to deposit (stake) on the triple
  //   const result = await depositWithFee(
  //     {
  //       receiver: userAddress,
  //       termId: tripleId,
  //       curveId: 0n, // Default curve
  //       minShares: 0n,
  //       depositAmount,
  //     },
  //     walletClient,
  //     publicClient
  //   );

  //   showToast('Successfully staked on quest completion!', 'success');
  //   return result;
  // } catch (error: any) {
  //   console.error('Error staking on quest completion:', error);
  //   showToast(error.message || 'Failed to stake on quest completion', 'error');
  //   throw error;
  // }
}

