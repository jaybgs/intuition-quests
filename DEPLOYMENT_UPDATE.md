# TransactionWrapper Contract - Updated Deployment

## New Contract Address

**Contract Address:** `0x68A46ca88B6Fd446927b18CAE132ccb49e89d03A`

**Previous Address:** `0x96607eB0515EE867a2d8453CcD7F8779384a1079` (replaced)

## What Was Fixed

### 1. Fee Calculation Logic
The contract now correctly implements:
- **User pays:** `operationCost + gasCost + (gasCost * 30%)`
- **30% of gas cost** is sent to fee recipient: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`
- **Excess funds** are automatically refunded to the user

### 2. Contract Functions Updated
- `createAtomsWithFee()` - Fixed fee calculation
- `createTriplesWithFee()` - Fixed fee calculation  
- `depositWithFee()` - Fixed fee calculation
- `depositBatchWithFee()` - Added `totalDepositAmount` parameter for proper fee handling

### 3. Frontend Updates
- Space creation now uses the wrapper contract (not direct MultiVault calls)
- Added wallet verification to ensure user's wallet is used (not fee recipient)
- Updated cost estimation to show: operationCost + gasCost + 30% fee

## Update Required

**Update your `.env` file:**
```env
VITE_TRANSACTION_WRAPPER_ADDRESS=0x68A46ca88B6Fd446927b18CAE132ccb49e89d03A
```

**Also update `frontend/.env`:**
```env
VITE_TRANSACTION_WRAPPER_ADDRESS=0x68A46ca88B6Fd446927b18CAE132ccb49e89d03A
```

The frontend config has been updated with the new address as the default, but you should still set it in your `.env` file.

## How It Works Now

1. **User initiates transaction** (e.g., create space atom)
2. **Frontend estimates cost:**
   - Operation cost (e.g., atom creation fee)
   - Gas cost (estimated)
   - Fee = 30% of estimated gas
   - Total = operation + gas + fee
3. **User sends:** Total amount
4. **Contract executes:**
   - Uses operation cost for the operation
   - Calculates actual gas used
   - Takes 30% of actual gas as fee → sends to fee wallet
   - Refunds any excess to user

## Testing

After updating the environment variable, test by:
1. Creating a new space (should create atom through wrapper)
2. Check that fees are collected to: `0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07`
3. Verify excess funds are refunded

## Important Notes

- The old contract address is no longer valid
- All new transactions must use the new address
- The fee recipient address cannot be changed (immutable)
- Fee is calculated on **actual gas used**, not estimated

