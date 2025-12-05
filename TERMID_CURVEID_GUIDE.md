# TermId and CurveId Guide for Intuition Protocol

This guide explains how to properly use `termIds` and `curveIds` when working with Intuition Protocol's atoms and triples, based on the SDK patterns.

## Overview

- **termId**: A `bytes32` identifier that uniquely identifies an atom or triple on the Intuition Protocol
- **curveId**: A `uint256` identifier that specifies which bonding curve to use when depositing into a vault

## Creating Atoms

### Using the SDK (Frontend/Backend)

When creating atoms with the SDK, the result includes a `state.termId`:

```typescript
import { createAtomFromString } from '@0xintuition/sdk';

const result = await createAtomFromString(
  { walletClient, publicClient, address },
  'My First Atom'
);

console.log('Atom ID:', result.state.termId); // bytes32 termId as hex string
```

### Using Smart Contracts

The updated `CreateSpace` and `CreateQuest` contracts now return `bytes32` termIds:

```solidity
// CreateSpace.sol
function createSpace(string calldata spaceName) external payable returns (bytes32 spaceTermId);

// CreateQuest.sol  
function createQuest(string calldata questName) external payable returns (bytes32 questTermId);
```

**Important**: The termId returned from the contract matches what the SDK returns in `result.state.termId`.

## Creating Triples (Claims)

### Using the SDK (Frontend/Backend)

Triples require subject, predicate, and object termIds:

```typescript
import { createTripleStatement } from '@0xintuition/sdk';

// First, get the subject, predicate, and object termIds
// These come from existing atoms or from SDK creation results
const subjectTermId = subject.state.termId;
const predicateTermId = predicate.state.termId;
const objectTermId = object.state.termId;

// Create the triple
const triple = await createTripleStatement(
  { walletClient, publicClient, address },
  {
    args: [
      subjectTermId,
      predicateTermId,
      objectTermId,
    ],
    value: 1_000_000_000_000_000_000n, // Optional deposit amount
  }
);

console.log('Triple ID:', triple.state.termId); // bytes32 termId
```

### Example: Creating a Quest Claim Triple

To create a claim that a user completed a quest:

```typescript
// 1. Get user's identity atom termId
const userIdentity = await getAtomDetails(userAtomId); // or from localStorage

// 2. Get or create predicate atom (e.g., "completed")
const completedPredicate = await createAtomFromString(
  { walletClient, publicClient, address },
  'completed'
);

// 3. Get quest atom termId (from CreateQuest contract)
const questTermId = await createQuestContract.read.questTermId(questId);

// 4. Create the triple claim
const claimTriple = await createTripleStatement(
  { walletClient, publicClient, address },
  {
    args: [
      userIdentity.termId,        // subject: user
      completedPredicate.state.termId, // predicate: "completed"
      questTermId,                // object: quest
    ],
    value: 0n, // No deposit required for claims
  }
);
```

## Fetching Existing Atoms/Triples

### Using the SDK

```typescript
import { getAtomDetails, getTripleDetails } from '@0xintuition/sdk';

// Fetch atom details
const atom = await getAtomDetails(atomTermId);
console.log('Atom termId:', atom.termId);
console.log('Atom label:', atom.label);

// Fetch triple details
const triple = await getTripleDetails(tripleTermId);
console.log('Triple termId:', triple.termId);
console.log('Subject:', triple.subjectId);
console.log('Predicate:', triple.predicateId);
console.log('Object:', triple.objectId);
```

### Using GraphQL

You can also query atoms and triples using the GraphQL API:

```typescript
import { fetcher } from '@0xintuition/graphql';

const GET_ATOM = `
  query GetAtom($termId: String!) {
    atoms(where: { term_id: { _eq: $termId } }) {
      term_id
      label
      data
      creator_id
      created_at
    }
  }
`;

const result = await fetcher(GET_ATOM, { termId: atomTermId });
```

## Depositing into Vaults with CurveIds

When depositing assets into a vault (atom or triple), you need to specify a `curveId`:

```typescript
import { deposit } from '@0xintuition/sdk';

// Deposit into an atom vault with a specific curve
await deposit(
  { walletClient, publicClient, address },
  {
    receiver: address,
    termId: atomTermId,           // bytes32 termId
    curveId: 1n,                  // Bonding curve ID (typically 1, 2, or 3)
    minShares: 0n,                // Minimum shares expected
    value: 1_000_000_000_000_000_000n, // Amount to deposit
  }
);
```

### Common CurveIds

- **CurveId 1**: Default bonding curve (most common)
- **CurveId 2**: Alternative bonding curve
- **CurveId 3**: Another bonding curve option

Check the MultiVault contract or protocol documentation for available curve IDs.

## Smart Contract Integration

### Updated Contracts

The following contracts have been updated to use `bytes32` termIds:

1. **CreateSpace.sol**: Returns `bytes32 spaceTermId`
2. **CreateQuest.sol**: Returns `bytes32 questTermId`

### MultiVault Interface

The contracts use the proper MultiVault v2 interface:

```solidity
interface IMultiVault {
    function createAtoms(
        bytes[] calldata atomDatas,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory);
    
    function createTriples(
        bytes32[] calldata subjectIds,
        bytes32[] calldata predicateIds,
        bytes32[] calldata objectIds,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory);
    
    function deposit(
        address receiver,
        bytes32 termId,
        uint256 curveId,
        uint256 minShares
    ) external payable returns (uint256);
}
```

## Best Practices

1. **Store termIds**: Always store the `termId` (as hex string) when creating atoms/triples
   ```typescript
   localStorage.setItem(`space_atom_${spaceId}`, result.state.termId);
   ```

2. **Validate termIds**: Ensure termIds are valid `bytes32` values before using them
   ```typescript
   if (!termId || termId.length !== 66 || !termId.startsWith('0x')) {
     throw new Error('Invalid termId format');
   }
   ```

3. **Use GraphQL for queries**: For fetching multiple atoms/triples, use GraphQL queries instead of multiple contract calls

4. **Handle errors gracefully**: SDK functions may fail; always wrap in try-catch blocks

5. **Check existing atoms/triples**: Before creating, check if the atom/triple already exists using `getAtomDetails` or GraphQL queries

## Migration Notes

If you're migrating from the old `uint256` atom IDs to `bytes32` termIds:

1. **Frontend**: Update all references from `uint256` atom IDs to `bytes32` termIds
2. **Storage**: Convert stored IDs to hex string format (0x...)
3. **API**: Update backend APIs to accept/return termIds as hex strings
4. **Database**: Store termIds as strings (66 characters: 0x + 64 hex chars)

## Example: Complete Flow

```typescript
// 1. Create a space identity atom
const spaceResult = await createAtomFromString(
  { walletClient, publicClient, address },
  'My Awesome Space'
);
const spaceTermId = spaceResult.state.termId;

// 2. Store the termId
localStorage.setItem(`space_${spaceId}`, spaceTermId);

// 3. Create a quest atom
const questResult = await createAtomFromString(
  { walletClient, publicClient, address },
  'Complete 10 Tasks'
);
const questTermId = questResult.state.termId;

// 4. Create a claim triple (user completed quest)
const userIdentityTermId = await getIdentityAtomId(userAddress);
const completedPredicateTermId = await getOrCreatePredicate('completed');

const claimTriple = await createTripleStatement(
  { walletClient, publicClient, address },
  {
    args: [userIdentityTermId, completedPredicateTermId, questTermId],
    value: 0n,
  }
);

// 5. Store the claim termId
localStorage.setItem(`claim_${questId}_${userAddress}`, claimTriple.state.termId);
```

## Resources

- [Intuition SDK Documentation](https://intuition.box/docs)
- [GraphQL API Reference](https://mainnet.intuition.sh/v1/graphql)
- MultiVault Contract: `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e` (Intuition Mainnet)

