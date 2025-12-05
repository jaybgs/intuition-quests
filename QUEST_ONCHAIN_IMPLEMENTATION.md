# Quest On-Chain Implementation Guide

## Overview

This document outlines the implementation of on-chain quest creation and completion using Intuition Protocol atoms and triples, with automatic 30% fee collection on all transactions.

## Components Created

### 1. Smart Contract (`contracts/TransactionWrapper.sol`)
- Wraps all MultiVault operations
- Automatically collects 30% fee on gas costs
- Functions:
  - `createAtomsWithFee()` - Create atoms with fee
  - `createTriplesWithFee()` - Create triples/claims with fee
  - `depositWithFee()` - Deposit/stake with fee (for quest completion)
  - `depositBatchWithFee()` - Batch deposits with fee

### 2. Frontend Services

#### `transactionWrapperService.ts`
- Core service for interacting with the wrapper contract
- Gas estimation and fee calculation
- Transaction execution through wrapper

#### `questAtomService.ts`
- Creates quest atoms on-chain when quests are published
- Checks if quest atoms already exist

#### `questCompletionService.ts`
- Creates triples/claims for quest completion: [User][completed][Quest]
- Handles staking on completion triples

### 3. Configuration

#### `frontend/src/config/contracts.ts`
- Contract addresses configuration
- Fee recipient: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`
- Fee percentage: 30%

## Implementation Status

✅ **Completed:**
- Smart contract wrapper with 30% fee collection
- Deployment scripts
- Frontend service structure
- Quest type updated with `atomId` and `tripleId` fields
- Configuration files

⏳ **In Progress:**
- Quest publishing integration (atom creation)
- Quest completion integration (triple creation + staking)

## Next Steps

### 1. Deploy the Wrapper Contract

```bash
# Set environment variables
export FEE_RECIPIENT_ADDRESS=0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07
export PRIVATE_KEY=your_deployer_private_key
export INTUITION_RPC_URL=https://rpc.intuition.systems/http

# Compile
npm run compile

# Deploy
npm run deploy:wrapper
```

After deployment, add the contract address to:
- Root `.env`: `VITE_TRANSACTION_WRAPPER_ADDRESS=0x...`
- `frontend/.env`: `VITE_TRANSACTION_WRAPPER_ADDRESS=0x...`

### 2. Integrate Atom Creation in Quest Publishing

**File:** `frontend/src/components/CreateQuestBuilder.tsx`

**Location:** `handleNext` function when `currentStep === 4`

**Implementation:**
```typescript
// Add imports
import { usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { createQuestAtom } from '../services/questAtomService';
import { intuitionChain } from '../config/wagmi';

// In handleNext function, when currentStep === 4:
if (currentStep === maxStep) {
  // Publish quest with on-chain atom creation
  try {
    setIsPublishing(true);
    
    // 1. Check network
    const chainId = useChainId();
    if (chainId !== intuitionChain.id) {
      await switchChain({ chainId: intuitionChain.id });
      showToast(`Switched to ${intuitionChain.name}. Please try publishing again.`, 'info');
      return;
    }
    
    // 2. Create atom on-chain
    if (walletClient && publicClient) {
      showToast('Creating quest on-chain identity...', 'info');
      const atomResult = await createQuestAtom(title, walletClient, publicClient);
      
      // 3. Publish quest to backend/localStorage with atomId
      const questData = {
        // ... existing quest data
        atomId: atomResult.atomId,
        atomTransactionHash: atomResult.transactionHash,
      };
      
      // Save to backend or localStorage
      // ... existing publishing logic
      
      showToast('Quest published successfully!', 'success');
      onNext?.();
    }
  } catch (error) {
    showToast(error.message || 'Failed to publish quest', 'error');
  } finally {
    setIsPublishing(false);
  }
}
```

### 3. Integrate Triple Creation in Quest Completion

**File:** `frontend/src/components/QuestDetail.tsx`

**Location:** When user clicks "Claim IQ Points" after completing all steps

**Implementation:**
```typescript
// Add imports
import { stakeOnQuestCompletion } from '../services/questCompletionService';
import { useWalletClient, usePublicClient, useChainId, useSwitchChain } from 'wagmi';

// In claim handler:
const handleClaimIQPoints = async () => {
  try {
    // 1. Check network
    if (chainId !== intuitionChain.id) {
      await switchChain({ chainId: intuitionChain.id });
      return;
    }
    
    // 2. Create triple [User][completed][Quest] and stake
    if (walletClient && publicClient && quest.atomId) {
      showToast('Creating completion claim on-chain...', 'info');
      
      // Create triple and stake (minimal deposit, e.g., 0.01 TRUST)
      const depositAmount = parseEther('0.01'); // 0.01 TRUST
      
      const result = await stakeOnQuestCompletion(
        quest.atomId as `0x${string}`,
        address!,
        depositAmount,
        walletClient,
        publicClient
      );
      
      showToast('Quest completion claimed on-chain!', 'success');
      
      // Update quest with tripleId
      // ... update logic
    }
  } catch (error) {
    showToast(error.message || 'Failed to claim on-chain', 'error');
  }
};
```

### 4. Update Quest Data Storage

When publishing or completing quests, ensure `atomId` and `tripleId` are stored:

**Backend:** Update quest schema to include:
- `atomId?: string`
- `atomTransactionHash?: string`
- `tripleId?: string`

**LocalStorage:** Include these fields when saving published quests

## Fee Collection

The wrapper contract automatically:
1. Calculates actual gas used
2. Computes 30% fee: `(gasCost * 30) / 100`
3. Transfers fee to: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`
4. Refunds any excess to user

## Testing Checklist

- [ ] Deploy wrapper contract to testnet
- [ ] Test atom creation for quest publishing
- [ ] Test triple creation for quest completion
- [ ] Verify fee collection (30% of gas cost)
- [ ] Test network switching
- [ ] Test error handling
- [ ] Verify refunds work correctly
- [ ] Test on mainnet after testnet validation

## Important Notes

1. **Network Requirement:** All on-chain operations require Intuition Network (Chain ID: 1155)
2. **Gas Estimation:** Frontend estimates gas with buffer, but actual fee is based on real gas used
3. **Fee Recipient:** Cannot be changed after deployment (immutable in constructor)
4. **Error Handling:** If atom creation fails, quest can still be published (optional feature)
5. **User Experience:** Show clear loading states and transaction status

## Support

For issues or questions:
1. Check contract deployment logs
2. Verify environment variables are set correctly
3. Ensure wallet is connected to Intuition Network
4. Check transaction receipts on block explorer

