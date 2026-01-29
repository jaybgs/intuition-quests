/**
 * Quest Atom Service
 * Creates quest atoms via PublishQuests contract
 * Enforces "questname_starttime_endtime" naming convention
 */

import { type Hash, formatEther, keccak256, stringToHex, toHex } from 'viem';
import { CONTRACT_ADDRESSES, MULTIVAULT_ADDRESS } from '../contracts/addresses';
import { fetcher, configureClient } from '@0xintuition/graphql';

// Configure GraphQL client for mainnet
if (typeof window !== 'undefined') {
  try {
    configureClient({
      apiUrl: 'https://mainnet.intuition.sh/v1/graphql',
    });
  } catch (error) {
    console.error('Failed to configure GraphQL client:', error);
  }
}

// GraphQL query to check if atom exists by data
const GetAtomByDataDocument = `
  query GetAtomByData($data: String!) {
    atoms(where: { data: { _eq: $data } }, limit: 1) {
      term_id
      label
      data
      created_at
    }
  }
`;

const publishQuestsAddress = CONTRACT_ADDRESSES.PUBLISH_QUESTS;
const multiVaultAddress = MULTIVAULT_ADDRESS;

// PublishQuests ABI
const PUBLISH_QUESTS_ABI = [
  {
    name: 'createQuestAtom',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
] as const;

// Legacy MultiVault ABI (fallback/cost info)
const MULTIVAULT_ABI = [
  {
    name: 'getAtomCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export interface CreateQuestAtomParams {
  questId: string;
  questTitle: string;
  startTime: number; // Unix timestamp
  endTime: number;   // Unix timestamp
  spaceAtomId?: string; // Optional: Link to space atom (kept for compatibility)
}

export interface CreateQuestAtomResult {
  atomId: string;
  transactionHash: Hash;
  uniqueIdString: string;
}

/**
 * Check if an atom with the given data (name) already exists on Intuition
 */
export async function checkAtomExists(atomData: string): Promise<boolean> {
  try {
    const result = await fetcher<any>(GetAtomByDataDocument, { data: atomData });
    return result.atoms && result.atoms.length > 0;
  } catch (error) {
    console.error('Error checking if atom exists:', error);
    // If we can't check, assume it doesn't exist to allow creation
    return false;
  }
}

/**
 * Create a quest atom on Intuition chain via PublishQuests contract
 */
export async function createQuestAtom(
  params: CreateQuestAtomParams,
  walletClient: any,
  publicClient: any
): Promise<CreateQuestAtomResult> {
  const { questId, questTitle, startTime, endTime, spaceAtomId } = params;

  try {
    // 1. Construct unique ID string locally for validation
    // Format: name_startTime_endTime
    const uniqueIdString = `${questTitle}_${startTime}_${endTime}`;

    console.log('Creating quest atom via PublishQuests...');
    console.log('  Quest Title:', questTitle);
    console.log('  Start Time:', startTime);
    console.log('  End Time:', endTime);
    console.log('  Unique ID:', uniqueIdString);

    // 2. Check if atom already exists
    console.log('  Checking if atom already exists...');
    const atomExists = await checkAtomExists(uniqueIdString);
    if (atomExists) {
      throw new Error(`An atom with the ID "${uniqueIdString}" already exists. Please modify the start or end time.`);
    }

    // 3. Get atom cost from MultiVault directly (PublishQuests forwards this cost)
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

    console.log('  Cost:', formatEther(atomCost), 'TRUST');

    // 4. Create atom via PublishQuests contract
    // createQuestAtom(string name, uint256 startTime, uint256 endTime)
    const hash = await walletClient.writeContract({
      address: publishQuestsAddress,
      abi: PUBLISH_QUESTS_ABI,
      functionName: 'createQuestAtom',
      args: [questTitle, BigInt(startTime), BigInt(endTime)],
      value: atomCost,
    });

    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Extract atom ID from logs - look for QuestPublished event
    // Event QuestPublished(bytes32 indexed atomId, string uniqueIdString, address indexed creator, uint256 timestamp)
    // The atom ID is in topics[1]
    let atomId = '0x0';
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === publishQuestsAddress.toLowerCase() &&
        log.topics?.length >= 2) { // At least topic 0 (event sig) and topic 1 (atomId)

        // We accept the first indexed argument as the atom ID
        const potentialId = log.topics[1];
        if (potentialId) {
          atomId = potentialId;
          break;
        }
      }
    }

    if (atomId === '0x0') {
      console.warn('Could not extract Atom ID from transaction receipt. Using fallback or manual check recommended.');
      // Fallback: we might fetch it by the unique string if needed, or just warn
    }

    console.log('Quest atom created via factory!');
    console.log('  Atom ID:', atomId);
    console.log('  TX:', hash);

    // Cache the quest atom ID
    const questAtoms = JSON.parse(localStorage.getItem('quest_atoms') || '{}');
    questAtoms[questId] = {
      atomId,
      questTitle,
      uniqueIdString,
      transactionHash: hash,
      createdAt: Date.now()
    };
    localStorage.setItem('quest_atoms', JSON.stringify(questAtoms));

    return {
      atomId,
      transactionHash: hash,
      uniqueIdString
    };
  } catch (error: any) {
    console.error('Error creating quest atom:', error);
    throw error;
  }
}

/**
 * Get the cost to create a quest atom (reads from MultiVault)
 */
export async function getQuestAtomCost(publicClient: any): Promise<{ cost: bigint }> {
  try {
    const cost = await publicClient.readContract({
      address: MULTIVAULT_ADDRESS,
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
export function getAllQuestAtoms(): Record<string, any> {
  return JSON.parse(localStorage.getItem('quest_atoms') || '{}');
}
