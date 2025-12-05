# Integrating Intuition Atom Creation with Space Creation

## Overview

Yes, it's absolutely possible to simultaneously create a claim/atom on Intuition mainnet when a user creates a space. When a user creates a space, they can sign an on-chain transaction that creates a claim/atom on the Intuition blockchain with the same name as the space.

## How It Works

### 1. **What is an Atom/Claim on Intuition?**

An **atom** (also called an **identity** or **claim**) is a unique, on-chain entity in the Intuition knowledge graph. Atoms can represent:
- Names/identifiers (e.g., "DeFi Protocol")
- Ethereum addresses
- IPFS URIs
- Smart contract addresses
- Custom strings

In this case, we'll create an atom using the space name (e.g., "DeFi Protocol" or "My Project Space").

### 2. **Architecture Flow**

```
User Creates Space
    ↓
1. Validate Space Data (name, description, etc.)
    ↓
2. Generate Atom Data (space name as string)
    ↓
3. Check if Atom Already Exists (optional - prevent duplicates)
    ↓
4. Calculate Atom Creation Cost (getAtomCost from MultiVault)
    ↓
5. User Approves Transaction (wallet signature)
    ↓
6. Create Atom On-Chain (MultiVault.createAtoms transaction)
    ↓
7. Wait for Transaction Confirmation
    ↓
8. Parse Atom Creation Events (get atomId, transactionHash)
    ↓
9. Save Space to localStorage with atomId reference
    ↓
10. Display Success (space created + atom created)
```

### 3. **Technical Implementation**

#### Step 1: Install/Verify Required Packages

You already have the required packages installed:
- `@0xintuition/protocol` - Core protocol utilities
- `@0xintuition/sdk` - High-level SDK functions
- `@0xintuition/graphql` - GraphQL client (for queries)

#### Step 2: Create Atom Creation Service

Create a utility function that handles atom creation:

```typescript
// frontend/src/services/intuitionAtomService.ts
import { createAtomFromString } from '@0xintuition/sdk';
import { getMultiVaultAddressFromChainId } from '@0xintuition/protocol';
import { createWalletClient, createPublicClient, http, type Address } from 'viem';
import { intuitionChain } from '../config/wagmi';
import type { WriteConfig } from '@0xintuition/protocol';

export interface CreateAtomResult {
  atomId: string;
  transactionHash: string;
  uri: string;
  success: boolean;
}

export async function createSpaceAtom(
  spaceName: string,
  walletClient: any, // wagmi walletClient
  publicClient: any, // wagmi publicClient
  depositAmount?: bigint
): Promise<CreateAtomResult> {
  try {
    // 1. Get MultiVault contract address
    const multiVaultAddress = getMultiVaultAddressFromChainId(intuitionChain.id);
    
    // 2. Create WriteConfig for Intuition SDK
    const writeConfig: WriteConfig = {
      address: multiVaultAddress,
      walletClient,
      publicClient,
    };
    
    // 3. Create atom from space name string
    const result = await createAtomFromString(
      writeConfig,
      spaceName as `${string}`, // Cast to template literal type
      depositAmount || BigInt(0) // Optional initial deposit
    );
    
    // 4. Extract atom ID from the event args
    const atomId = result.state?.termId || result.uri;
    
    return {
      atomId,
      transactionHash: result.transactionHash,
      uri: result.uri,
      success: true,
    };
  } catch (error: any) {
    console.error('Error creating atom:', error);
    throw new Error(`Failed to create atom: ${error.message}`);
  }
}
```

#### Step 3: Update SpaceBuilder Component

Modify `SpaceBuilder.tsx` to integrate atom creation:

```typescript
// In SpaceBuilder.tsx
import { useWalletClient, usePublicClient } from 'wagmi';
import { createSpaceAtom } from '../services/intuitionAtomService';
import { parseEther } from 'viem';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!address || !name.trim() || !description.trim()) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  setIsSubmitting(true);

  try {
    // Get wallet and public clients from wagmi
    const walletClient = await getWalletClient();
    const publicClient = await getPublicClient();
    
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    // OPTIONAL: Check if atom already exists before creating
    // This prevents duplicate atoms with the same name
    // const atomExists = await checkAtomExists(name);
    
    // 1. Create atom on Intuition blockchain FIRST
    showToast('Creating atom on Intuition blockchain...', 'info');
    
    const atomResult = await createSpaceAtom(
      name.trim(),
      walletClient,
      publicClient,
      parseEther('0') // Optional: initial deposit (0 for now)
    );
    
    showToast(`Atom created! Transaction: ${atomResult.transactionHash.slice(0, 10)}...`, 'success');

    // 2. Create space locally with atom reference
    const space = spaceService.createSpace({
      name: name.trim(),
      description: description.trim(),
      logo: logoPreview || undefined,
      twitterUrl: twitterUrl.trim(),
      ownerAddress: address,
      userType,
    });
    
    // 3. Store atom reference with space (optional - store in space metadata)
    // You might want to add an atomId field to the Space type
    localStorage.setItem(`space_atom_${space.id}`, atomResult.atomId);
    localStorage.setItem(`space_atom_tx_${space.id}`, atomResult.transactionHash);

    showToast('Space created successfully!', 'success');
    
    if (onSpaceCreated) {
      onSpaceCreated(space.id);
    } else {
      onBack();
    }
  } catch (error: any) {
    console.error('Error creating space:', error);
    showToast(error.message || 'Failed to create space. Please try again.', 'error');
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Step 4: Optional - Check if Atom Exists

To prevent duplicate atoms with the same name:

```typescript
// frontend/src/services/intuitionAtomService.ts

import { calculateAtomId } from '@0xintuition/protocol';
import { toHex } from 'viem';

export async function checkAtomExists(
  spaceName: string,
  publicClient: any,
  multiVaultAddress: Address
): Promise<boolean> {
  try {
    const atomId = await calculateAtomId(publicClient, multiVaultAddress, toHex(spaceName));
    
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
    return false;
  }
}
```

### 4. **Cost Considerations**

When creating an atom, users need to pay:
- **Atom Base Cost**: A small fee to create the atom (paid in TRUST token)
- **Optional Deposit**: An initial deposit into the atom's bonding curve

To get the current cost:

```typescript
import { getAtomCost } from '@0xintuition/protocol';

const atomCost = await getAtomCost({
  publicClient,
  address: multiVaultAddress,
});

console.log(`Atom creation cost: ${formatEther(atomCost)} TRUST`);
```

### 5. **Network Requirements**

- **Chain ID**: 1155 (Intuition Mainnet)
- **RPC URL**: `https://rpc.intuition.systems/http`
- **Native Token**: TRUST (for gas and atom creation)
- **MultiVault Contract**: Retrieved via `getMultiVaultAddressFromChainId(1155)`

### 6. **User Experience Flow**

1. User fills out space creation form (name, description, etc.)
2. User clicks "Create Space"
3. App checks if wallet is connected to Intuition Network (chain ID 1155)
4. If not, prompt user to switch networks
5. Show transaction approval dialog (MetaMask/wallet)
   - Transaction details: "Create Atom: [Space Name]"
   - Cost: X TRUST
6. User approves transaction
7. Transaction is broadcast to Intuition Network
8. Wait for confirmation (show loading state)
9. Once confirmed, create space locally with atom reference
10. Display success message with transaction link

### 7. **Error Handling**

Handle these scenarios:
- **Insufficient Balance**: User doesn't have enough TRUST for gas + atom cost
- **Atom Already Exists**: Another user already created an atom with this name
- **Network Mismatch**: User is on wrong network (prompt to switch)
- **Transaction Rejected**: User rejects the transaction
- **Transaction Failure**: Transaction fails (revert, timeout, etc.)

### 8. **Benefits of This Integration**

1. **On-Chain Identity**: Space has a permanent on-chain identity
2. **Interoperability**: Space can be referenced across Intuition ecosystem
3. **Discoverability**: Space appears in Intuition knowledge graph
4. **Verification**: On-chain proof of space creation
5. **Future Features**: Enables staking, claims, and other Intuition features

### 9. **Optional Enhancements**

- **Store atom ID in Space type**: Add `atomId?: string` field
- **Display atom link**: Show link to Intuition Explorer for the atom
- **Query atom data**: Use GraphQL to fetch atom stats (shares, stakers, etc.)
- **Batch creation**: Allow creating multiple spaces with batch atom creation

## Implementation Checklist

- [ ] Create `intuitionAtomService.ts` utility
- [ ] Update `Space` type to include `atomId` field
- [ ] Add atom creation to `SpaceBuilder` component
- [ ] Add network switching logic (if not on Intuition Network)
- [ ] Add cost estimation display before transaction
- [ ] Handle transaction states (pending, confirmed, failed)
- [ ] Add atom explorer link to space detail page
- [ ] Test with testnet first (chain ID 13579)

## Example Transaction Flow

```
1. User enters space name: "My Awesome Project"
2. Click "Create Space"
3. MetaMask opens:
   - Network: Intuition Network (1155)
   - Transaction: createAtoms(["0x...My Awesome Project..."], [cost])
   - Cost: 0.001 TRUST (example)
4. User approves
5. Transaction hash: 0xabc123...
6. Wait for 1-2 block confirmations
7. Atom created with ID: 0xdef456...
8. Space saved with atomId reference
9. Success!
```

This integration creates a seamless experience where creating a space automatically creates its on-chain identity on Intuition, making it part of the decentralized knowledge graph!

