/**
 * Contract ABIs for TrustQuests on Intuition Chain
 * Updated: Dec 8, 2025 - Removed FeeWrapper, contracts use direct MultiVault calls
 */

// Quest Escrow ABI - Only functions needed for frontend
export const QUEST_ESCROW_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'numberOfWinners', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'distributionType', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getQuestDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [
      { name: 'totalAmount', type: 'uint256' },
      { name: 'numberOfWinners', type: 'uint256' },
      { name: 'isDistributed', type: 'bool' },
      { name: 'depositor', type: 'address' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'distributionType', type: 'string' },
    ],
  },
  {
    name: 'getQuestStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [
      { name: 'hasDeposit', type: 'bool' },
      { name: 'isExpired', type: 'bool' },
      { name: 'winnersSet', type: 'bool' },
      { name: 'isDistributed', type: 'bool' },
      { name: 'timeRemaining', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
    ],
  },
  {
    name: 'relayerWallet',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'admin',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'RELEASE_GRACE_PERIOD',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Space Identity Factory ABI (for reference, but now uses SDK)
export const SPACE_IDENTITY_FACTORY_ABI = [
  {
    name: 'createSpaceIdentity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'spaceName', type: 'string' },
      { name: 'createdAt', type: 'uint256' },
    ],
    outputs: [{ name: 'atomId', type: 'uint256' }],
  },
  {
    name: 'getCreateCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSpaceAtomId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'spaceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'calculateSpaceId',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'spaceName', type: 'string' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'creator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

// Quest Atom Factory ABI (for reference, but now uses SDK)
export const QUEST_ATOM_FACTORY_ABI = [
  {
    name: 'createQuestAtom',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'questTitle', type: 'string' },
      { name: 'spaceAtomId', type: 'uint256' },
    ],
    outputs: [{ name: 'atomId', type: 'uint256' }],
  },
  {
    name: 'getCreateCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getQuestAtomId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Claim IQ ABI (for reference, but now uses SDK)
export const CLAIM_IQ_ABI = [
  {
    name: 'claimQuest',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'questId', type: 'bytes32' },
      { name: 'questAtomId', type: 'uint256' },
      { name: 'userAtomId', type: 'uint256' },
    ],
    outputs: [{ name: 'tripleId', type: 'uint256' }],
  },
  {
    name: 'hasClaimedQuest',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'questId', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getClaimCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getQuestClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'questId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'tripleId', type: 'uint256' },
      { name: 'claimedAt', type: 'uint256' },
    ],
  },
  {
    name: 'completedPredicateAtomId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Intuition MultiVault ABI (for direct atom/triple creation)
export const INTUITION_MULTI_VAULT_ABI = [
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
  {
    name: 'createAtoms',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'data', type: 'bytes[]' },
      { name: 'assets', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'bytes32[]' }],
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
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
] as const;
