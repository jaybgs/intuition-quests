import { type Address, type Hash, keccak256, toHex, encodePacked } from 'viem';
import { type WalletClient, type PublicClient } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { TRUST_TOKEN_ADDRESS } from '../App';

// QuestClaimSurcharge contract ABI
const QUEST_CLAIM_SURCHARGE_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'questId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'hasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'questId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'SURCHARGE_AMOUNT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    type: 'event',
    name: 'RevenueSent',
    inputs: [
      { name: 'questId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ForwardedToRelayer',
    inputs: [
      { name: 'questId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Claimed',
    inputs: [
      { name: 'questId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'AlreadyClaimed',
    inputs: [
      { name: 'questId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientBalance',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'required', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientAllowance',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'required', type: 'uint256' },
      { name: 'allowed', type: 'uint256' },
    ],
  },
] as const;

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const QUEST_CLAIM_SURCHARGE_ADDRESS = CONTRACT_ADDRESSES.QUEST_CLAIM_SURCHARGE;
const SURCHARGE_AMOUNT = BigInt(1e18); // 1 TRUST (18 decimals)

/**
 * Convert a string quest ID to uint256 by hashing it
 * This ensures compatibility with the contract's uint256 questId parameter
 */
function questIdToUint256(questId: string): bigint {
  // Hash the quest ID string to get a uint256
  const hash = keccak256(toHex(questId));
  // Take the first 32 bytes (uint256) from the hash
  return BigInt(hash);
}

/**
 * Check if user has already claimed a quest
 */
export async function checkIfClaimed(
  questId: string,
  userAddress: Address,
  publicClient: PublicClient
): Promise<boolean> {
  if (QUEST_CLAIM_SURCHARGE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    // Contract not deployed yet, return false
    return false;
  }

  try {
    const questIdUint = questIdToUint256(questId);
    const result = await publicClient.readContract({
      address: QUEST_CLAIM_SURCHARGE_ADDRESS,
      abi: QUEST_CLAIM_SURCHARGE_ABI,
      functionName: 'hasClaimed',
      args: [questIdUint, userAddress],
    });
    return result as boolean;
  } catch (error) {
    console.error('Error checking if quest is claimed:', error);
    return false;
  }
}

/**
 * Check user's TRUST balance
 */
export async function checkTrustBalance(
  userAddress: Address,
  publicClient: PublicClient
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: TRUST_TOKEN_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });
    return balance as bigint;
  } catch (error) {
    console.error('Error checking TRUST balance:', error);
    return BigInt(0);
  }
}

/**
 * Check user's approval for the contract
 */
export async function checkApproval(
  userAddress: Address,
  publicClient: PublicClient
): Promise<bigint> {
  if (QUEST_CLAIM_SURCHARGE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return BigInt(0);
  }

  try {
    const allowance = await publicClient.readContract({
      address: TRUST_TOKEN_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, QUEST_CLAIM_SURCHARGE_ADDRESS],
    });
    return allowance as bigint;
  } catch (error) {
    console.error('Error checking approval:', error);
    return BigInt(0);
  }
}

/**
 * Approve the contract to spend TRUST tokens
 */
export async function approveTrustToken(
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<Hash> {
  if (QUEST_CLAIM_SURCHARGE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestClaimSurcharge contract not deployed');
  }

  const [account] = await walletClient.getAddresses();
  if (!account) {
    throw new Error('No account connected');
  }

  // Approve a large amount to avoid repeated approvals
  const approvalAmount = BigInt(1e24); // 1 million TRUST (should be enough for many claims)

  const hash = await walletClient.writeContract({
    address: TRUST_TOKEN_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [QUEST_CLAIM_SURCHARGE_ADDRESS, approvalAmount],
    account,
  });

  // Wait for transaction receipt
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Claim a quest by paying the 1 TRUST surcharge
 */
export async function claimQuest(
  questId: string,
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<Hash> {
  if (QUEST_CLAIM_SURCHARGE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestClaimSurcharge contract not deployed');
  }

  const [account] = await walletClient.getAddresses();
  if (!account) {
    throw new Error('No account connected');
  }

  const questIdUint = questIdToUint256(questId);

  const hash = await walletClient.writeContract({
    address: QUEST_CLAIM_SURCHARGE_ADDRESS,
    abi: QUEST_CLAIM_SURCHARGE_ABI,
    functionName: 'claim',
    args: [questIdUint],
    account,
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  // Verify transaction was successful
  if (receipt.status !== 'success') {
    throw new Error('Transaction failed');
  }

  return hash;
}

/**
 * Get the surcharge amount (1 TRUST)
 */
export function getSurchargeAmount(): bigint {
  return SURCHARGE_AMOUNT;
}
