# Raffle Smart Contract

On-chain raffle system for Intuition Network.

## Contract Overview

The `Raffle.sol` contract provides a complete on-chain raffle system where:
- Users can enter raffles by paying shards
- Winners are picked using on-chain randomness
- All data is stored on-chain for transparency

## Features

- **Create Raffles**: Raid creators can set up raffles with entry fees and winner counts
- **Enter Raffles**: Users pay shards to enter
- **Pick Winners**: On-chain random selection when raffle ends
- **View Entries**: Public view of all entries and winners

## Deployment

### Prerequisites
- Hardhat or Foundry
- Node.js
- Intuition Network RPC access

### Using Hardhat

1. Install dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

2. Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    intuition: {
      url: "https://rpc.intuition.systems/http",
      chainId: 1155,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network intuition
```

## Contract Functions

### Public Functions

- `createRaffle(raidId, title, entryFee, numberOfWinners, endTime)` - Create a new raffle
- `enterRaffle(raidId)` - Enter a raffle (pays entry fee)
- `pickWinners(raidId)` - Pick winners (only creator, after end time)
- `getRaffleInfo(raidId)` - View raffle details
- `getEntries(raidId)` - Get all entries
- `hasEntered(raidId, entrant)` - Check if address entered
- `depositShards(amount)` - Deposit shards (for testing)
- `getShardBalance(user)` - Get shard balance

## Integration

See `frontend/src/utils/raffleContract.ts` for frontend integration code.


