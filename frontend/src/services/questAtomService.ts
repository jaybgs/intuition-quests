/**
 * Quest Atom Service
 * Creates quest atoms on Intuition chain
 * Uses direct MultiVault calls with correct ABI
 */

import { type Hash, formatEther, keccak256, stringToHex, toHex } from 'viem';
import { MULTIVAULT_ADDRESS } from '../contracts/addresses';

const multiVaultAddress = MULTIVAULT_ADDRESS;

// Correct MultiVault ABI for atom creation
const MULTIVAULT_ABI = [
  {
    name: 'getAtomCost',
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
] as const;

export interface CreateQuestAtomParams {
  questId: string;
  questTitle: string;
  spaceAtomId?: string; // Optional: Link to space atom
}

export interface CreateQuestAtomResult {
  atomId: string;
  transactionHash: Hash;
}

/**
 * Convert quest ID string to bytes32
 */
export function questIdToBytes32(questId: string): `0x${string}` {
  return keccak256(stringToHex(questId)) as `0x${string}`;
}

/**
 * Create a quest atom on Intuition chain
 */
export async function createQuestAtom(
  params: CreateQuestAtomParams,
  walletClient: any,
  publicClient: any
): Promise<CreateQuestAtomResult> {
  const { questId, questTitle, spaceAtomId } = params;
  
  try {
    // Get atom cost
    const atomCost = await publicClient.readContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'getAtomCost',
    }) as bigint;
    
    // Check balance
    const balance = await publicClient.getBalance({ address: walletClient.account.address });
    if (balance < atomCost) {
      throw new Error(`Insufficient balance. Need ${formatEther(atomCost)} TRUST to create quest atom.`);
    }
    
    // Create atom data - unique identifier for this quest
    const atomData = `TrustQuests Quest: ${questTitle}`;
    const atomDataBytes = toHex(new TextEncoder().encode(atomData));
    
    console.log('Creating quest atom...');
    console.log('  Quest ID:', questId);
    console.log('  Quest Title:', questTitle);
    console.log('  Space Atom ID:', spaceAtomId || 'none');
    console.log('  Cost:', formatEther(atomCost), 'TRUST');
    
    // Create atom using MultiVault directly with correct ABI
    // createAtoms(bytes[] data, uint256[] assets)
    const hash = await walletClient.writeContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'createAtoms',
      args: [[atomDataBytes], [atomCost]],
      value: atomCost,
    });
    
    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    // Extract atom ID from logs - look for AtomCreated event
    // The atom ID is in topics[1] for logs with 3 topics and data length 66
    // Store as bytes32 hex string for compatibility with triple creation
    let atomId = '0x0';
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === multiVaultAddress.toLowerCase() &&
          log.topics?.length === 3 &&
          log.data?.length === 66) {
        const potentialId = log.topics[1];
        // Skip if it looks like an address (starts with many zeros then address)
        if (potentialId && !potentialId.startsWith('0x00000000000000000000000')) {
          atomId = potentialId; // Keep as bytes32 hex string
          break;
        }
      }
    }
    
    console.log('Quest atom created!');
    console.log('  Atom ID:', atomId);
    console.log('  TX:', hash);
    
    // Cache the quest atom ID
    const questAtoms = JSON.parse(localStorage.getItem('quest_atoms') || '{}');
    questAtoms[questId] = { 
      atomId, 
      questTitle, 
      spaceAtomId: spaceAtomId || null, 
      transactionHash: hash,
      createdAt: Date.now()
    };
    localStorage.setItem('quest_atoms', JSON.stringify(questAtoms));
    
    return {
      atomId,
      transactionHash: hash,
    };
  } catch (error: any) {
    console.error('Error creating quest atom:', error);
    throw error;
  }
}

/**
 * Get the cost to create a quest atom
 */
export async function getQuestAtomCost(publicClient: any): Promise<{ cost: bigint }> {
  try {
    const cost = await publicClient.readContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'getAtomCost',
    }) as bigint;
    
    return { cost };
  } catch {
    // Fallback cost
    return { cost: BigInt('100000000001') }; // ~0.1 TRUST
  }
}

/**
 * Get quest atom ID from cache
 */
export function getQuestAtomId(questId: string): string | null {
  const questAtoms = JSON.parse(localStorage.getItem('quest_atoms') || '{}');
  return questAtoms[questId]?.atomId || null;
}

/**
 * Get all cached quest atoms
 */
export function getAllQuestAtoms(): Record<string, { atomId: string; questTitle: string; spaceAtomId: string | null }> {
  return JSON.parse(localStorage.getItem('quest_atoms') || '{}');
}
