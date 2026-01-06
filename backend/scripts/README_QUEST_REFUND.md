# Quest Deposit Refund Script

This script refunds quest deposits for quests that ended without any completions.

## Overview

The `refund-quest-deposits.ts` script automatically identifies and refunds deposits for quests that meet the following criteria:

1. **Have a deposit**: The quest has a reward deposit stored in the QuestEscrow contract
2. **No completions**: The quest has no completions recorded in the database
3. **Expired or inactive**: The quest has expired (past its end date) or is no longer active
4. **Not distributed**: The reward funds haven't been distributed yet

## How it works

1. **Database Query**: Queries Supabase for quests that have reward deposits but no completions
2. **Contract Verification**: Checks the QuestEscrow contract to verify each quest has an active deposit
3. **Eligibility Check**: Ensures only the quest creator can refund their own deposits
4. **Refund Execution**: Calls `refundDeposit()` on the QuestEscrow contract for each eligible quest

## Prerequisites

- Environment variables must be set:
  - `SUPABASE_URL`: Your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
  - `INTUITION_RPC_URL`: RPC URL for Intuition network (defaults to `https://rpc.intuition.systems/http`)
  - `PRIVATE_KEY`: Private key of the wallet authorized to execute refunds

## Usage

```bash
# From the backend directory
npm run refund:deposits

# Or run directly with tsx
npx tsx scripts/refund-quest-deposits.ts
```

## Safety Features

- **Dry Run**: The script first checks all quests without making any transactions
- **Eligibility Verification**: Double-checks that quests are eligible before refunding
- **Creator Validation**: Only allows quest creators to refund their own deposits
- **Contract Validation**: Verifies deposits exist in the smart contract before attempting refunds

## What Gets Refunded

- Only TRUST tokens deposited in the QuestEscrow contract
- Only refunds quests where no winners have been set
- Only refunds to the original quest creator

## Output

The script provides detailed logging:
- Lists all potentially eligible quests
- Shows contract deposit information for each quest
- Reports eligibility status for each quest
- Shows transaction hashes for successful refunds
- Reports any failures with error messages

## Important Notes

- **Irreversible**: Once executed, refunds cannot be undone
- **Network Fees**: Each refund transaction requires gas fees
- **Authorization**: The script wallet must be authorized to call refund functions
- **Testing**: Test on testnet first before running on mainnet

## Example Output

```
🔄 Starting quest deposit refund process...

📊 Querying database for eligible quests...
📋 Found 3 potentially eligible quests:

🔍 Checking quest: Build a DeFi App (quest_123)
   📊 Contract deposit: 10.0 TRUST
   📊 Distributed: 0.0 TRUST
   ✅ ELIGIBLE for refund

🎯 SUMMARY: 1 quests eligible for refund:
1. Build a DeFi App
   Quest ID: quest_123
   Deposit Amount: 10.0 TRUST

🚀 Starting refund process...
🔄 Refunding quest: Build a DeFi App (quest_123)
   ⏳ Transaction submitted: 0x...
   ✅ Refund successful!

🎉 Refund process completed!
```

## Contract Details

- **Contract Address**: `0xDaeb8F72678a723b273F7273c628Ad6d31cE3A4e`
- **Network**: Intuition Chain
- **Function**: `refundDeposit(string questId)` - can only be called by quest creator
