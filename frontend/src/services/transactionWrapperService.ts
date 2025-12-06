import { getAddress, type Address } from 'viem';
import { intuitionChain } from '../config/wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// Wrapper contract address (will be set after deployment)
const TRANSACTION_WRAPPER_ADDRESS = CONTRACT_ADDRESSES.TRANSACTION_WRAPPER;

// MultiVault address on Intuition Mainnet
const MULTIVAULT_ADDRESS = CONTRACT_ADDRESSES.MULTIVAULT;

// TransactionWrapper ABI
const TRANSACTION_WRAPPER_ABI = [
  {
    name: 'createAtomsWithFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'atomDatas', type: 'bytes[]' },
      { name: 'assets', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'createTriplesWithFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'subjectIds', type: 'bytes32[]' },
      { name: 'predicateIds', type: 'bytes32[]' },
      { name: 'objectIds', type: 'bytes32[]' },
      { name: 'assets', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'depositWithFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'termId', type: 'bytes32' },
      { name: 'curveId', type: 'uint256' },
      { name: 'minShares', type: 'uint256' },
      { name: 'depositAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'depositBatchWithFee',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'termIds', type: 'bytes32[]' },
      { name: 'curveIds', type: 'uint256[]' },
      { name: 'minShares', type: 'uint256[]' },
      { name: 'totalDepositAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256[]' }],
  },
  // Events
  {
    type: 'event',
    name: 'FeeCollected',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'operation', type: 'string', indexed: true },
      { name: 'baseGasCost', type: 'uint256', indexed: false },
      { name: 'dAppFeeAmount', type: 'uint256', indexed: false },
      { name: 'totalCharged', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OperationExecuted',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'operation', type: 'string', indexed: true },
      { name: 'resultId', type: 'bytes32', indexed: true },
    ],
  },
  // Errors
  {
    type: 'error',
    name: 'InsufficientValue',
    inputs: [
      { name: 'operation', type: 'string' },
      { name: 'required', type: 'uint256' },
      { name: 'provided', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'FeeTransferFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'Error',
    inputs: [
      { name: 'message', type: 'string' },
    ],
  },
  {
    type: 'error',
    name: 'Panic',
    inputs: [
      { name: 'code', type: 'uint256' },
    ],
  },
] as const;

// MultiVault ABI (for cost estimation)
const MULTIVAULT_ABI = [
  {
    name: 'getAtomCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTripleCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface CreateAtomParams {
  atomDatas: `0x${string}`[];
  assets: bigint[];
}

export interface CreateTripleParams {
  subjectIds: `0x${string}`[];
  predicateIds: `0x${string}`[];
  objectIds: `0x${string}`[];
  assets: bigint[];
}

export interface DepositParams {
  receiver: Address;
  termId: `0x${string}`;
  curveId: bigint;
  minShares: bigint;
  depositAmount: bigint;
}

/**
 * Estimate gas and calculate total cost including 30% fee
 */
export async function estimateTransactionCost(
  publicClient: any,
  functionName: 'createAtomsWithFee' | 'createTriplesWithFee' | 'depositWithFee' | 'depositBatchWithFee',
  args: any[],
  value: bigint,
  account?: Address
): Promise<{ baseGasCost: bigint; feeAmount: bigint; dAppFee: bigint; totalCost: bigint }> {
  try {
    // Estimate gas with the user's account address
    // If account is not provided, the estimation will fail, so we require it
    if (!account) {
      throw new Error('Account address is required for gas estimation');
    }

    // Get current gas price first
    const gasPrice = await publicClient.getGasPrice();
    
    // For gas estimation, we need to send enough value to cover:
    // - Operation cost (value parameter)
    // - Estimated gas cost (we'll use a rough estimate first)
    // The contract expects: msg.value >= totalOperationCost + some gas buffer
    // We'll use a conservative gas estimate (e.g., 500k gas) for the initial estimation
    const roughGasEstimate = 500000n; // Conservative estimate
    const roughGasCost = roughGasEstimate * gasPrice;
    const roughDAppFee = (roughGasCost * 30n) / 100n;
    const estimationValue = value + roughGasCost + roughDAppFee;

    const gasEstimate = await publicClient.estimateContractGas({
      abi: TRANSACTION_WRAPPER_ABI,
      address: TRANSACTION_WRAPPER_ADDRESS,
      functionName,
      args,
      value: estimationValue, // Send enough to cover operation + estimated gas + fee
      account: account as `0x${string}`, // Use user's account address for gas estimation
    });

    // Calculate base gas cost
    const baseGasCost = BigInt(gasEstimate) * gasPrice;

    // Calculate 30% dApp fee on base gas cost (this goes to revenue wallet)
    // Fee model: User pays operation cost + base gas + (base gas * 30%)
    const dAppFee = (baseGasCost * 30n) / 100n;

    // Total cost = operation cost + base gas cost + 30% dApp fee on gas
    // User pays: operationCost + baseGasCost + (baseGasCost * 30%)
    // The 30% dApp fee goes to revenue wallet (0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07)
    const totalCost = value + baseGasCost + dAppFee;

    return { 
      baseGasCost, 
      dAppFee, // 30% of base gas cost
      feeAmount: dAppFee, // Alias for backward compatibility
      totalCost 
    };
  } catch (error: any) {
    console.error('Error estimating transaction cost:', error);
    
    // Try to decode the error if it's a contract error
    if (error.data || error.reason) {
      let errorMessage = error.message || 'Unknown error';
      
      // If we have error data, try to decode it
      if (error.data) {
        try {
          // Try to decode as custom errors or Panic
          const decoded = publicClient.decodeErrorResult({
            abi: TRANSACTION_WRAPPER_ABI,
            data: error.data,
          });
          if (decoded) {
            if (decoded.errorName === 'InsufficientValue') {
              errorMessage = `${decoded.errorName}: Required ${decoded.args?.[1]?.toString() || 'unknown'}, provided ${decoded.args?.[2]?.toString() || 'unknown'}`;
            } else if (decoded.errorName === 'Panic') {
              const panicCode = decoded.args?.[0];
              const panicMessages: Record<number, string> = {
                0x01: 'Assertion failed',
                0x11: 'Arithmetic underflow/overflow',
                0x12: 'Division by zero',
                0x21: 'Array index out of bounds',
                0x22: 'Array length mismatch',
                0x31: 'Invalid enum value',
                0x41: 'Storage byte array encoding error',
                0x51: 'Pop on empty array',
              };
              errorMessage = `Panic: ${panicMessages[Number(panicCode)] || `Unknown panic code: ${panicCode?.toString()}`}`;
            } else {
              errorMessage = decoded.args?.[0] || errorMessage;
            }
          }
        } catch (decodeError) {
          // If decoding fails, use the original error message
          console.debug('Could not decode error:', decodeError);
        }
      }
      
      throw new Error(`Failed to estimate transaction cost: ${errorMessage}`);
    }
    
    throw new Error(`Failed to estimate transaction cost: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create atoms through wrapper (with fee collection)
 */
export async function createAtomsWithFee(
  params: CreateAtomParams,
  walletClient: any,
  publicClient: any
): Promise<{ atomIds: `0x${string}`[]; txHash: string }> {
  if (TRANSACTION_WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('TransactionWrapper address not set. Please deploy the contract first.');
  }

  // Verify wallet client has user's address (not fee recipient)
  if (!walletClient?.account?.address) {
    throw new Error('Wallet client not properly initialized. Please connect your wallet.');
  }

  const userAddress = walletClient.account.address;
  const feeRecipient = CONTRACT_ADDRESSES.FEE_RECIPIENT.toLowerCase();
  if (userAddress.toLowerCase() === feeRecipient) {
    throw new Error('Invalid wallet: Cannot use fee recipient address as sender. Please use your own wallet.');
  }

  // Get atom creation cost from MultiVault
  const atomCost = await publicClient.readContract({
    abi: MULTIVAULT_ABI,
    address: MULTIVAULT_ADDRESS,
    functionName: 'getAtomCost',
  }) as bigint;

  // Calculate total value from params.assets array
  // Note: params.assets should contain the total value per atom (base cost + deposit)
  // The wrapper contract expects assets[i] to be the total value for atomDatas[i]
  const totalAssets = params.assets.reduce((sum, asset) => sum + asset, 0n);
  
  // Verify that each asset is at least the atom cost
  // The TransactionWrapper contract checks: msg.value >= getAtomCost() * length
  // So we need to ensure totalAssets >= atomCost * length
  const minRequiredValue = atomCost * BigInt(params.atomDatas.length);
  if (totalAssets < minRequiredValue) {
    throw new Error(
      `Insufficient value: assets sum (${totalAssets.toString()}) is less than minimum required ` +
      `(${minRequiredValue.toString()} = ${atomCost.toString()} * ${params.atomDatas.length})`
    );
  }
  
  // The operation cost (msg.value) should be the sum of all assets
  // This is what gets sent to the contract as msg.value
  const operationCost = totalAssets;
  
  console.log('🔍 Atom creation values:', {
    atomCost: atomCost.toString(),
    atomCostFormatted: `${(Number(atomCost) / 1e18).toFixed(6)} TRUST`,
    numAtoms: params.atomDatas.length,
    minRequired: minRequiredValue.toString(),
    minRequiredFormatted: `${(Number(minRequiredValue) / 1e18).toFixed(6)} TRUST`,
    totalAssets: totalAssets.toString(),
    totalAssetsFormatted: `${(Number(totalAssets) / 1e18).toFixed(6)} TRUST`,
    operationCost: operationCost.toString(),
    operationCostFormatted: `${(Number(operationCost) / 1e18).toFixed(6)} TRUST`,
    assetsArray: params.assets.map(a => a.toString()),
  });

  // Estimate transaction cost (operation + base gas + 30% dApp fee on gas)
  // Fee model: User pays operation cost + base gas + (base gas * 30%)
  // The 30% dApp fee goes to revenue wallet
  const { totalCost: estimatedTotal, baseGasCost, dAppFee } = await estimateTransactionCost(
    publicClient,
    'createAtomsWithFee',
    [params.atomDatas, params.assets],
    operationCost, // Operation cost (sum of assets)
    userAddress // Pass user's address for gas estimation
  );

  console.log('💰 Fee breakdown:', {
    operationCost: operationCost.toString(),
    operationCostFormatted: `${(Number(operationCost) / 1e18).toFixed(6)} TRUST`,
    baseGasCost: baseGasCost.toString(),
    baseGasCostFormatted: `${(Number(baseGasCost) / 1e18).toFixed(6)} TRUST`,
    dAppFee: dAppFee.toString(),
    dAppFeeFormatted: `${(Number(dAppFee) / 1e18).toFixed(6)} TRUST`,
    totalCost: estimatedTotal.toString(),
    totalCostFormatted: `${(Number(estimatedTotal) / 1e18).toFixed(6)} TRUST`,
  });

  // Verify user has enough balance for the entire transaction (operation + base gas + 30% dApp fee)
  const userBalance = await publicClient.getBalance({ address: userAddress });
  if (userBalance < estimatedTotal) {
    throw new Error(
      `Insufficient balance. Need ${estimatedTotal.toString()} wei (${(Number(estimatedTotal) / 1e18).toFixed(6)} TRUST), ` +
      `but have ${userBalance.toString()} wei (${(Number(userBalance) / 1e18).toFixed(6)} TRUST). ` +
      `Operation cost: ${operationCost.toString()} wei, Base gas: ${baseGasCost.toString()} wei, dApp fee: ${dAppFee.toString()} wei`
    );
  }

  // Execute transaction through wrapper (using user's wallet)
  // The transaction value includes: operation cost + base gas + 30% dApp fee
  // The contract will:
  // 1. Forward operation cost to MultiVault
  // 2. Extract 30% dApp fee and send to revenue wallet (0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07)
  // 3. Use remaining for actual gas payment
  const txHash = await walletClient.writeContract({
    abi: TRANSACTION_WRAPPER_ABI,
    address: TRANSACTION_WRAPPER_ADDRESS,
    functionName: 'createAtomsWithFee',
    args: [params.atomDatas, params.assets],
    value: estimatedTotal, // Send total: operation + base gas + 30% dApp fee
    account: walletClient.account, // Explicitly use user's account
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Parse events to get atom IDs (if needed)
  // For now, we'll need to query the contract or use the transaction receipt

  return { atomIds: [], txHash };
}

/**
 * Create triples through wrapper (with fee collection)
 */
export async function createTriplesWithFee(
  params: CreateTripleParams,
  walletClient: any,
  publicClient: any
): Promise<{ tripleIds: `0x${string}`[]; txHash: string }> {
  if (TRANSACTION_WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('TransactionWrapper address not set. Please deploy the contract first.');
  }

  // Verify wallet client has user's address (not fee recipient)
  if (!walletClient?.account?.address) {
    throw new Error('Wallet client not properly initialized. Please connect your wallet.');
  }

  const userAddress = walletClient.account.address;
  const feeRecipient = CONTRACT_ADDRESSES.FEE_RECIPIENT.toLowerCase();
  if (userAddress.toLowerCase() === feeRecipient) {
    throw new Error('Invalid wallet: Cannot use fee recipient address as sender. Please use your own wallet.');
  }

  // Get triple creation cost
  const tripleCost = await publicClient.readContract({
    abi: MULTIVAULT_ABI,
    address: MULTIVAULT_ADDRESS,
    functionName: 'getTripleCost',
  }) as bigint;

  // Calculate total value from params.assets array
  // Note: params.assets should contain the total value per triple (base cost + deposit)
  const totalAssets = params.assets.reduce((sum, asset) => sum + asset, 0n);
  
  // Verify minimum value: each asset must be at least tripleCost
  const minRequiredValue = tripleCost * BigInt(params.subjectIds.length);
  if (totalAssets < minRequiredValue) {
    throw new Error(
      `Insufficient value: assets sum (${totalAssets.toString()}) is less than minimum required ` +
      `(${minRequiredValue.toString()} = ${tripleCost.toString()} * ${params.subjectIds.length})`
    );
  }
  
  // The operation cost is the sum of all assets
  const operationCost = totalAssets;

  // Estimate transaction cost (operation + base gas + 30% dApp fee on gas)
  const { totalCost: estimatedTotal, baseGasCost, dAppFee } = await estimateTransactionCost(
    publicClient,
    'createTriplesWithFee',
    [params.subjectIds, params.predicateIds, params.objectIds, params.assets],
    operationCost,
    userAddress
  );

  // Verify user has enough balance for the entire transaction (operation + base gas + 30% dApp fee)
  const userBalance = await publicClient.getBalance({ address: userAddress });
  if (userBalance < estimatedTotal) {
    throw new Error(
      `Insufficient balance. Need ${estimatedTotal.toString()} wei, but have ${userBalance.toString()} wei.`
    );
  }

  // Execute transaction through wrapper (using user's wallet)
  // The transaction value includes: operation cost + base gas + 30% dApp fee
  const txHash = await walletClient.writeContract({
    abi: TRANSACTION_WRAPPER_ABI,
    address: TRANSACTION_WRAPPER_ADDRESS,
    functionName: 'createTriplesWithFee',
    args: [params.subjectIds, params.predicateIds, params.objectIds, params.assets],
    value: estimatedTotal, // Send total: operation + base gas + 30% dApp fee
    account: walletClient.account, // Explicitly use user's account
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { tripleIds: [], txHash };
}

/**
 * Deposit into a vault through wrapper (for quest completion)
 */
export async function depositWithFee(
  params: DepositParams,
  walletClient: any,
  publicClient: any
): Promise<{ shares: bigint; txHash: string }> {
  if (TRANSACTION_WRAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('TransactionWrapper address not set. Please deploy the contract first.');
  }

  // Verify wallet client has user's address
  if (!walletClient?.account?.address) {
    throw new Error('Wallet client not properly initialized. Please connect your wallet.');
  }

  const userAddress = walletClient.account.address;

  // Estimate transaction cost (operation + base gas + 30% dApp fee on gas)
  // The operation cost is the deposit amount
  const { totalCost: estimatedTotal, baseGasCost, dAppFee } = await estimateTransactionCost(
    publicClient,
    'depositWithFee',
    [params.receiver, params.termId, params.curveId, params.minShares, params.depositAmount],
    params.depositAmount,
    userAddress // Pass user's address for gas estimation
  );

  // Verify user has enough balance for the entire transaction (operation + base gas + 30% dApp fee)
  const userBalance = await publicClient.getBalance({ address: userAddress });
  if (userBalance < estimatedTotal) {
    throw new Error(
      `Insufficient balance. Need ${estimatedTotal.toString()} wei, but have ${userBalance.toString()} wei.`
  );
  }

  // Execute transaction
  // The transaction value includes: deposit amount + base gas + 30% dApp fee
  const txHash = await walletClient.writeContract({
    abi: TRANSACTION_WRAPPER_ABI,
    address: TRANSACTION_WRAPPER_ADDRESS,
    functionName: 'depositWithFee',
    args: [params.receiver, params.termId, params.curveId, params.minShares, params.depositAmount],
    value: estimatedTotal, // Send total: deposit + base gas + 30% dApp fee
    account: walletClient.account, // Explicitly use user's account
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Parse receipt to get shares (if event is emitted)
  // For now, return 0 as placeholder
  return { shares: 0n, txHash };
}

export { TRANSACTION_WRAPPER_ADDRESS, MULTIVAULT_ADDRESS };

