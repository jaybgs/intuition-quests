-- Create comprehensive IQ tracking tables for wallet-based system
-- Run this FIRST before the backfill script

-- 1. User IQ Balance table
CREATE TABLE IF NOT EXISTS user_iq_balance (
  wallet_address TEXT PRIMARY KEY,
  iq_balance INTEGER NOT NULL DEFAULT 0,
  total_iq_earned INTEGER NOT NULL DEFAULT 0,
  total_iq_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_iq_balance_balance ON user_iq_balance(iq_balance DESC);

-- 2. IQ Earnings History table
CREATE TABLE IF NOT EXISTS iq_earnings_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  quest_id TEXT,
  quest_title TEXT,
  iq_amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('quest_completion', 'bonus', 'penalty', 'spend')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iq_earnings_history_wallet ON iq_earnings_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_iq_earnings_history_created ON iq_earnings_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iq_earnings_history_quest ON iq_earnings_history(quest_id);

-- 3. Add columns to leaderboard (safe - checks if exists)
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS iq_balance INTEGER DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS quests_completed INTEGER DEFAULT 0;

-- 4. Create trigger
DROP TRIGGER IF EXISTS update_user_iq_balance_updated_at ON user_iq_balance;
CREATE TRIGGER update_user_iq_balance_updated_at 
  BEFORE UPDATE ON user_iq_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Add comments
COMMENT ON TABLE user_iq_balance IS 'Current IQ balance per wallet';
COMMENT ON TABLE iq_earnings_history IS 'IQ transaction history';

-- Verification
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('user_iq_balance', 'iq_earnings_history')
ORDER BY table_name;
