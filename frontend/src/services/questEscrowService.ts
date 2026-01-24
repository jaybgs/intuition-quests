/**
 * Quest Escrow Service
 * Frontend service for interacting with QuestEscrow smart contract
 * 
 * Features:
 * - Deposit TRUST for quest rewards
 * - Distribute rewards to winners
 * - Refund deposits after grace period
 * - Check deposit status
 */

import { formatEther, parseEther, keccak256, toHex, type Hash } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';

// Export the escrow address for use in other components
export const QUEST_ESCROW_ADDRESS = CONTRACT_ADDRESSES.QUEST_ESCROW;

// QuestEscrow ABI
const QUEST_ESCROW_ABI = [
  // Deposit functions
  {
    name: 'depositReward',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'expiresAt', type: 'uint256' }
    ],
    outputs: [],
  },
  {
    name: 'addToDeposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [],
  },
  // Distribution functions
  {
    name: 'distributeRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'winners', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' }
    ],
    outputs: [],
  },
  {
    name: 'distributeSingleReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
  },
  // Refund
  {
    name: 'refundDeposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [],
  },
  // View functions
  {
    name: 'getQuestDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'distributed', type: 'uint256' },
      { name: 'remaining', type: 'uint256' },
      { name: 'depositedAt', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'completionCount', type: 'uint256' }
    ],
  },
  {
    name: 'hasActiveDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getRemainingBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'canRefund',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getWinnerPayout',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'winner', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getContractBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  // Constants
  {
    name: 'GRACE_PERIOD',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'MIN_DEPOSIT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Helper to convert quest ID string to bytes32
export function questIdToBytes32(questId: string): `0x${string}` {
  return keccak256(toHex(questId));
}

/**
 * Deposit options interface
 */
interface DepositOptions {
  questId: string;
  numberOfWinners?: number;
  expiresAt: number;
  distributionType?: string;
}

/**
 * Deposit TRUST tokens for a quest reward
 */
export async function depositToEscrow(
  options: DepositOptions,
  amount: string, // Amount in TRUST (e.g., "10")
  walletClient: any,
  publicClient: any
): Promise<{ hash: `0x${string}`; questIdBytes32: `0x${string}`; transactionHash: `0x${string}` }> {
  const { questId, expiresAt } = options;
  const questIdBytes32 = questIdToBytes32(questId);
  const amountWei = parseEther(amount);

  // Convert expiresAt from milliseconds to seconds if needed
  const expiresAtSeconds = expiresAt > 1e12 ? Math.floor(expiresAt / 1000) : expiresAt;

  console.log('💰 Depositing to QuestEscrow...');
  console.log('  Quest ID:', questId);
  console.log('  Quest ID (bytes32):', questIdBytes32);
  console.log('  Amount:', amount, 'TRUST');
  console.log('  Expires:', new Date(expiresAtSeconds * 1000).toISOString());
  console.log('  Contract:', QUEST_ESCROW_ADDRESS);

  const hash = await walletClient.writeContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'depositReward',
    args: [questIdBytes32, BigInt(expiresAtSeconds)],
    value: amountWei,
  });

  console.log('📝 Transaction hash:', hash);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    throw new Error('Deposit transaction failed');
  }

  console.log('✅ Deposit confirmed!');

  return { hash, questIdBytes32, transactionHash: hash };
}

/**
 * Distribute rewards to winners
 */
export async function distributeRewards(
  questId: string,
  winners: string[],
  amounts: string[], // Amounts in TRUST
  walletClient: any,
  publicClient: any
): Promise<Hash> {
  const questIdBytes32 = questIdToBytes32(questId);
  const amountsWei = amounts.map(a => parseEther(a));

  console.log('🎁 Distributing rewards...');
  console.log('  Quest ID:', questId);
  console.log('  Winners:', winners.length);
  console.log('  Amounts:', amounts.join(', '), 'TRUST');

  const hash = await walletClient.writeContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'distributeRewards',
    args: [questIdBytes32, winners as `0x${string}`[], amountsWei],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    throw new Error('Distribution transaction failed');
  }

  console.log('✅ Rewards distributed!');

  return hash;
}

/**
 * Distribute reward to a single winner
 */
export async function distributeSingleReward(
  questId: string,
  winner: string,
  amount: string,
  walletClient: any,
  publicClient: any
): Promise<Hash> {
  const questIdBytes32 = questIdToBytes32(questId);
  const amountWei = parseEther(amount);

  console.log('🎁 Distributing single reward...');
  console.log('  Quest ID:', questId);
  console.log('  Winner:', winner);
  console.log('  Amount:', amount, 'TRUST');

  const hash = await walletClient.writeContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'distributeSingleReward',
    args: [questIdBytes32, winner as `0x${string}`, amountWei],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    throw new Error('Distribution transaction failed');
  }

  console.log('✅ Reward distributed to', winner);

  return hash;
}

/**
 * Refund remaining deposit to quest creator
 */
export async function refundDeposit(
  questId: string,
  walletClient: any,
  publicClient: any
): Promise<Hash> {
  const questIdBytes32 = questIdToBytes32(questId);

  console.log('💸 Requesting refund...');
  console.log('  Quest ID:', questId);

  const hash = await walletClient.writeContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'refundDeposit',
    args: [questIdBytes32],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    throw new Error('Refund transaction failed');
  }

  console.log('✅ Refund processed!');

  return hash;
}

// ============================================
// VIEW FUNCTIONS
// ============================================

/**
 * Get deposit details for a quest
 */
export async function getQuestDeposit(
  questId: string,
  publicClient: any
): Promise<{
  creator: string;
  amount: string;
  distributed: string;
  remaining: string;
  depositedAt: number;
  expiresAt: number;
  isActive: boolean;
  completionCount: number;
}> {
  const questIdBytes32 = questIdToBytes32(questId);

  const result = await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'getQuestDeposit',
    args: [questIdBytes32],
  }) as [string, bigint, bigint, bigint, bigint, bigint, boolean, bigint];

  return {
    creator: result[0],
    amount: formatEther(result[1]),
    distributed: formatEther(result[2]),
    remaining: formatEther(result[3]),
    depositedAt: Number(result[4]),
    expiresAt: Number(result[5]),
    isActive: result[6],
    completionCount: Number(result[7]),
  };
}

/**
 * Check if quest has active deposit
 */
export async function hasActiveDeposit(
  questId: string,
  publicClient: any
): Promise<boolean> {
  const questIdBytes32 = questIdToBytes32(questId);

  return await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'hasActiveDeposit',
    args: [questIdBytes32],
  }) as boolean;
}

/**
 * Get remaining balance for a quest
 */
export async function getRemainingBalance(
  questId: string,
  publicClient: any
): Promise<string> {
  const questIdBytes32 = questIdToBytes32(questId);

  const result = await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'getRemainingBalance',
    args: [questIdBytes32],
  }) as bigint;

  return formatEther(result);
}

/**
 * Check if refund is available
 */
export async function canRefund(
  questId: string,
  publicClient: any
): Promise<boolean> {
  const questIdBytes32 = questIdToBytes32(questId);

  return await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'canRefund',
    args: [questIdBytes32],
  }) as boolean;
}

/**
 * Get contract balance
 */
export async function getContractBalance(
  publicClient: any
): Promise<string> {
  const result = await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'getContractBalance',
  }) as bigint;

  return formatEther(result);
}

/**
 * Get grace period (in seconds)
 */
export async function getGracePeriod(
  publicClient: any
): Promise<number> {
  const result = await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'GRACE_PERIOD',
  }) as bigint;

  return Number(result);
}

/**
 * Get minimum deposit amount
 */
export async function getMinDeposit(
  publicClient: any
): Promise<string> {
  const result = await publicClient.readContract({
    address: QUEST_ESCROW_ADDRESS,
    abi: QUEST_ESCROW_ABI,
    functionName: 'MIN_DEPOSIT',
  }) as bigint;

  return formatEther(result);
}

/**
 * Check user balance before deposit
 */
export async function checkBalance(
  userAddress: string,
  publicClient: any
): Promise<string> {
  const balance = await publicClient.getBalance({
    address: userAddress as `0x${string}`,
  });

  return formatEther(balance);
}
