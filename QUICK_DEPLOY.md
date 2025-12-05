# Quick Deployment Steps

## 1. Create Root `.env` File

In the **root directory** (where `hardhat.config.js` is), create `.env`:

```env
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

**Example:**
```env
PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## 2. Deploy the Contract

```bash
npx hardhat run scripts/deploy.js --network intuition
```

**Output will show:**
```
Raffle contract deployed to: 0x...
```

## 3. Create Frontend `.env` File

In the `frontend/` directory, create `.env`:

```env
VITE_RAFFLE_CONTRACT_ADDRESS=0xYourDeployedAddressHere
```

## 4. Restart Frontend

```bash
cd frontend
npm run dev
```

## Done! ✅

Your on-chain transactions should now work.

---

**Full guide:** See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.


