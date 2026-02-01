-- Quick fix: Update published_quests.completed_by for users who already claimed
-- STEP 1: First run 99998_add_completed_by_column.sql to ensure the column exists
-- STEP 2: Then run this script to populate the data

-- Update each quest's completed_by JSONB array based on user_quests
UPDATE published_quests pq
SET completed_by = (
  SELECT COALESCE(
    jsonb_agg(DISTINCT LOWER(uq.wallet_address)),
    '[]'::jsonb
  )
  FROM user_quests uq
  WHERE uq.quest_id = pq.id
)
WHERE EXISTS (
  SELECT 1 FROM user_quests uq WHERE uq.quest_id = pq.id
);

-- Verify the update
SELECT 
  pq.id,
  pq.title,
  COALESCE(jsonb_array_length(pq.completed_by), 0) as users_in_completed_by,
  COUNT(DISTINCT uq.wallet_address) as users_in_user_quests
FROM published_quests pq
LEFT JOIN user_quests uq ON uq.quest_id = pq.id
GROUP BY pq.id, pq.title, pq.completed_by
ORDER BY pq.title;
