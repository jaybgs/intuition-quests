/**
 * Space Identity Service
 * Creates space identity atoms on Intuition chain
 * Uses direct MultiVault calls with correct ABI
 */

import { type Hash, formatEther, keccak256, stringToHex, toHex, encodeAbiParameters, parseAbiParameters } from 'viem';
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

export interface CreateSpaceIdentityParams {
  spaceName: string;
  createdAt: number; // Unix timestamp
}

export interface CreateSpaceIdentityResult {
  atomId: string;
  transactionHash: Hash;
  spaceId: string;
}

/**
 * Generate a unique space ID from space data
 */
function generateSpaceId(spaceName: string, createdAt: number, creatorAddress: string): string {
  const data = `space:${spaceName}:${createdAt}:${creatorAddress.toLowerCase()}`;
  return keccak256(stringToHex(data));
}

/**
 * Create a space identity on Intuition chain
 * This creates a unique atom for the space that can be used for staking/claiming
 */
export async function createSpaceIdentity(
  params: CreateSpaceIdentityParams,
  walletClient: any,
  publicClient: any
): Promise<CreateSpaceIdentityResult> {
  const { spaceName, createdAt } = params;
  const creatorAddress = walletClient.account.address;
  
  try {
    // Generate unique space identifier
    const spaceId = generateSpaceId(spaceName, createdAt, creatorAddress);
    
    // Get atom cost
    const atomCost = await publicClient.readContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      functionName: 'getAtomCost',
    }) as bigint;
    
    // Check balance
    const balance = await publicClient.getBalance({ address: creatorAddress });
    if (balance < atomCost) {
      throw new Error(`Insufficient balance. Need ${formatEther(atomCost)} TRUST to create space identity.`);
    }
    
    // Create atom data - unique identifier for this space
    const atomData = `TrustQuests Space: ${spaceName}`;
    const atomDataBytes = toHex(new TextEncoder().encode(atomData));
    
    console.log('Creating space identity atom...');
    console.log('  Space Name:', spaceName);
    console.log('  Atom Data:', atomData);
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
    let atomId = '0';
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === multiVaultAddress.toLowerCase() &&
          log.topics?.length === 3 &&
          log.data?.length === 66) {
        const potentialId = log.topics[1];
        // Skip if it looks like an address (starts with many zeros then address)
        if (potentialId && !potentialId.startsWith('0x00000000000000000000000')) {
          atomId = BigInt(potentialId).toString();
          break;
        }
      }
    }
    
    console.log('Space identity created!');
    console.log('  Atom ID:', atomId);
    console.log('  TX:', hash);
    
    // Cache the space atom ID
    const spaceAtoms = JSON.parse(localStorage.getItem('space_atoms') || '{}');
    spaceAtoms[spaceId] = { atomId, spaceName, createdAt, creatorAddress, transactionHash: hash };
    localStorage.setItem('space_atoms', JSON.stringify(spaceAtoms));
    
    return {
      atomId,
      transactionHash: hash,
      spaceId,
    };
  } catch (error: any) {
    console.error('Error creating space identity:', error);
    throw error;
  }
}

/**
 * Get the cost to create a space identity
 */
export async function getSpaceIdentityCost(
  publicClient: any
): Promise<{ cost: bigint }> {
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
 * Get space atom ID from cache
 */
export function getSpaceAtomId(spaceId: string): string | null {
  const spaceAtoms = JSON.parse(localStorage.getItem('space_atoms') || '{}');
  return spaceAtoms[spaceId]?.atomId || null;
}

/**
 * Get all cached space atoms
 */
export function getAllSpaceAtoms(): Record<string, { atomId: string; spaceName: string; createdAt: number }> {
  return JSON.parse(localStorage.getItem('space_atoms') || '{}');
}
