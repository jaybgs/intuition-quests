# Deployment Summary - Intuition Mainnet

All contracts have been successfully deployed to Intuition Mainnet (Chain ID: 1155).

## Deployed Contracts

### 1. CreateSpace ✅
- **Contract Address**: `0xBf49c14876F0b652633705e9d9E23Fa6dbe2bCA1`
- **Network**: Intuition Mainnet
- **Deployed At**: 2025-12-05T08:43:00.686Z
- **Deployer**: `0x80D291e82C6f8a11cEC9A9BA699285AFe14d7F4D`
- **Purpose**: Creates space identity atoms on Intuition Protocol
- **Returns**: `bytes32` termId (matches SDK pattern)

**Frontend Environment Variable:**
```env
VITE_CREATE_SPACE_ADDRESS=0xBf49c14876F0b652633705e9d9E23Fa6dbe2bCA1
```

### 2. CreateQuest ✅
- **Contract Address**: `0x431204BFfADDE8d4Ac80d66FF8B9700A84fB1237`
- **Network**: Intuition Mainnet
- **Deployed At**: 2025-12-05 (latest deployment)
- **Deployer**: `0x80D291e82C6f8a11cEC9A9BA699285AFe14d7F4D`
- **Purpose**: Creates quest atoms on Intuition Protocol
- **Returns**: `bytes32` termId (matches SDK pattern)

**Frontend Environment Variable:**
```env
VITE_CREATE_QUEST_ADDRESS=0x431204BFfADDE8d4Ac80d66FF8B9700A84fB1237
```

### 3. ClaimQuest ✅
- **Contract Address**: `0xa0b721021a7D3F8C7Cd1d28efB3C07A799c4Cd6a`
- **Network**: Intuition Mainnet
- **Deployed At**: 2025-12-05 (latest deployment)
- **Deployer**: `0x80D291e82C6f8a11cEC9A9BA699285AFe14d7F4D`
- **Purpose**: Creates claim triples when users claim/complete quests
- **Returns**: `bytes32` termId for the claim triple (matches SDK pattern)
- **Creates Triple**: (userTermId, predicateTermId, questTermId)

**Frontend Environment Variable:**
```env
VITE_CLAIM_QUEST_ADDRESS=0xa0b721021a7D3F8C7Cd1d28efB3C07A799c4Cd6a
```

## Configuration

### MultiVault Address
- **Address**: `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e`
- All contracts use this MultiVault instance

### Revenue Wallet
- **Address**: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`
- Receives 30% dApp fee on top of base creation costs

## Contract Features

### All Contracts Use:
- ✅ **bytes32 termIds**: Match SDK return values (`result.state.termId`)
- ✅ **MultiVault v2 Interface**: Proper integration with Intuition Protocol
- ✅ **Fee Handling**: 30% dApp fee on additional value sent
- ✅ **Error Handling**: Comprehensive error messages

### CreateSpace & CreateQuest:
- Create atoms using `createAtoms()` batch function
- Return `bytes32` termId for created atom

### ClaimQuest:
- Creates triples using `createTriples()` batch function
- Takes three termIds: user (subject), predicate (e.g., "completed"), quest (object)
- Returns `bytes32` termId for created triple claim

## Usage Examples

### Frontend Integration

```typescript
// Create a space
const spaceResult = await createSpaceContract.write.createSpace({
  args: ["My Awesome Space"],
  value: atomCost + dAppFee,
});
const spaceTermId = await createSpaceContract.read.createSpace.returns();

// Create a quest
const questResult = await createQuestContract.write.createQuest({
  args: ["Complete 10 Tasks"],
  value: atomCost + dAppFee,
});
const questTermId = await createQuestContract.read.createQuest.returns();

// Claim a quest (create triple)
const claimResult = await claimQuestContract.write.claimQuest({
  args: [userTermId, completedPredicateTermId, questTermId],
  value: tripleCost + dAppFee,
});
const claimTermId = await claimQuestContract.read.claimQuest.returns();
```

## Verification Status

⚠️ **Verification Skipped**: Contract verification was skipped during deployment to avoid timeout issues.

Verification can be done manually later if needed:
```bash
npx hardhat verify --network intuition <CONTRACT_ADDRESS> <MULTIVAULT_ADDRESS> <REVENUE_WALLET>
```

## Network Information

- **Network Name**: Intuition Mainnet
- **Chain ID**: 1155
- **RPC URL**: `https://rpc.intuition.systems/http`
- **Explorer**: `https://explorer.intuition.systems`

## Next Steps

1. ✅ Update frontend `.env` file with contract addresses
2. ✅ Update frontend code to handle `bytes32` termIds
3. ✅ Update contract interaction code to use new addresses
4. ⏭️ (Optional) Manually verify contracts on block explorer
5. ⏭️ Test contract interactions end-to-end

## Files Generated

- `deployment-create-space.json` - CreateSpace deployment info
- `deployment-create-quest.json` - CreateQuest deployment info
- `deployment-claim-quest.json` - ClaimQuest deployment info

---

**All contracts are now live on Intuition Mainnet!** 🚀

