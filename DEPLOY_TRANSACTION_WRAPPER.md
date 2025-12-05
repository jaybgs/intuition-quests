# TransactionWrapper Contract Deployment Guide

## Overview
This guide will help you deploy the new TransactionWrapper contract with the updated fee model:
- **Fee Model**: Base gas fee + 30% dApp fee on top
- **Revenue Wallet**: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`
- **Example**: If gas fee is 0.1 TRUST, user pays 0.13 TRUST (0.1 + 0.03)

## Prerequisites
1. Node.js and npm installed
2. Hardhat installed (`npm install`)
3. Private key with TRUST tokens for deployment
4. Access to Intuition Network (Chain ID: 1155)

## Deployment Steps

### 1. Set Up Environment Variables
Create or update your `.env` file in the project root:

```env
# Required: Private key for deployment (must have TRUST tokens)
PRIVATE_KEY=your_private_key_here

# Optional: Revenue wallet address (defaults to 0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07)
REVENUE_WALLET_ADDRESS=0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07

# Optional: RPC URL (defaults to https://rpc.intuition.systems/http)
INTUITION_RPC_URL=https://rpc.intuition.systems/http

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Compile the Contract
```bash
npx hardhat compile
```

### 3. Deploy to Intuition Network
```bash
npx hardhat run scripts/deploy-wrapper.js --network intuition
```

### 4. Save the Deployed Address
After deployment, you'll see output like:
```
TransactionWrapper deployed to: 0x...
```

Copy this address and update your frontend configuration:

**Update `frontend/src/config/contracts.ts`:**
```typescript
TRANSACTION_WRAPPER: "0x...YOUR_NEW_ADDRESS..." as Address,
```

**Or set environment variable:**
```env
VITE_TRANSACTION_WRAPPER_ADDRESS=0x...YOUR_NEW_ADDRESS...
```

### 5. Verify the Contract (Optional)
If you have an ETHERSCAN_API_KEY set, the contract will be automatically verified.

## Contract Details

### Constructor Parameters
- `_multiVault`: `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e` (MultiVault on Intuition Mainnet)
- `_revenueWallet`: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07` (Your revenue wallet)

### Fee Structure
- **Base Gas Fee**: Paid to the network for transaction execution
- **dApp Fee**: 30% of base gas fee, sent to revenue wallet
- **Total User Pays**: operation cost + base gas + (base gas × 30%)

### Functions
- `createAtomsWithFee(bytes[] atomDatas, uint256[] assets)` - Create atoms with fee
- `createTriplesWithFee(...)` - Create triples with fee
- `depositWithFee(...)` - Deposit with fee
- `depositBatchWithFee(...)` - Batch deposit with fee

## Testing the Deployment

After deployment, test by creating a space:
1. The frontend will automatically use the new contract
2. Check that the 30% dApp fee is sent to the revenue wallet
3. Verify transactions complete successfully

## Troubleshooting

### "Insufficient funds" error
- Ensure your deployment account has enough TRUST tokens
- Check that the account has TRUST for gas fees

### "Invalid MultiVault address" error
- Verify the MultiVault address is correct: `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e`

### Contract verification fails
- Wait a few minutes after deployment before verifying
- Ensure ETHERSCAN_API_KEY is set correctly

## Next Steps

After successful deployment:
1. ✅ Update `frontend/src/config/contracts.ts` with new contract address
2. ✅ Test space creation to verify fee collection
3. ✅ Monitor revenue wallet for incoming dApp fees
4. ✅ Update any documentation with the new contract address
