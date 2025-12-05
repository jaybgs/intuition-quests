import { stringToHex, toHex } from 'viem';
import { getMultiVaultAddressFromChainId, getAtomCost } from '@0xintuition/protocol';
import { calculateAtomId } from '../utils/intuitionProtocol';
import { intuitionChain } from '../config/wagmi';
import type { Address } from 'viem';
import { createAtomsWithFee, estimateTransactionCost } from './transactionWrapperService';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export interface CreateAtomResult {
  atomId: string;
  transactionHash: string;
  uri: string;
  success: boolean;
}

export interface AtomCreationConfig {
  walletClient: any; // wagmi WalletClient
  publicClient: any; // wagmi PublicClient
  depositAmount?: bigint;
}

/**
 * Create an atom on Intuition mainnet from a string (space name)
 * Uses the TransactionWrapper contract to collect 30% fee on gas costs
 */
export async function createSpaceAtom(
  spaceName: string,
  config: AtomCreationConfig
): Promise<CreateAtomResult> {
  try {
    // 0. Verify wallet client is properly set and using user's address (not fee recipient)
    if (!config.walletClient || !config.walletClient.account) {
      throw new Error('Wallet client not properly initialized. Please connect your wallet.');
    }
    
    const userAddress = config.walletClient.account.address;
    if (!userAddress) {
      throw new Error('Could not get user address from wallet. Please reconnect your wallet.');
    }
    
    // Ensure we're not accidentally using the fee recipient address
    const feeRecipient = CONTRACT_ADDRESSES.FEE_RECIPIENT.toLowerCase();
    if (userAddress.toLowerCase() === feeRecipient) {
      throw new Error('Invalid wallet configuration. Please use your own wallet address, not the fee recipient.');
    }
    
    // 1. Get MultiVault contract address for Intuition mainnet
    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);
    
    if (!multiVaultAddress || multiVaultAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('MultiVault address not found for Intuition Network');
    }

    // 2. Check if wrapper contract is deployed
    if (CONTRACT_ADDRESSES.TRANSACTION_WRAPPER === '0x0000000000000000000000000000000000000000') {
      throw new Error('TransactionWrapper contract not deployed. Please deploy the contract first.');
    }
    
    // 3. Get atom creation cost from MultiVault
    const atomBaseCost = await getAtomCost({
      publicClient: config.publicClient,
      address: multiVaultAddress,
    });
    
    console.log('💰 Atom cost from MultiVault:', {
      atomBaseCost: atomBaseCost.toString(),
      atomBaseCostFormatted: `${(Number(atomBaseCost) / 1e18).toFixed(6)} TRUST`,
    });
    
    // 4. Calculate deposit amount (only the additional deposit, not the base cost)
    const depositAmount = config.depositAmount || BigInt(0);
    
    // 5. Convert space name to atom data (hex string)
    const atomData = stringToHex(spaceName.trim()) as `0x${string}`;
    
    // 6. Calculate the total value per atom: base cost + deposit
    // The TransactionWrapper expects assets array to contain the total value per atom
    // The contract checks: msg.value >= getAtomCost() * atomDatas.length
    // So for 1 atom: msg.value >= getAtomCost() * 1
    const totalValuePerAtom = atomBaseCost + depositAmount;
    
    // Ensure the value is at least the atom cost (should always be true, but double-check)
    if (totalValuePerAtom < atomBaseCost) {
      throw new Error(
        `Invalid calculation: totalValuePerAtom (${totalValuePerAtom.toString()}) < atomBaseCost (${atomBaseCost.toString()})`
      );
    }
    
    // The TransactionWrapper contract will check: msg.value >= getAtomCost() * length
    // For 1 atom, this means: msg.value >= getAtomCost()
    // We're sending totalValuePerAtom which is atomBaseCost + depositAmount
    // However, the TransactionWrapper might be reading getAtomCost() from MultiVault,
    // and there could be a slight difference. Let's ensure we meet the requirement exactly.
    const minRequiredForOneAtom = atomBaseCost;
    
    // If totalValuePerAtom is less than the minimum, use the minimum instead
    // This ensures we always meet the contract's requirement
    const finalValuePerAtom = totalValuePerAtom >= minRequiredForOneAtom 
      ? totalValuePerAtom 
      : minRequiredForOneAtom;
    
    if (finalValuePerAtom < minRequiredForOneAtom) {
      throw new Error(
        `Value too low: finalValuePerAtom (${finalValuePerAtom.toString()}) must be >= atomBaseCost (${atomBaseCost.toString()})`
      );
    }
    
    console.log('🔍 Atom creation preparation:', {
      atomBaseCost: atomBaseCost.toString(),
      atomBaseCostFormatted: `${(Number(atomBaseCost) / 1e18).toFixed(6)} TRUST`,
      depositAmount: depositAmount.toString(),
      depositAmountFormatted: `${(Number(depositAmount) / 1e18).toFixed(6)} TRUST`,
      calculatedValue: totalValuePerAtom.toString(),
      finalValuePerAtom: finalValuePerAtom.toString(),
      finalValueFormatted: `${(Number(finalValuePerAtom) / 1e18).toFixed(6)} TRUST`,
      minRequired: minRequiredForOneAtom.toString(),
      atomData: atomData,
    });
    
    // 7. Estimate transaction cost (operation + gas + 30% fee)
    // The assets array should contain the total value per atom (base cost + deposit)
    // The msg.value will be the sum of all assets (which is finalValuePerAtom for 1 atom)
    const { totalCost: estimatedTotal } = await estimateTransactionCost(
      config.publicClient,
      'createAtomsWithFee',
      [[atomData], [finalValuePerAtom]], // assets array contains total value per atom
      finalValuePerAtom, // This is the value that will be sent (for 1 atom)
      userAddress // Pass user's address for gas estimation
    );
    
    // 8. Create atom through wrapper (with automatic 30% fee collection)
    // The assets array contains the total value per atom (base cost + deposit)
    const result = await createAtomsWithFee(
      {
        atomDatas: [atomData],
        assets: [finalValuePerAtom], // Total value per atom (base cost + deposit, ensuring >= atomCost)
      },
      config.walletClient,
      config.publicClient
    );
    
    // 8. Wait for transaction receipt to get atom ID from events
    const receipt = await config.publicClient.waitForTransactionReceipt({ 
      hash: result.txHash as `0x${string}` 
    });
    
    // 9. Verify transaction actually succeeded
    if (receipt.status === 'reverted') {
      throw new Error('Transaction was reverted. Atom creation failed.');
    }
    
    if (receipt.status !== 'success') {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }
    
    // 10. Extract atom ID from transaction receipt events
    // The wrapper emits OperationExecuted event with the atom ID
    let atomId = '';
    if (receipt.logs) {
      // Parse events to find atom ID
      // For now, we'll use a placeholder - in production, parse the actual event
      atomId = result.txHash.slice(0, 42); // Temporary: use tx hash prefix
    }
    
    return {
      atomId,
      transactionHash: result.txHash,
      uri: spaceName.trim(),
      success: true,
    };
  } catch (error: any) {
    console.error('Error creating atom:', error);
    throw new Error(`Failed to create atom: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if an atom already exists with the given name
 */
export async function checkAtomExists(
  spaceName: string,
  publicClient: any,
  multiVaultAddress: Address
): Promise<boolean> {
  try {
    const atomId = calculateAtomId(toHex(spaceName) as `0x${string}`);
    
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
      functionName: 'isAtom',
      args: [atomId],
    });
    
    return exists as boolean;
  } catch (error) {
    console.error('Error checking atom existence:', error);
    // If check fails, allow creation to proceed (fail open)
    return false;
  }
}

/**
 * Get the estimated cost for creating an atom
 */
export async function getAtomCreationCost(publicClient: any): Promise<bigint> {
  try {
    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);
    const cost = await getAtomCost({
      publicClient,
      address: multiVaultAddress,
    });
    return cost;
  } catch (error) {
    console.error('Error getting atom cost:', error);
    return BigInt(0);
  }
}
