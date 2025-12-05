# Reward Deposit & Payout System Design

## Current State
- Frontend collects: `rewardDeposit` (total amount), `rewardToken` (TRUST/USDT), `winnerPrizes` (array)
- Contract only tracks entries and picks winners
- **No reward deposits or payouts are handled**

## Proposed Solution: On-Chain Escrow System

### Option 1: Deposit During Raffle Creation (Recommended)
**Flow:**
1. Creator specifies rewards in frontend (e.g., 200 TRUST total, split as [100, 50, 50])
2. When creating raffle on-chain, creator deposits the reward tokens
3. Contract holds tokens in escrow
4. When winners are picked, contract automatically distributes rewards

**Pros:**
- Fully on-chain and trustless
- Automatic payout
- Creator can't back out after raffle starts
- Transparent and verifiable

**Cons:**
- Requires token approval + transfer (2 transactions or 1 if using permit)
- Creator must have tokens ready upfront

### Option 2: Separate Deposit Function
**Flow:**
1. Creator creates raffle (no deposit)
2. Creator calls separate `depositRewards()` function
3. Contract holds tokens in escrow
4. Winners get paid when picked

**Pros:**
- Can create raffle first, deposit later
- More flexible

**Cons:**
- Two-step process (creator might forget)
- Not as trustless (raffle can exist without funds)

### Option 3: Hybrid - Deposit Required Before Raffle Starts
**Flow:**
1. Creator creates raffle (raffle starts as "pending")
2. Creator must deposit rewards before raffle becomes active
3. Once deposited, raffle becomes active
4. Winners get paid automatically

**Pros:**
- Best of both worlds
- Ensures funds are locked before entries start

**Cons:**
- More complex state management

## Recommended Implementation: Option 1 (Deposit During Creation)

### Contract Changes Needed:

1. **Add to RaidRaffle struct:**
```solidity
struct RaidRaffle {
    // ... existing fields ...
    address rewardToken;           // TRUST or USDT contract address
    uint256 totalRewardAmount;    // Total deposited
    uint256[] winnerRewards;      // Reward amount per winner
    bool rewardsDeposited;        // Whether rewards are locked
}
```

2. **Update createRaffle function:**
```solidity
function createRaffle(
    string memory raidId,
    string memory title,
    uint256 entryFee,
    uint256 numberOfWinners,
    uint256 endTime,
    address rewardToken,           // NEW
    uint256 totalRewardAmount,     // NEW
    uint256[] memory winnerRewards // NEW
) external {
    // ... existing validation ...
    
    // Transfer reward tokens from creator to contract
    IERC20(rewardToken).transferFrom(
        msg.sender,
        address(this),
        totalRewardAmount
    );
    
    // Store reward info
    raffle.rewardToken = rewardToken;
    raffle.totalRewardAmount = totalRewardAmount;
    raffle.winnerRewards = winnerRewards;
    raffle.rewardsDeposited = true;
    
    // ... rest of function ...
}
```

3. **Update pickWinners to distribute rewards:**
```solidity
function pickWinners(string memory raidId) external {
    // ... existing winner picking logic ...
    
    // Distribute rewards to winners
    IERC20 token = IERC20(raffle.rewardToken);
    for (uint256 i = 0; i < raffle.winners.length; i++) {
        if (i < raffle.winnerRewards.length && raffle.winnerRewards[i] > 0) {
            token.transfer(raffle.winners[i], raffle.winnerRewards[i]);
        }
    }
    
    // ... rest of function ...
}
```

4. **Add refund function (if raffle cancelled):**
```solidity
function refundRewards(string memory raidId) external onlyCreator(raidId) {
    require(!raffle.winnersPicked, "Winners already picked");
    require(block.timestamp < raffle.endTime, "Raffle has ended");
    
    IERC20(raffle.rewardToken).transfer(
        raffle.creator,
        raffle.totalRewardAmount
    );
    
    raffle.rewardsDeposited = false;
}
```

### Frontend Changes Needed:

1. **Get token contract addresses:**
```typescript
const TRUST_TOKEN_ADDRESS = "0x..."; // Intuition TRUST token
const USDT_TOKEN_ADDRESS = "0x...";  // USDT on Intuition
```

2. **Approve tokens before creating raffle:**
```typescript
// Approve contract to spend tokens
await tokenContract.approve(
  RAFFLE_CONTRACT_ADDRESS,
  totalRewardAmount
);
```

3. **Update createRaffleOnChain call:**
```typescript
const hash = await createRaffleOnChain(
  walletClient,
  raidId,
  title,
  entryFee,
  numberOfWinners,
  endTime,
  rewardTokenAddress,      // NEW
  totalRewardAmount,        // NEW
  winnerRewards            // NEW
);
```

## Token Addresses Needed

You'll need the contract addresses for:
- **TRUST Token** on Intuition Network
- **USDT** on Intuition Network (if USDT is available)

## Security Considerations

1. **Reentrancy protection** - Use `nonReentrant` modifier
2. **Token approval checks** - Verify approval before transfer
3. **Amount validation** - Ensure winnerRewards sum equals totalRewardAmount
4. **Refund mechanism** - Allow creator to refund if raffle fails/cancels

## Alternative: Native TRUST (if TRUST is native token)

If TRUST is the native token (not ERC20), use `msg.value` instead:
```solidity
function createRaffle(...) external payable {
    require(msg.value == totalRewardAmount, "Incorrect deposit amount");
    // Store as native balance
}
```

Then distribute with:
```solidity
payable(winner).transfer(winnerRewards[i]);
```


