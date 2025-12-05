# Transaction Wrapper Deployment Guide

This guide explains how to deploy and use the `TransactionWrapper` contract that collects a 30% fee on gas costs for all MultiVault transactions.

## Overview

The `TransactionWrapper` contract wraps all MultiVault operations and automatically collects a 30% fee on the actual gas costs. This fee is sent to a designated fee recipient address.

## Prerequisites

1. **Fee Recipient Address**: You need to provide a wallet address that will receive the 30% fees
2. **Deployer Account**: An account with TRUST tokens for deployment gas
3. **Environment Variables**: Set up your `.env` file

## Deployment Steps

### 1. Set Environment Variables

Create or update your `.env` file in the root directory:

```env
# Network Configuration
INTUITION_RPC_URL=https://rpc.intuition.systems/http
PRIVATE_KEY=your_deployer_private_key_here

# Fee Recipient Address (REQUIRED - Ask user for this)
FEE_RECIPIENT_ADDRESS=0x...

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Compile the Contract

```bash
npm run compile
```

### 3. Deploy to Intuition Mainnet

```bash
npm run deploy:wrapper
```

Or to testnet:

```bash
npm run deploy:wrapper:testnet
```

### 4. Save the Deployed Address

After deployment, the script will output the contract address. Save it to your `.env` file:

```env
VITE_TRANSACTION_WRAPPER_ADDRESS=0x...
```

Also add it to `frontend/.env`:

```env
VITE_TRANSACTION_WRAPPER_ADDRESS=0x...
```

## Contract Functions

### `createAtomsWithFee`
Creates atoms on MultiVault with automatic fee collection.

### `createTriplesWithFee`
Creates triples (claims) on MultiVault with automatic fee collection.

### `depositWithFee`
Deposits TRUST into a vault (atom or triple) with automatic fee collection. Used for quest completion staking.

### `depositBatchWithFee`
Batch deposits with automatic fee collection.

## Frontend Integration

The frontend service `transactionWrapperService.ts` provides helper functions:

- `createAtomsWithFee()` - Create atoms through wrapper
- `createTriplesWithFee()` - Create triples through wrapper
- `depositWithFee()` - Deposit/stake through wrapper
- `estimateTransactionCost()` - Estimate gas and fees before transaction

## Fee Calculation

The contract calculates fees as follows:

1. **Actual Gas Used**: Measures gas consumed during the transaction
2. **Gas Cost**: `gasUsed * gasPrice`
3. **Fee Amount**: `(gasCost * 30) / 100` (30% of gas cost)
4. **Total Cost**: `operationCost + gasCost + feeAmount`

The fee is automatically transferred to the `feeRecipient` address.

## Important Notes

- The fee recipient address is set in the constructor and **cannot be changed**
- All excess funds are automatically refunded to the user
- The contract includes an emergency withdrawal function (only accessible by fee recipient)
- Gas estimation should include a buffer (20-30%) to account for gas price fluctuations

## Security Considerations

1. **Audit**: Consider auditing the contract before mainnet deployment
2. **Fee Recipient**: Use a multisig wallet for the fee recipient address
3. **Testing**: Thoroughly test on testnet before mainnet deployment
4. **Monitoring**: Monitor the contract for any unexpected behavior

## Next Steps

1. **Get Fee Recipient Address**: Ask the user for the wallet address that should receive fees
2. **Deploy Contract**: Run the deployment script
3. **Update Frontend**: Add the contract address to environment variables
4. **Integrate**: Use the wrapper service in quest completion and other transactions

