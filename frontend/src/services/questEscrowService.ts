import { type Address, parseUnits, formatUnits, type Hash } from 'viem';
import { type WalletClient, type PublicClient } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// QuestEscrow contract ABI (updated for native token)
const QUEST_ESCROW_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'questId', type: 'string' },
      { name: 'numberOfWinners', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'setWinners',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'questId', type: 'string' },
      { name: 'winnerAddresses', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'distributeRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'questId', type: 'string' }],
    outputs: [],
  },
  {
    name: 'getQuestDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'string' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'distributedAmount', type: 'uint256' },
      { name: 'isDistributed', type: 'bool' },
      { name: 'numberOfWinners', type: 'uint256' },
    ],
  },
  {
    name: 'getWinner',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'questId', type: 'string' },
      { name: 'winnerIndex', type: 'uint256' },
    ],
    outputs: [
      { name: 'winnerAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  // Events
  {
    type: 'event',
    name: 'DepositMade',
    inputs: [
      { name: 'questId', type: 'string', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'numberOfWinners', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'QuestDistributed',
    inputs: [
      { name: 'questId', type: 'string', indexed: true },
      { name: 'totalDistributed', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Get the QuestEscrow contract address
 */
export function getQuestEscrowAddress(): Address {
  const address = CONTRACT_ADDRESSES.QUEST_ESCROW;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestEscrow contract address not configured. Please set VITE_QUEST_ESCROW_ADDRESS in your .env file.');
  }
  return address;
}

/**
 * Check if user has enough native TRUST balance for deposit
 */
export async function checkBalance(
  userAddress: Address,
  amount: bigint,
  publicClient: PublicClient
): Promise<{ sufficient: boolean; currentBalance: bigint }> {
  const balance = await publicClient.getBalance({ address: userAddress });
  
  return {
    sufficient: balance >= amount,
    currentBalance: balance,
  };
}

/**
 * Deposit native TRUST tokens to escrow for a quest
 */
export async function depositToEscrow(
  questId: string,
  amount: string, // Amount in TRUST (e.g., "100.5")
  numberOfWinners: number,
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<{ transactionHash: Hash }> {
  const escrowAddress = getQuestEscrowAddress();
  if (escrowAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestEscrow contract address not configured');
  }

  // Convert amount to wei (18 decimals for native TRUST)
  const amountWei = parseUnits(amount, 18);

  // Check balance first
  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet not connected');
  }

  const { sufficient, currentBalance } = await checkBalance(
    account.address,
    amountWei,
    publicClient
  );

  if (!sufficient) {
    throw new Error(
      `Insufficient balance. Current: ${formatUnits(currentBalance, 18)} TRUST, Required: ${amount} TRUST`
    );
  }

  // Call deposit function with native token value
  const hash = await walletClient.writeContract({
    address: escrowAddress,
    abi: QUEST_ESCROW_ABI,
    functionName: 'deposit',
    args: [questId, BigInt(numberOfWinners)],
    value: amountWei, // Send native tokens with the transaction
  });

  return { transactionHash: hash };
}

/**
 * Set winners in escrow contract
 */
export async function setWinners(
  questId: string,
  winnerAddresses: Address[],
  amounts: string[], // Array of amounts in TRUST (e.g., ["10.5", "20.0"])
  walletClient: WalletClient
): Promise<{ transactionHash: Hash }> {
  const escrowAddress = getQuestEscrowAddress();
  if (escrowAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestEscrow contract address not configured');
  }

  // Convert amounts to wei
  const amountsWei = amounts.map((amt) => parseUnits(amt, 18));

  const hash = await walletClient.writeContract({
    address: escrowAddress,
    abi: QUEST_ESCROW_ABI,
    functionName: 'setWinners',
    args: [questId, winnerAddresses, amountsWei],
  });

  return { transactionHash: hash };
}

/**
 * Distribute rewards to winners
 */
export async function distributeRewards(
  questId: string,
  walletClient: WalletClient
): Promise<{ transactionHash: Hash }> {
  const escrowAddress = getQuestEscrowAddress();
  if (escrowAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestEscrow contract address not configured');
  }

  const hash = await walletClient.writeContract({
    address: escrowAddress,
    abi: QUEST_ESCROW_ABI,
    functionName: 'distributeRewards',
    args: [questId],
  });

  return { transactionHash: hash };
}

/**
 * Get quest deposit information
 */
export async function getQuestDeposit(
  questId: string,
  publicClient: PublicClient
): Promise<{
  creator: Address;
  totalAmount: string; // In TRUST
  distributedAmount: string; // In TRUST
  isDistributed: boolean;
  numberOfWinners: number;
}> {
  const escrowAddress = getQuestEscrowAddress();
  if (escrowAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('QuestEscrow contract address not configured');
  }

  const result = await publicClient.readContract({
    address: escrowAddress,
    abi: QUEST_ESCROW_ABI,
    functionName: 'getQuestDeposit',
    args: [questId],
  });

  return {
    creator: result[0],
    totalAmount: formatUnits(result[1], 18),
    distributedAmount: formatUnits(result[2], 18),
    isDistributed: result[3],
    numberOfWinners: Number(result[4]),
  };
}
