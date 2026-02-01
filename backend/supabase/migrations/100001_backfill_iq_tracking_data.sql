-- Backfill IQ tracking tables from existing user_quests data
-- Run this AFTER 100000_create_iq_tracking_tables.sql

-- 1. Populate user_iq_balance from user_quests
INSERT INTO user_iq_balance (wallet_address, iq_balance, total_iq_earned, total_iq_spent)
SELECT 
  wallet_address,
  COALESCE(SUM(iq_earned), 0) as iq_balance,
  COALESCE(SUM(iq_earned), 0) as total_iq_earned,
  0 as total_iq_spent
FROM user_quests
GROUP BY wallet_address
ON CONFLICT (wallet_address) 
DO UPDATE SET
  iq_balance = EXCLUDED.iq_balance,
  total_iq_earned = EXCLUDED.total_iq_earned,
  updated_at = NOW();

-- 2. Populate iq_earnings_history from user_quests
INSERT INTO iq_earnings_history (wallet_address, quest_id, quest_title, iq_amount, transaction_type, description, created_at)
SELECT 
  uq.wallet_address,
  uq.quest_id,
  COALESCE(pq.title, 'Unknown Quest') as quest_title,
  uq.iq_earned,
  'quest_completion' as transaction_type,
  'Quest completion reward' as description,
  COALESCE(uq.completed_at, NOW()) as created_at
FROM user_quests uq
LEFT JOIN published_quests pq ON pq.id = uq.quest_id
WHERE uq.iq_earned > 0
ON CONFLICT DO NOTHING;

-- 3. Update leaderboard with IQ balance and username
-- First, sync from user_iq_balance
UPDATE leaderboard l
SET 
  iq_balance = COALESCE(uib.iq_balance, 0),
  quests_completed = (
    SELECT COUNT(*) 
    FROM user_quests uq 
    WHERE LOWER(uq.wallet_address) = LOWER(l.address)
  ),
  updated_at = NOW()
FROM user_iq_balance uib
WHERE LOWER(l.address) = LOWER(uib.wallet_address);

-- Insert new entries for wallets not in leaderboard
INSERT INTO leaderboard (user_id, address, total_xp, rank, level, iq_balance, quests_completed, username)
SELECT 
  uuid_generate_v4() as user_id,
  uib.wallet_address as address,
  COALESCE(ux.total_xp, uib.iq_balance) as total_xp,
  0 as rank,
  CASE 
    WHEN COALESCE(ux.total_xp, uib.iq_balance) >= 1000 THEN 3
    WHEN COALESCE(ux.total_xp, uib.iq_balance) >= 500 THEN 2
    ELSE 1
  END as level,
  uib.iq_balance,
  (SELECT COUNT(*) FROM user_quests uq WHERE uq.wallet_address = uib.wallet_address) as quests_completed,
  NULL as username
FROM user_iq_balance uib
LEFT JOIN users u ON LOWER(u.address) = LOWER(uib.wallet_address)
LEFT JOIN user_xp ux ON ux.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM leaderboard l WHERE LOWER(l.address) = LOWER(uib.wallet_address)
);

-- 4. Update ranks based on total_xp
UPDATE leaderboard l
SET rank = subquery.new_rank
FROM (
  SELECT address, ROW_NUMBER() OVER (ORDER BY total_xp DESC, updated_at ASC) as new_rank
  FROM leaderboard
) AS subquery
WHERE l.address = subquery.address;

-- 5. Verification queries
SELECT 'user_iq_balance' as table_name, COUNT(*) as row_count FROM user_iq_balance
UNION ALL
SELECT 'iq_earnings_history' as table_name, COUNT(*) as row_count FROM iq_earnings_history
UNION ALL
SELECT 'leaderboard' as table_name, COUNT(*) as row_count FROM leaderboard;

-- Show sample data
SELECT * FROM user_iq_balance ORDER BY iq_balance DESC LIMIT 5;
SELECT * FROM iq_earnings_history ORDER BY created_at DESC LIMIT 5;
SELECT address, username, total_xp, iq_balance, quests_completed, rank FROM leaderboard ORDER BY rank LIMIT 10;
