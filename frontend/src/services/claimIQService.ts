/**
 * Claim IQ Service
 * Creates completion triples on Intuition chain
 * Triple format: "[User Wallet] completed [Quest]"
 * 
 * Flow:
 * 1. Get or create user atom (represents user's wallet address)
 * 2. Get or create "completed" predicate atom
 * 3. Use existing quest atom (created when quest was published)
 * 4. Create triple: [User] completed [Quest]
 */

import { type Address, type Hash, formatEther, toHex } from 'viem';
import { MULTIVAULT_ADDRESS } from '../contracts/addresses';

const multiVaultAddress = MULTIVAULT_ADDRESS;

// Correct MultiVault ABI with bytes32 for triple IDs
const MULTIVAULT_ABI = [
  {
    name: 'getAtomCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getTripleCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'createAtoms',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'data', type: 'bytes[]' },
      { name: 'assets', type: 'uint256[]' },
    ],
    outputs: [{ type: 'bytes32[]' }],
  },
  {
    name: 'createTriples',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'subjectIds', type: 'bytes32[]' },
      { name: 'predicateIds', type: 'bytes32[]' },
      { name: 'objectIds', type: 'bytes32[]' },
      { name: 'assets', type: 'uint256[]' },
    ],
    outputs: [{ type: 'bytes32[]' }],
  },
] as const;

// Cache for atom IDs
let completedPredicateAtomId: string | null = null;

export interface ClaimQuestParams {
  questId: string;
  questAtomId: string;  // bytes32 atom ID from quest creation
  questTitle: string;   // For display purposes
}

export interface ClaimQuestResult {
  tripleId: string;
  transactionHash: Hash;
  userAtomId: string;
}

/**
 * Extract atom ID from transaction logs
 */
function extractAtomIdFromLogs(logs: any[]): string | null {
  for (const log of logs) {
    if (log.address?.toLowerCase() === multiVaultAddress.toLowerCase() &&
        log.topics?.length === 3 &&
        log.data?.length === 66) {
      const potentialId = log.topics[1];
      if (potentialId && !potentialId.startsWith('0x00000000000000000000000')) {
        return potentialId;
      }
    }
  }
  return null;
}

/**
 * Get or create a user atom representing the user's wallet address
 */
async function getOrCreateUserAtom(
  userAddress: string,
  walletClient: any,
  publicClient: any
): Promise<string> {
  // Check localStorage cache
  const userAtoms = JSON.parse(localStorage.getItem('user_atoms') || '{}');
  if (userAtoms[userAddress.toLowerCase()]) {
    console.log('Using cached user atom:', userAtoms[userAddress.toLowerCase()]);
    return userAtoms[userAddress.toLowerCase()];
  }
  
  // Get atom cost
  const atomCost = await publicClient.readContract({
    address: multiVaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'getAtomCost',
  }) as bigint;
  
  // Create user atom with wallet address as data
  // Format: "TrustQuests User: 0x..." for identification
  const atomData = `TrustQuests User: ${userAddress}`;
  const atomDataBytes = toHex(new TextEncoder().encode(atomData));
  
  console.log('Creating user atom for:', userAddress);
  
  const hash = await walletClient.writeContract({
    address: multiVaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'createAtoms',
    args: [[atomDataBytes], [atomCost]],
    value: atomCost,
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const atomId = extractAtomIdFromLogs(receipt.logs);
  
  if (!atomId) {
    throw new Error('Failed to extract user atom ID from transaction');
  }
  
  // Cache the user atom
  userAtoms[userAddress.toLowerCase()] = atomId;
  localStorage.setItem('user_atoms', JSON.stringify(userAtoms));
  
  console.log('Created user atom:', atomId);
  return atomId;
}

/**
 * Get or create the "completed" predicate atom
 */
async function getOrCreateCompletedPredicate(
  walletClient: any,
  publicClient: any
): Promise<string> {
  // Check memory cache
  if (completedPredicateAtomId) {
    return completedPredicateAtomId;
  }
  
  // Check localStorage cache
  const cached = localStorage.getItem('completed_predicate_atom_id');
  if (cached) {
    completedPredicateAtomId = cached;
    return cached;
  }
  
  // Get atom cost
  const atomCost = await publicClient.readContract({
    address: multiVaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'getAtomCost',
  }) as bigint;
  
  // Create "completed" predicate atom
  const atomData = 'completed';
  const atomDataBytes = toHex(new TextEncoder().encode(atomData));
  
  console.log('Creating "completed" predicate atom...');
  
  const hash = await walletClient.writeContract({
    address: multiVaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'createAtoms',
    args: [[atomDataBytes], [atomCost]],
    value: atomCost,
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const atomId = extractAtomIdFromLogs(receipt.logs);
  
  if (!atomId) {
    throw new Error('Failed to extract completed predicate atom ID');
  }
  
  // Cache it
  completedPredicateAtomId = atomId;
  localStorage.setItem('completed_predicate_atom_id', atomId);
  
  console.log('Created "completed" atom:', atomId);
  return atomId;
}

/**
 * Claim IQ for completing a quest
 * Creates: "[User Wallet] completed [Quest]" triple on Intuition
 */
export async function claimQuest(
  params: ClaimQuestParams,
  walletClient: any,
  publicClient: any
): Promise<ClaimQuestResult> {
  const { questId, questAtomId, questTitle } = params;
  const userAddress = walletClient.account.address;
  
  // Check if already claimed
  if (hasClaimedQuestLocal(userAddress, questId)) {
    throw new Error('You have already claimed this quest.');
  }
  
  console.log('=== Claiming Quest IQ ===');
  console.log('Quest:', questTitle);
  console.log('Quest Atom ID:', questAtomId);
  console.log('User:', userAddress);
  
  try {
    // Step 1: Get or create user atom
    console.log('\nStep 1: Getting/creating user atom...');
    const userAtomId = await getOrCreateUserAtom(userAddress, walletClient, publicClient);
    
    // Step 2: Get or create "completed" predicate
    console.log('\nStep 2: Getting/creating "completed" predicate...');
    const predicateId = await getOrCreateCompletedPredicate(walletClient, publicClient);
    
    // Step 3: Get triple cost
    const tripleCost = await publicClient.readContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'getTripleCost',
    }) as bigint;
    
    // Check balance (need cost for triple)
    const balance = await publicClient.getBalance({ address: userAddress });
    if (balance < tripleCost) {
      throw new Error(`Insufficient balance. Need ${formatEther(tripleCost)} TRUST to claim.`);
    }
    
    // Step 4: Create the triple
    console.log('\nStep 3: Creating completion triple...');
    console.log('  Subject (User):', userAtomId);
    console.log('  Predicate (completed):', predicateId);
    console.log('  Object (Quest):', questAtomId);
    console.log('  Cost:', formatEther(tripleCost), 'TRUST');
    
    // createTriples with bytes32[] parameters
    const hash = await walletClient.writeContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'createTriples',
      args: [
        [userAtomId as `0x${string}`],      // Subject: User atom
        [predicateId as `0x${string}`],      // Predicate: "completed"
        [questAtomId as `0x${string}`],      // Object: Quest atom
        [tripleCost],                        // Assets
      ],
      value: tripleCost,
    });
    
    console.log('Triple TX:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status !== 'success') {
      throw new Error('Triple creation transaction failed');
    }
    
    // Extract triple ID
    let tripleId = '0';
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === multiVaultAddress.toLowerCase() &&
          log.topics?.length >= 2) {
        const potentialId = log.topics[1];
        if (potentialId && !potentialId.startsWith('0x00000000000000000000000')) {
          tripleId = potentialId;
          break;
        }
      }
    }
    
    console.log('\n✅ Quest claimed successfully!');
    console.log('Triple ID:', tripleId);
    
    // Store claim in localStorage
    storeClaim(userAddress, questId, tripleId, hash, userAtomId);
    
    return { 
      tripleId, 
      transactionHash: hash,
      userAtomId,
    };
  } catch (error: any) {
    console.error('Error claiming quest:', error);
    throw error;
  }
}

/**
 * Store claim in localStorage
 */
function storeClaim(
  userAddress: string, 
  questId: string, 
  tripleId: string, 
  transactionHash: string,
  userAtomId: string
): void {
  const claims = JSON.parse(localStorage.getItem('quest_claims') || '{}');
  if (!claims[userAddress.toLowerCase()]) claims[userAddress.toLowerCase()] = {};
  claims[userAddress.toLowerCase()][questId] = { 
    tripleId, 
    claimedAt: Date.now(), 
    transactionHash,
    userAtomId,
  };
  localStorage.setItem('quest_claims', JSON.stringify(claims));
}

/**
 * Check if user has claimed a quest (localStorage)
 */
function hasClaimedQuestLocal(userAddress: string, questId: string): boolean {
  const claims = JSON.parse(localStorage.getItem('quest_claims') || '{}');
  return !!claims[userAddress.toLowerCase()]?.[questId];
}

/**
 * Check if user has claimed a quest
 */
export async function hasClaimedQuest(
  userAddress: Address,
  questId: string,
  _publicClient: any
): Promise<boolean> {
  return hasClaimedQuestLocal(userAddress, questId);
}

/**
 * Get claim cost (atoms + triple)
 * User needs: 1 user atom (if first time) + 1 triple
 * First time: ~0.2 TRUST, subsequent: ~0.1 TRUST
 */
export async function getClaimCost(
  userAddress: string,
  publicClient: any
): Promise<{ total: bigint; breakdown: { userAtom: bigint; triple: bigint } }> {
  const atomCost = await publicClient.readContract({
    address: multiVaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'getAtomCost',
  }) as bigint;
  
  const tripleCost = await publicClient.readContract({
    address: multiVaultAddress,
    abi: MULTIVAULT_ABI,
    functionName: 'getTripleCost',
  }) as bigint;
  
  // Check if user already has an atom
  const userAtoms = JSON.parse(localStorage.getItem('user_atoms') || '{}');
  const hasUserAtom = !!userAtoms[userAddress.toLowerCase()];
  
  const userAtomCost = hasUserAtom ? 0n : atomCost;
  
  return {
    total: userAtomCost + tripleCost,
    breakdown: {
      userAtom: userAtomCost,
      triple: tripleCost,
    },
  };
}

/**
 * Get user's claim info for a quest
 */
export function getQuestClaim(
  userAddress: Address, 
  questId: string
): { tripleId: string; claimedAt: number; userAtomId: string } | null {
  const claims = JSON.parse(localStorage.getItem('quest_claims') || '{}');
  return claims[userAddress.toLowerCase()]?.[questId] || null;
}

/**
 * Get user's atom ID (if exists)
 */
export function getUserAtomId(userAddress: string): string | null {
  const userAtoms = JSON.parse(localStorage.getItem('user_atoms') || '{}');
  return userAtoms[userAddress.toLowerCase()] || null;
}
