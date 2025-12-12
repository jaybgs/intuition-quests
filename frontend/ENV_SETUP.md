# Environment Variables Setup

This document describes the environment variables needed to connect the smart contract to the Intuition Network.

## Required Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

### Smart Contract Configuration

```env
# RaidClaim Smart Contract Address (REQUIRED)
# Deploy the RaidClaim.sol contract to Intuition Network and set the address here
# Example: 0x1234567890123456789012345678901234567890
VITE_RAID_CLAIM_CONTRACT_ADDRESS=
```

**How to get this:**
1. Deploy the `RaidClaim.sol` contract to Intuition Network using Hardhat
2. Run: `npx hardhat run scripts/deploy.js --network intuition`
3. Copy the deployed contract address from the console output
4. Set it in your `.env` file

### Intuition Network Configuration

The Intuition Network configuration is **hardcoded** in `frontend/src/config/wagmi.ts`:
- **Chain ID:** 1155 (Intuition Mainnet)
- **RPC URL:** `https://rpc.intuition.systems/http`
- **WebSocket URL:** `wss://rpc.intuition.systems/ws`
- **Block Explorer:** `https://explorer.intuition.systems`

If you need to change these, edit `frontend/src/config/wagmi.ts`.

### Optional Environment Variables

```env
# WalletConnect Project ID (optional)
# Get your project ID from https://cloud.walletconnect.com
# If not provided, WalletConnect connector will not be available
VITE_WALLETCONNECT_PROJECT_ID=

# Backend API URL
# Development: http://localhost:3001/api
# Production: https://trust-quests.onrender.com/api
VITE_API_URL=https://trust-quests.onrender.com/api

# OAuth Client IDs (optional)
# Get these from the respective OAuth providers
# If not provided, OAuth will fall back to demo mode (prompt for username/email)

# Twitter/X OAuth
# 1. Go to https://developer.twitter.com/en/portal/dashboard
# 2. Create a new app or use an existing one
# 3. Go to "Keys and tokens" tab
# 4. Copy the "Client ID" (not the API Key)
# 5. Set callback URL: http://localhost:5173/oauth/twitter/callback (dev) or your production URL
VITE_TWITTER_CLIENT_ID=

# Discord OAuth
# 1. Go to https://discord.com/developers/applications
# 2. Create a new application or select an existing one
# 3. Go to "OAuth2" section
# 4. Copy the "Client ID"
# 5. Add redirect URI: http://localhost:5173/oauth/discord/callback (dev) or your production URL
VITE_DISCORD_CLIENT_ID=

# GitHub OAuth
# 1. Go to https://github.com/settings/developers
# 2. Click "New OAuth App"
# 3. Fill in application details
# 4. Set Authorization callback URL: http://localhost:5173/oauth/github/callback (dev) or your production URL
# 5. Copy the "Client ID"
VITE_GITHUB_CLIENT_ID=

# Google OAuth
# 1. Go to https://console.cloud.google.com/apis/credentials
# 2. Create a new OAuth 2.0 Client ID
# 3. Set application type to "Web application"
# 4. Add authorized redirect URI: http://localhost:5173/oauth/google/callback (dev) or your production URL
# 5. Copy the "Client ID"
VITE_GOOGLE_CLIENT_ID=

# Privy App ID (optional, if using Privy for authentication)
VITE_PRIVY_APP_ID=
```

## Deployment Steps

1. **Deploy the RaidClaim Contract:**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network intuition
   ```

2. **Copy the contract address** from the deployment output

3. **Create `.env` file** in the `frontend/` directory:
   ```bash
   cd frontend
   touch .env
   ```

4. **Add the contract address** to `.env`:
   ```env
   VITE_RAID_CLAIM_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

5. **Restart the dev server** for changes to take effect:
   ```bash
   npm run dev
   ```

## Hardhat Configuration

The Hardhat configuration is in `hardhat.config.js` at the root. Make sure it's configured for Intuition Network:

```javascript
module.exports = {
  solidity: "0.8.20",
  networks: {
    intuition: {
      url: "https://rpc.intuition.systems/http",
      chainId: 1155,
      accounts: [process.env.PRIVATE_KEY] // Your deployer private key
    }
  }
};
```

## Verification

After setting up the environment variables, verify the connection:

1. Check the browser console for: `✅ RaidClaim contract address: 0x...`
2. If you see: `⚠️ RaidClaim contract address not set`, the environment variable is missing or incorrect
3. The contract address should not be `0x0000000000000000000000000000000000000000`

## Troubleshooting

- **Contract address not found:** Make sure `VITE_RAID_CLAIM_CONTRACT_ADDRESS` is set in your `.env` file
- **Network errors:** Verify you're connected to Intuition Network (chain ID 1155) in your wallet
- **Transaction failures:** Ensure the contract is deployed and the address is correct
- **Environment variables not loading:** Restart the dev server after creating/updating `.env`


