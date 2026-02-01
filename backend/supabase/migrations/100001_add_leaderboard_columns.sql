-- Step 2: Add IQ columns to leaderboard
-- Run this AFTER 100000_create_iq_tables.sql

ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS iq_balance INTEGER DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS quests_completed INTEGER DEFAULT 0;

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leaderboard' 
  AND column_name IN ('iq_balance', 'username', 'quests_completed')
ORDER BY column_name;
