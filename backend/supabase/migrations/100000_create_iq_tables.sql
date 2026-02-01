-- Fix user_iq_balance table by dropping and recreating with correct schema
-- Run this BEFORE the backfill script

-- Drop the old table (if it exists with wrong schema)
DROP TABLE IF EXISTS user_iq_balance CASCADE;
DROP TABLE IF EXISTS iq_earnings_history CASCADE;

-- Create user_iq_balance with correct columns
CREATE TABLE user_iq_balance (
  wallet_address TEXT PRIMARY KEY,
  iq_balance INTEGER NOT NULL DEFAULT 0,
  total_iq_earned INTEGER NOT NULL DEFAULT 0,
  total_iq_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_iq_balance_balance ON user_iq_balance(iq_balance DESC);

-- Create iq_earnings_history
CREATE TABLE iq_earnings_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  quest_id TEXT,
  quest_title TEXT,
  iq_amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('quest_completion', 'bonus', 'penalty', 'spend')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_iq_earnings_history_wallet ON iq_earnings_history(wallet_address);
CREATE INDEX idx_iq_earnings_history_created ON iq_earnings_history(created_at DESC);

-- Verification
SELECT 'Tables recreated successfully' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_iq_balance' ORDER BY ordinal_position;
