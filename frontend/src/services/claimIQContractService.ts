/**
 * ClaimIQ Contract Service
 * Interacts with the ClaimIQ smart contract for quest completion and IQ awarding
 *
 * Flow:
 * 1. User calls claimQuest() with 1 TRUST
 * 2. Contract sends 1 TRUST to revenue wallet
 * 3. Contract creates completion triple on MultiVault
 * 4. Contract awards IQ points to user
 * 5. Frontend updates UI with new balance
 */

import { type Address, type Hash, formatEther, parseEther } from 'viem';
import { CLAIM_IQ_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { MULTIVAULT_ADDRESS } from '../contracts/addresses';

export interface ClaimQuestParams {
  questId: string;
  questAtomId: string;  // bytes32 atom ID from quest creation
  userAtomId: string;   // User's atom ID
  questTitle?: string;  // For display purposes
}

export interface ClaimQuestResult {
  tripleId: string;
  transactionHash: Hash;
  iqAwarded: number;
}

/**
 * Claim IQ points for completing a quest via ClaimIQ contract
 * User pays 1 TRUST, gets IQ points, and completion is recorded on-chain
 */
export async function claimQuestViaContract(
  params: ClaimQuestParams,
  walletClient: any,
  publicClient: any
): Promise<ClaimQuestResult> {
  const { questId, questAtomId, userAtomId, questTitle } = params;
  const userAddress = walletClient.account.address;

  console.log('=== Claiming Quest via ClaimIQ Contract ===');
  console.log('Quest:', questTitle || questId);
  console.log('Quest Atom ID:', questAtomId);
  console.log('User Atom ID:', userAtomId);
  console.log('User:', userAddress);

  // Check if user already claimed this quest
  const hasClaimed = await checkClaimStatus(userAddress, questId, publicClient);
  if (hasClaimed) {
    throw new Error('You have already claimed this quest.');
  }

  // Check if user has enough TRUST (1 TRUST)
  const balance = await publicClient.getBalance({ address: userAddress });
  const claimFee = parseEther('1'); // 1 TRUST

  if (balance < claimFee) {
    throw new Error(`Insufficient balance. Need 1 TRUST to claim, you have ${formatEther(balance)}.`);
  }

  console.log('Balance check passed:', formatEther(balance), 'TRUST');

  try {
    // Convert atom IDs to numbers (contracts expect uint256)
    const questAtomIdNum = BigInt(questAtomId);
    const userAtomIdNum = BigInt(userAtomId);

    console.log('Calling claimQuest on ClaimIQ contract...');
    console.log('Contract:', CONTRACT_ADDRESSES.CLAIM_IQ);
    console.log('Quest ID (bytes32):', questId);
    console.log('Quest Atom ID (uint256):', questAtomIdNum.toString());
    console.log('User Atom ID (uint256):', userAtomIdNum.toString());
    console.log('Fee: 1 TRUST');

    // Call claimQuest on ClaimIQ contract
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'claimQuest',
      args: [
        questId as `0x${string}`,  // bytes32 questId
        questAtomIdNum,            // uint256 questAtomId
        userAtomIdNum              // uint256 userAtomId
      ],
      value: claimFee,  // 1 TRUST
    });

    console.log('Transaction submitted:', hash);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    if (receipt.status !== 'success') {
      throw new Error('Claim transaction failed');
    }

    // Parse the triple ID from transaction logs or return data
    let tripleId = '0';

    // Try to extract tripleId from logs (ClaimIQ contract should emit QuestClaimed event)
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === CONTRACT_ADDRESSES.CLAIM_IQ.toLowerCase()) {
        try {
          // Parse QuestClaimed event
          const eventData = log.data;
          // Event signature: QuestClaimed(address,uint256,uint256,uint256,uint256)
          // We need the tripleId (third parameter, uint256)
          if (eventData && eventData.length >= 128) { // At least 4 uint256 parameters
            // Skip first 3 uint256 (address + questId + user + tripleId starts at offset 96)
            const tripleIdHex = eventData.slice(64 + 32, 64 + 64); // uint256 at position 3
            tripleId = BigInt('0x' + tripleIdHex).toString();
            break;
          }
        } catch (error) {
          console.warn('Could not parse triple ID from logs:', error);
        }
      }
    }

    // If we couldn't extract from logs, try calling a view function
    if (tripleId === '0') {
      try {
        // This would require the contract to have a function to query triple IDs
        console.warn('Could not extract triple ID from transaction logs');
      } catch (error) {
        console.warn('Could not get triple ID:', error);
      }
    }

    console.log('✅ Quest claimed successfully!');
    console.log('Triple ID:', tripleId);
    console.log('Transaction:', hash);

    // Get IQ awarded (should be 20 based on contract)
    const iqAwarded = 20;

    return {
      tripleId,
      transactionHash: hash,
      iqAwarded,
    };

  } catch (error: any) {
    console.error('Error claiming quest via contract:', error);

    // Provide user-friendly error messages
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient TRUST balance. You need 1 TRUST to claim IQ.');
    }
    if (error.message?.includes('Quest already claimed')) {
      throw new Error('You have already claimed this quest.');
    }
    if (error.message?.includes('Invalid quest atom')) {
      throw new Error('This quest is not valid for claiming.');
    }

    throw new Error(error.message || 'Failed to claim quest. Please try again.');
  }
}

/**
 * Check if user has already claimed a quest
 */
export async function checkClaimStatus(
  userAddress: Address,
  questId: string,
  publicClient: any
): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'hasClaimedQuest',
      args: [userAddress, questId as `0x${string}`],
    });

    return result as boolean;
  } catch (error) {
    console.warn('Error checking claim status:', error);
    return false; // Assume not claimed if we can't check
  }
}

/**
 * Get user's IQ balance from the contract
 */
export async function getUserIQBalance(
  userAddress: Address,
  publicClient: any
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'getUserIQBalance',
      args: [userAddress],
    });

    return balance as bigint;
  } catch (error) {
    console.warn('Error getting IQ balance:', error);
    return 0n;
  }
}

/**
 * Get claim cost (should be 1 TRUST)
 */
export async function getClaimCost(publicClient: any): Promise<bigint> {
  // The contract has a fixed CLAIM_FEE of 1 ether
  return parseEther('1');
}

/**
 * Check if a quest atom is valid for claiming
 */
export async function isValidQuestAtom(
  questAtomId: string,
  publicClient: any
): Promise<boolean> {
  try {
    const questAtomIdBytes = questAtomId as `0x${string}`;

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'validQuestAtoms',
      args: [questAtomIdBytes],
    });

    return result as boolean;
  } catch (error) {
    console.warn('Error checking quest atom validity:', error);
    return false;
  }
}
 * Interacts with the ClaimIQ smart contract for quest completion and IQ awarding
 *
 * Flow:
 * 1. User calls claimQuest() with 1 TRUST
 * 2. Contract sends 1 TRUST to revenue wallet
 * 3. Contract creates completion triple on MultiVault
 * 4. Contract awards IQ points to user
 * 5. Frontend updates UI with new balance
 */

import { type Address, type Hash, formatEther, parseEther } from 'viem';
import { CLAIM_IQ_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { MULTIVAULT_ADDRESS } from '../contracts/addresses';

export interface ClaimQuestParams {
  questId: string;
  questAtomId: string;  // bytes32 atom ID from quest creation
  userAtomId: string;   // User's atom ID
  questTitle?: string;  // For display purposes
}

export interface ClaimQuestResult {
  tripleId: string;
  transactionHash: Hash;
  iqAwarded: number;
}

/**
 * Claim IQ points for completing a quest via ClaimIQ contract
 * User pays 1 TRUST, gets IQ points, and completion is recorded on-chain
 */
export async function claimQuestViaContract(
  params: ClaimQuestParams,
  walletClient: any,
  publicClient: any
): Promise<ClaimQuestResult> {
  const { questId, questAtomId, userAtomId, questTitle } = params;
  const userAddress = walletClient.account.address;

  console.log('=== Claiming Quest via ClaimIQ Contract ===');
  console.log('Quest:', questTitle || questId);
  console.log('Quest Atom ID:', questAtomId);
  console.log('User Atom ID:', userAtomId);
  console.log('User:', userAddress);

  // Check if user already claimed this quest
  const hasClaimed = await checkClaimStatus(userAddress, questId, publicClient);
  if (hasClaimed) {
    throw new Error('You have already claimed this quest.');
  }

  // Check if user has enough TRUST (1 TRUST)
  const balance = await publicClient.getBalance({ address: userAddress });
  const claimFee = parseEther('1'); // 1 TRUST

  if (balance < claimFee) {
    throw new Error(`Insufficient balance. Need 1 TRUST to claim, you have ${formatEther(balance)}.`);
  }

  console.log('Balance check passed:', formatEther(balance), 'TRUST');

  try {
    // Convert atom IDs to numbers (contracts expect uint256)
    const questAtomIdNum = BigInt(questAtomId);
    const userAtomIdNum = BigInt(userAtomId);

    console.log('Calling claimQuest on ClaimIQ contract...');
    console.log('Contract:', CONTRACT_ADDRESSES.CLAIM_IQ);
    console.log('Quest ID (bytes32):', questId);
    console.log('Quest Atom ID (uint256):', questAtomIdNum.toString());
    console.log('User Atom ID (uint256):', userAtomIdNum.toString());
    console.log('Fee: 1 TRUST');

    // Call claimQuest on ClaimIQ contract
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'claimQuest',
      args: [
        questId as `0x${string}`,  // bytes32 questId
        questAtomIdNum,            // uint256 questAtomId
        userAtomIdNum              // uint256 userAtomId
      ],
      value: claimFee,  // 1 TRUST
    });

    console.log('Transaction submitted:', hash);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    if (receipt.status !== 'success') {
      throw new Error('Claim transaction failed');
    }

    // Parse the triple ID from transaction logs or return data
    let tripleId = '0';

    // Try to extract tripleId from logs (ClaimIQ contract should emit QuestClaimed event)
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === CONTRACT_ADDRESSES.CLAIM_IQ.toLowerCase()) {
        try {
          // Parse QuestClaimed event
          const eventData = log.data;
          // Event signature: QuestClaimed(address,uint256,uint256,uint256,uint256)
          // We need the tripleId (third parameter, uint256)
          if (eventData && eventData.length >= 128) { // At least 4 uint256 parameters
            // Skip first 3 uint256 (address + questId + user + tripleId starts at offset 96)
            const tripleIdHex = eventData.slice(64 + 32, 64 + 64); // uint256 at position 3
            tripleId = BigInt('0x' + tripleIdHex).toString();
            break;
          }
        } catch (error) {
          console.warn('Could not parse triple ID from logs:', error);
        }
      }
    }

    // If we couldn't extract from logs, try calling a view function
    if (tripleId === '0') {
      try {
        // This would require the contract to have a function to query triple IDs
        console.warn('Could not extract triple ID from transaction logs');
      } catch (error) {
        console.warn('Could not get triple ID:', error);
      }
    }

    console.log('✅ Quest claimed successfully!');
    console.log('Triple ID:', tripleId);
    console.log('Transaction:', hash);

    // Get IQ awarded (should be 20 based on contract)
    const iqAwarded = 20;

    return {
      tripleId,
      transactionHash: hash,
      iqAwarded,
    };

  } catch (error: any) {
    console.error('Error claiming quest via contract:', error);

    // Provide user-friendly error messages
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient TRUST balance. You need 1 TRUST to claim IQ.');
    }
    if (error.message?.includes('Quest already claimed')) {
      throw new Error('You have already claimed this quest.');
    }
    if (error.message?.includes('Invalid quest atom')) {
      throw new Error('This quest is not valid for claiming.');
    }

    throw new Error(error.message || 'Failed to claim quest. Please try again.');
  }
}

/**
 * Check if user has already claimed a quest
 */
export async function checkClaimStatus(
  userAddress: Address,
  questId: string,
  publicClient: any
): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'hasClaimedQuest',
      args: [userAddress, questId as `0x${string}`],
    });

    return result as boolean;
  } catch (error) {
    console.warn('Error checking claim status:', error);
    return false; // Assume not claimed if we can't check
  }
}

/**
 * Get user's IQ balance from the contract
 */
export async function getUserIQBalance(
  userAddress: Address,
  publicClient: any
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'getUserIQBalance',
      args: [userAddress],
    });

    return balance as bigint;
  } catch (error) {
    console.warn('Error getting IQ balance:', error);
    return 0n;
  }
}

/**
 * Get claim cost (should be 1 TRUST)
 */
export async function getClaimCost(publicClient: any): Promise<bigint> {
  // The contract has a fixed CLAIM_FEE of 1 ether
  return parseEther('1');
}

/**
 * Check if a quest atom is valid for claiming
 */
export async function isValidQuestAtom(
  questAtomId: string,
  publicClient: any
): Promise<boolean> {
  try {
    const questAtomIdBytes = questAtomId as `0x${string}`;

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CLAIM_IQ,
      abi: CLAIM_IQ_ABI,
      functionName: 'validQuestAtoms',
      args: [questAtomIdBytes],
    });

    return result as boolean;
  } catch (error) {
    console.warn('Error checking quest atom validity:', error);
    return false;
  }
}