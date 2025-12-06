import { getAddress, type Address, stringToHex, toHex, parseEventLogs } from 'viem';
import { useAccount, useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { intuitionChain } from '../config/wagmi';
import { createAtomsWithFee, createTriplesWithFee, estimateTransactionCost } from './transactionWrapperService';
import { getMultiVaultAddressFromChainId, calculateAtomId } from '../utils/intuitionProtocol';
import { showToast } from '../components/Toast';

/**
 * Create an atom on-chain for a quest when it's published
 * This creates an on-chain identity for the quest
 */
export async function createQuestAtom(
  questTitle: string,
  walletClient: any,
  publicClient: any
): Promise<{ atomId: string; transactionHash: string }> {
  try {
    // Ensure connected to Intuition Network
    const chainId = await publicClient.getChainId();
    if (chainId !== intuitionChain.id) {
      throw new Error(`Please switch to ${intuitionChain.name} to create quest on-chain identity.`);
    }

    // Convert quest title to atom data (hex string)
    const atomData = stringToHex(questTitle.trim()) as `0x${string}`;

    // Get the atom cost from MultiVault contract (required minimum value)
    const MULTIVAULT_ABI = [
      {
        name: 'getAtomCost',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const { CONTRACT_ADDRESSES } = await import('../config/contracts');
    const atomCost = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MULTIVAULT,
      abi: MULTIVAULT_ABI,
      functionName: 'getAtomCost',
    }) as bigint;

    // Create atom through wrapper (with fee collection)
    // Must include at least the atom cost in assets
    const result = await createAtomsWithFee(
      {
        atomDatas: [atomData],
        assets: [atomCost], // Include atom cost (minimum required)
      },
      walletClient,
      publicClient
    );

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });

    // Parse atom ID from transaction receipt events
    const ATOM_CREATED_ABI = [
      {
        type: 'event',
        name: 'AtomCreated',
        inputs: [
          { type: 'address', name: 'creator', indexed: true },
          { type: 'address', name: 'atomWallet', indexed: true },
          { type: 'bytes', name: 'atomData' },
          { type: 'uint256', name: 'vaultID' },
        ],
      },
    ] as const;

    const events = parseEventLogs({
      logs: receipt.logs,
      abi: ATOM_CREATED_ABI,
      eventName: 'AtomCreated',
    });

    let atomId = '';
    if (events.length > 0) {
      const vaultId = (events[0].args as { vaultID: bigint }).vaultID;
      atomId = `0x${vaultId.toString(16).padStart(64, '0')}`;
    } else {
      // Fallback: calculate atom ID from data
      const calculatedAtomId = calculateAtomId(atomData);
      atomId = calculatedAtomId;
    }
    
    showToast('Quest atom created on-chain!', 'success');
    
    return {
      atomId,
      transactionHash: result.txHash,
    };
  } catch (error: any) {
    console.error('Error creating quest atom:', error);
    showToast(error.message || 'Failed to create quest atom on-chain', 'error');
    throw error;
  }
}

/**
 * Create a triple for quest creation: [Creator][created][Quest Atom]
 */
export async function createQuestTriple(
  creatorAddress: Address,
  questAtomId: `0x${string}`,
  walletClient: any,
  publicClient: any
): Promise<{ tripleId: string; transactionHash: string }> {
  try {
    // Ensure connected to Intuition Network
    const chainId = await publicClient.getChainId();
    if (chainId !== intuitionChain.id) {
      throw new Error(`Please switch to ${intuitionChain.name} to create quest triple.`);
    }

    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);

    // Get or create creator atom
    const creatorAtomData = stringToHex(`creator:${creatorAddress.toLowerCase()}`) as `0x${string}`;
    const creatorAtomId = calculateAtomId(creatorAtomData);

    // Get or create "created" predicate atom
    const createdAtomData = stringToHex('created') as `0x${string}`;
    const createdAtomId = calculateAtomId(createdAtomData);

    // Convert atom IDs to bytes32 format (already hex strings, just ensure 64 char padding)
    const subjectId = creatorAtomId.startsWith('0x') 
      ? (`0x${creatorAtomId.slice(2).padStart(64, '0')}` as `0x${string}`)
      : (`0x${creatorAtomId.padStart(64, '0')}` as `0x${string}`);
    const predicateId = createdAtomId.startsWith('0x')
      ? (`0x${createdAtomId.slice(2).padStart(64, '0')}` as `0x${string}`)
      : (`0x${createdAtomId.padStart(64, '0')}` as `0x${string}`);
    const objectId = questAtomId;

    // Get the triple cost from MultiVault contract (required minimum value)
    const MULTIVAULT_ABI = [
      {
        name: 'getTripleCost',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const { CONTRACT_ADDRESSES } = await import('../config/contracts');
    const tripleCost = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MULTIVAULT,
      abi: MULTIVAULT_ABI,
      functionName: 'getTripleCost',
    }) as bigint;

    // Create triple through wrapper (with fee collection)
    // Must include at least the triple cost in assets
    const result = await createTriplesWithFee(
      {
        subjectIds: [subjectId],
        predicateIds: [predicateId],
        objectIds: [objectId],
        assets: [tripleCost], // Include triple cost (minimum required)
      },
      walletClient,
      publicClient
    );

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });

    // Parse triple ID from transaction receipt events
    const TRIPLE_CREATED_ABI = [
      {
        type: 'event',
        name: 'TripleCreated',
        inputs: [
          { type: 'address', name: 'creator', indexed: true },
          { type: 'uint256', name: 'subjectId' },
          { type: 'uint256', name: 'predicateId' },
          { type: 'uint256', name: 'objectId' },
          { type: 'uint256', name: 'vaultID' },
        ],
      },
    ] as const;

    const events = parseEventLogs({
      logs: receipt.logs,
      abi: TRIPLE_CREATED_ABI,
      eventName: 'TripleCreated',
    });

    let tripleId = '';
    if (events.length > 0) {
      const vaultId = (events[0].args as { vaultID: bigint }).vaultID;
      tripleId = `0x${vaultId.toString(16).padStart(64, '0')}`;
    }

    showToast('Quest triple created on-chain!', 'success');
    
    return {
      tripleId,
      transactionHash: result.txHash,
    };
  } catch (error: any) {
    console.error('Error creating quest triple:', error);
    showToast(error.message || 'Failed to create quest triple on-chain', 'error');
    throw error;
  }
}

/**
 * Create a triple for quest completion: [User][completed][Quest Atom]
 */
export async function createQuestCompletionTriple(
  userAddress: Address,
  questAtomId: `0x${string}`,
  walletClient: any,
  publicClient: any
): Promise<{ tripleId: string; transactionHash: string }> {
  try {
    // Ensure connected to Intuition Network
    const chainId = await publicClient.getChainId();
    if (chainId !== intuitionChain.id) {
      throw new Error(`Please switch to ${intuitionChain.name} to create quest completion triple.`);
    }

    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);

    // Get or create user atom
    const userAtomData = stringToHex(`user:${userAddress.toLowerCase()}`) as `0x${string}`;
    const userAtomId = calculateAtomId(userAtomData);

    // Get or create "completed" predicate atom
    const completedAtomData = stringToHex('completed') as `0x${string}`;
    const completedAtomId = calculateAtomId(completedAtomData);

    // Convert atom IDs to bytes32 format (already hex strings, just ensure 64 char padding)
    const subjectId = userAtomId.startsWith('0x')
      ? (`0x${userAtomId.slice(2).padStart(64, '0')}` as `0x${string}`)
      : (`0x${userAtomId.padStart(64, '0')}` as `0x${string}`);
    const predicateId = completedAtomId.startsWith('0x')
      ? (`0x${completedAtomId.slice(2).padStart(64, '0')}` as `0x${string}`)
      : (`0x${completedAtomId.padStart(64, '0')}` as `0x${string}`);
    const objectId = questAtomId;

    // Get the triple cost from MultiVault contract (required minimum value)
    const MULTIVAULT_ABI = [
      {
        name: 'getTripleCost',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const { CONTRACT_ADDRESSES } = await import('../config/contracts');
    const tripleCost = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MULTIVAULT,
      abi: MULTIVAULT_ABI,
      functionName: 'getTripleCost',
    }) as bigint;

    // Create triple through wrapper (with fee collection)
    // Must include at least the triple cost in assets
    const result = await createTriplesWithFee(
      {
        subjectIds: [subjectId],
        predicateIds: [predicateId],
        objectIds: [objectId],
        assets: [tripleCost], // Include triple cost (minimum required)
      },
      walletClient,
      publicClient
    );

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });

    // Parse triple ID from transaction receipt events
    const TRIPLE_CREATED_ABI = [
      {
        type: 'event',
        name: 'TripleCreated',
        inputs: [
          { type: 'address', name: 'creator', indexed: true },
          { type: 'uint256', name: 'subjectId' },
          { type: 'uint256', name: 'predicateId' },
          { type: 'uint256', name: 'objectId' },
          { type: 'uint256', name: 'vaultID' },
        ],
      },
    ] as const;

    const events = parseEventLogs({
      logs: receipt.logs,
      abi: TRIPLE_CREATED_ABI,
      eventName: 'TripleCreated',
    });

    let tripleId = '';
    if (events.length > 0) {
      const vaultId = (events[0].args as { vaultID: bigint }).vaultID;
      tripleId = `0x${vaultId.toString(16).padStart(64, '0')}`;
    }

    showToast('Quest completion triple created on-chain!', 'success');
    
    return {
      tripleId,
      transactionHash: result.txHash,
    };
  } catch (error: any) {
    console.error('Error creating quest completion triple:', error);
    showToast(error.message || 'Failed to create quest completion triple on-chain', 'error');
    throw error;
  }
}

/**
 * Check if a quest atom already exists
 */
export async function checkQuestAtomExists(
  questTitle: string,
  publicClient: any
): Promise<boolean> {
  try {
    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);
    
    const atomId = calculateAtomId(toHex(questTitle) as `0x${string}`);
    
    // Check if atom exists on-chain
    const MULTIVAULT_ABI = [
      {
        type: 'function',
        name: 'isAtom',
        stateMutability: 'view',
        inputs: [{ name: 'termId', type: 'bytes32' }],
        outputs: [{ type: 'bool' }],
      },
    ] as const;
    
    const exists = await publicClient.readContract({
      address: multiVaultAddress,
      abi: MULTIVAULT_ABI,
      args: [atomId],
    });
    
    return exists as boolean;
  } catch (error) {
    console.error('Error checking quest atom existence:', error);
    return false;
  }
}

