# Deploy CreateSpace Contract

## Quick Deploy

Make sure you're in the **root directory** of the project (where `package.json` and `hardhat.config.js` are located), then run:

```bash
npm run deploy:create-space
```

Or for testnet:

```bash
npm run deploy:create-space:testnet
```

## Requirements

1. **Environment Variables** (in root `.env` file):
   ```env
   PRIVATE_KEY=your_private_key_here
   MULTIVAULT_ADDRESS=0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e  # Optional: uses default if not set
   REVENUE_WALLET_ADDRESS=0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07  # Optional: uses default if not set
   ```

2. **Network Configuration**: Make sure your `hardhat.config.js` has the network configured correctly.

## Common Error: "Missing script: deploy:create-space"

This error occurs when you try to run the command from the wrong directory. 

**Solution:** Make sure you're in the root directory (`C:\intuition quests`), not in `frontend/` or `backend/` subdirectories.

## After Deployment

The deployment will:
1. Deploy the CreateSpace contract
2. Save deployment info to `deployment-create-space.json`
3. Display the contract address

Add the contract address to `frontend/.env`:
```env
VITE_CREATE_SPACE_ADDRESS=0xYourDeployedAddressHere
```

## Direct Hardhat Command

Alternatively, you can run the script directly with Hardhat:

```bash
npx hardhat run scripts/deploy-create-space.js --network intuition
```

