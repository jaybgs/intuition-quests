/**
 * Quest Escrow Service
 * Handles deposits to QuestEscrow contract for quest rewards
 * No fees - direct payment to escrow only
 */

import { type Address, type Hash, parseEther, formatEther, keccak256, stringToHex } from 'viem';
import { CONTRACT_ADDRESSES, isContractDeployed } from '../contracts/addresses';
import { QUEST_ESCROW_ABI } from '../contracts/abis';

export interface DepositToEscrowParams {
  questId: string;
  numberOfWinners: number;
  expiresAt: number; // Unix timestamp
  distributionType: 'raffle' | 'first-come-first-served' | 'merit-based';
}

export interface DepositToEscrowResult {
  transactionHash: Hash;
}

/**
 * Convert quest ID string to bytes32
 */
export function questIdToBytes32(questId: string): `0x${string}` {
  return keccak256(stringToHex(questId)) as `0x${string}`;
}

/**
 * Deposit TRUST tokens to escrow for quest rewards
 */
export async function depositToEscrow(
  params: DepositToEscrowParams,
  amount: string, // Amount in TRUST (e.g., "0.1")
  walletClient: any,
  publicClient: any
): Promise<DepositToEscrowResult> {
  const { questId, numberOfWinners, expiresAt, distributionType } = params;
  
  if (!isContractDeployed(CONTRACT_ADDRESSES.QUEST_ESCROW)) {
    throw new Error('QuestEscrow contract is not deployed');
  }
  
  try {
    const questIdBytes = questIdToBytes32(questId);
    const amountWei = parseEther(amount);
    
    // Call deposit function
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.QUEST_ESCROW,
      abi: QUEST_ESCROW_ABI,
      functionName: 'deposit',
      args: [questIdBytes, BigInt(numberOfWinners), BigInt(expiresAt), distributionType],
      value: amountWei,
    });
    
    // Wait for transaction
    await publicClient.waitForTransactionReceipt({ hash });
    
    return { transactionHash: hash };
  } catch (error: any) {
    console.error('Error depositing to escrow:', error);
    throw error;
  }
}

/**
 * Check the balance of a quest deposit
 */
export async function checkBalance(
  questId: string,
  publicClient: any
): Promise<{ totalAmount: bigint; numberOfWinners: number; isDistributed: boolean }> {
  if (!isContractDeployed(CONTRACT_ADDRESSES.QUEST_ESCROW)) {
    throw new Error('QuestEscrow contract is not deployed');
  }
  
  try {
    const questIdBytes = questIdToBytes32(questId);
    
    const deposit = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.QUEST_ESCROW,
      abi: QUEST_ESCROW_ABI,
      functionName: 'getQuestDeposit',
      args: [questIdBytes],
    }) as [bigint, bigint, boolean, Address, bigint, string];
    
    return {
      totalAmount: deposit[0],
      numberOfWinners: Number(deposit[1]),
      isDistributed: deposit[2],
    };
  } catch (error: any) {
    console.error('Error checking escrow balance:', error);
    throw error;
  }
}

/**
 * Get quest deposit details
 */
export async function getQuestDeposit(
  questId: string,
  publicClient: any
): Promise<{
  totalAmount: bigint;
  numberOfWinners: number;
  isDistributed: boolean;
  depositor: Address;
  expiresAt: bigint;
  distributionType: string;
}> {
  if (!isContractDeployed(CONTRACT_ADDRESSES.QUEST_ESCROW)) {
    throw new Error('QuestEscrow contract is not deployed');
  }
  
  try {
    const questIdBytes = questIdToBytes32(questId);
    
    const deposit = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.QUEST_ESCROW,
      abi: QUEST_ESCROW_ABI,
      functionName: 'getQuestDeposit',
      args: [questIdBytes],
    }) as [bigint, bigint, boolean, Address, bigint, string];
    
    return {
      totalAmount: deposit[0],
      numberOfWinners: Number(deposit[1]),
      isDistributed: deposit[2],
      depositor: deposit[3],
      expiresAt: deposit[4],
      distributionType: deposit[5],
    };
  } catch (error: any) {
    console.error('Error getting quest deposit:', error);
    throw error;
  }
}

/**
 * Get quest status
 */
export async function getQuestStatus(
  questId: string,
  publicClient: any
): Promise<{
  hasDeposit: boolean;
  isExpired: boolean;
  winnersSet: boolean;
  isDistributed: boolean;
  timeRemaining: bigint;
  expiresAt: bigint;
}> {
  if (!isContractDeployed(CONTRACT_ADDRESSES.QUEST_ESCROW)) {
    throw new Error('QuestEscrow contract is not deployed');
  }
  
  try {
    const questIdBytes = questIdToBytes32(questId);
    
    const status = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.QUEST_ESCROW,
      abi: QUEST_ESCROW_ABI,
      functionName: 'getQuestStatus',
      args: [questIdBytes],
    }) as [boolean, boolean, boolean, boolean, bigint, bigint];
    
    return {
      hasDeposit: status[0],
      isExpired: status[1],
      winnersSet: status[2],
      isDistributed: status[3],
      timeRemaining: status[4],
      expiresAt: status[5],
    };
  } catch (error: any) {
    console.error('Error getting quest status:', error);
    throw error;
  }
}
