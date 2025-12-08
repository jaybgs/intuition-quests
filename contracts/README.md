# TrustQuests Smart Contracts

This directory contains the Solidity smart contracts for TrustQuests on Intuition Chain (Chain ID: 1155).

## Contracts Overview

### Contract 1: SpaceIdentityFactory
**Purpose**: Creates unique identity atoms on Intuition chain for spaces.

- When a user creates a space, this contract creates an atom using `spaceName + createdAt` to ensure uniqueness
- Charges a 30% fee on top of atom creation cost
- Stores the atom ID both on-chain and off-chain

**Key Functions**:
- `createSpaceIdentity(spaceName, createdAt)` - Creates a space identity atom
- `getSpaceAtomId(spaceId)` - Returns the atom ID for a space
- `getCreateCost()` - Returns total cost including 30% fee

### Contract 2: QuestEscrow
**Purpose**: Holds deposited quest rewards securely until distribution.

- Quest creators deposit TRUST tokens when creating quests
- Funds are held in escrow until the quest ends
- Admin/Oracle sets winners after quest completion
- Funds are released to the relayer for distribution

**Key Functions**:
- `deposit(questId, numberOfWinners)` - Deposit reward funds
- `setWinners(questId, winners, amounts)` - Set raffle/FCFS winners
- `releaseToRelayer(questId)` - Release funds to relayer for distribution
- `getQuestDeposit(questId)` - Get deposit info

### Contract 3: QuestAtomFactory
**Purpose**: Creates atoms on Intuition chain for quests.

- When a quest is published, this creates an atom that users can stake/claim on
- Links quests to their parent space atom (if applicable)
- Charges a 30% fee on top of atom creation cost

**Key Functions**:
- `createQuestAtom(questId, questTitle, spaceAtomId)` - Creates a quest atom
- `getQuestAtomId(questId)` - Returns the atom ID for a quest
- `getCreateCost()` - Returns total cost including 30% fee

### Contract 4: ClaimIQ
**Purpose**: Handles IQ claiming when users complete quests.

Fee structure when claiming (1 TRUST total):
- 0.6 TRUST → Relayer wallet (for staking on the claim)
- 0.4 TRUST → Revenue wallet

Creates a Triple on Intuition: `[User] [completed] [Quest]`

**Key Functions**:
- `claimQuest(questId, questAtomId, userAtomId)` - Claim quest completion
- `initializeCompletedPredicate()` - One-time setup for "completed" predicate
- `hasClaimedQuest(user, questId)` - Check if already claimed
- `getClaimFee()` - Returns the 1 TRUST claim fee

### Contract 5: FeeWrapper
**Purpose**: Adds 30% surcharge to all transactions.

- All TrustQuests transactions go through this wrapper
- Automatically adds 30% fee to any transaction value
- Fee goes directly to revenue wallet

**Key Functions**:
- `executeWithFee(target, data, value)` - Execute a call with 30% fee
- `calculateTotalCost(baseAmount)` - Calculate total cost with fee
- `setTargetAllowed(target, allowed)` - Admin: whitelist target contracts

## Wallet Addresses

```
RELAYER_WALLET = 0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2
REVENUE_WALLET = 0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07
```

## Deployment

### Prerequisites
1. Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. Set environment variables:
   ```bash
   export PRIVATE_KEY=your_deployer_private_key
   export INTUITION_RPC=https://rpc.intuition.systems/http
   export MULTIVAULT_ADDRESS=0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e
   export RELAYER_WALLET=0xB90A9fbBCBa1A59c5Ba376649E7C1460BB9353B2
   export REVENUE_WALLET=0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07
   export ADMIN_ADDRESS=your_admin_address
   ```

### Deployment Order
Deploy in this order due to dependencies:

1. **FeeWrapper** (no dependencies)
   ```bash
   forge create src/FeeWrapper.sol:FeeWrapper \
     --rpc-url $INTUITION_RPC \
     --private-key $PRIVATE_KEY \
     --constructor-args $REVENUE_WALLET $ADMIN_ADDRESS
   ```

2. **SpaceIdentityFactory** (needs MultiVault address)
   ```bash
   forge create src/SpaceIdentityFactory.sol:SpaceIdentityFactory \
     --rpc-url $INTUITION_RPC \
     --private-key $PRIVATE_KEY \
     --constructor-args $MULTIVAULT_ADDRESS $REVENUE_WALLET $RELAYER_WALLET
   ```

3. **QuestAtomFactory** (needs MultiVault address)
   ```bash
   forge create src/QuestAtomFactory.sol:QuestAtomFactory \
     --rpc-url $INTUITION_RPC \
     --private-key $PRIVATE_KEY \
     --constructor-args $MULTIVAULT_ADDRESS $REVENUE_WALLET
   ```

4. **QuestEscrow** (no contract dependencies)
   ```bash
   forge create src/QuestEscrow.sol:QuestEscrow \
     --rpc-url $INTUITION_RPC \
     --private-key $PRIVATE_KEY \
     --constructor-args $REVENUE_WALLET $RELAYER_WALLET $ADMIN_ADDRESS
   ```

5. **ClaimIQ** (needs MultiVault address)
   ```bash
   forge create src/ClaimIQ.sol:ClaimIQ \
     --rpc-url $INTUITION_RPC \
     --private-key $PRIVATE_KEY \
     --constructor-args $MULTIVAULT_ADDRESS $REVENUE_WALLET $RELAYER_WALLET
   ```

### Post-Deployment

1. **Update Frontend Addresses**:
   Edit `frontend/src/contracts/addresses.ts` with deployed addresses:
   ```typescript
   export const CONTRACT_ADDRESSES = {
     SPACE_IDENTITY_FACTORY: '0x...',
     QUEST_ESCROW: '0x...',
     QUEST_ATOM_FACTORY: '0x...',
     CLAIM_IQ: '0x...',
     FEE_WRAPPER: '0x...',
   };
   ```

2. **Initialize ClaimIQ Predicate**:
   Call `initializeCompletedPredicate()` on ClaimIQ contract (one-time setup)

3. **Whitelist Targets in FeeWrapper**:
   Call `setTargetAllowed(address, true)` for each contract that should use the wrapper

## Fee Structure Summary

| Action | Base Cost | 30% Fee | Total |
|--------|-----------|---------|-------|
| Create Space | Atom cost (~0.001 TRUST) | +30% | ~0.0013 TRUST |
| Create Quest | Atom cost (~0.001 TRUST) | +30% | ~0.0013 TRUST |
| Deposit Rewards | Deposit amount | +30% | Deposit + 30% |
| Claim IQ | 1 TRUST | (split) | 1 TRUST |

### Claim IQ Fee Split
- 0.6 TRUST → Relayer (for staking)
- 0.4 TRUST → Revenue wallet

## Security Considerations

1. **Admin Functions**: setWinners, releaseToRelayer, updateAdmin require admin role
2. **Reentrancy**: All contracts use checks-effects-interactions pattern
3. **Withdrawal**: Depositors can withdraw before winners are set (if quest cancelled)
4. **Fee Wrapper**: Only whitelisted targets can be called through the wrapper

## Testing

```bash
cd contracts
forge test
```

## License

MIT

