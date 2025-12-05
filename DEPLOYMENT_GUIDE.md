# Smart Contract Deployment Guide

This guide will help you deploy the Raffle contract to Intuition Mainnet so your on-chain transactions work.

## Prerequisites

1. **Wallet with TRUST tokens** - You need TRUST tokens to pay for gas fees
2. **Private Key** - The private key of the wallet that will deploy the contract
3. **Node.js and npm** - Already installed if you're running the project

## Step 1: Set Up Environment Variables

Create a `.env` file in the **root directory** (same level as `hardhat.config.js`):

```env
# Your wallet's private key (keep this secret!)
# Format: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
PRIVATE_KEY=your_private_key_here

# Optional: Custom RPC URL (defaults to mainnet)
# INTUITION_RPC_URL=https://rpc.intuition.systems/http
```

**⚠️ SECURITY WARNING:**
- Never commit your `.env` file to git
- Never share your private key
- Make sure `.env` is in `.gitignore`

## Step 2: Install Dependencies (if not already done)

```bash
npm install
```

## Step 3: Compile the Contract

```bash
npx hardhat compile
```

This will compile the `Raffle.sol` contract and check for errors.

## Step 4: Deploy to Intuition Mainnet

```bash
npx hardhat run scripts/deploy.js --network intuition
```

Or use the npm script:
```bash
npm run deploy
```

## Step 5: Copy the Contract Address

After deployment, you'll see output like:
```
Raffle contract deployed to: 0x1234567890123456789012345678901234567890
Network: intuition
Chain ID: 1155
```

**Copy this address!** You'll need it for the next step.

## Step 6: Update Frontend Environment

Create or update `frontend/.env`:

```env
# Paste the deployed contract address here
VITE_RAFFLE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

Replace `0x1234567890123456789012345678901234567890` with your actual deployed address.

## Step 7: Restart Frontend Dev Server

```bash
cd frontend
npm run dev
```

## Verification

1. **Check browser console** - You should see:
   ```
   ✅ Raffle contract address: 0x...
   ```

2. **Test creating a raid** - Try creating and publishing a raid. The on-chain transaction should work.

3. **Check Intuition Explorer** - Visit `https://explorer.intuition.systems` and search for your contract address to verify it's deployed.

## Troubleshooting

### Error: "insufficient funds"
- Make sure your wallet has TRUST tokens for gas fees
- Check your balance on Intuition Explorer

### Error: "nonce too high"
- Wait a few seconds and try again
- Or manually set a higher nonce in Hardhat config

### Error: "network not found"
- Make sure you're using `--network intuition` (not `intuitionTestnet`)
- Check that `hardhat.config.js` has the correct network configuration

### Contract address not working in frontend
- Make sure you created `frontend/.env` (not just root `.env`)
- Restart the dev server after updating `.env`
- Check that the address starts with `0x` and is 42 characters long

## Deploying to Testnet (Optional)

If you want to test on testnet first:

```bash
npx hardhat run scripts/deploy.js --network intuitionTestnet
```

Then update `frontend/.env` with the testnet contract address.

## Next Steps

After successful deployment:
1. ✅ Contract is deployed on-chain
2. ✅ Frontend can interact with the contract
3. ✅ Users can enter raffles
4. ✅ Winners can be picked automatically

Your on-chain transactions should now work! 🎉


