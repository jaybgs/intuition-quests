-- Migration: Backfill published_quests.completed_by from user_quests
-- This fixes missing completion data for users who completed quests before the fix

-- Step 1: Create a temporary function to update completed_by arrays
CREATE OR REPLACE FUNCTION backfill_completed_by()
RETURNS void AS $$
DECLARE
  quest_record RECORD;
  user_record RECORD;
  current_completed_by TEXT[];
  updated_completed_by TEXT[];
BEGIN
  -- Loop through each quest
  FOR quest_record IN 
    SELECT id, completed_by FROM published_quests
  LOOP
    -- Get current completed_by array (handle NULL case)
    current_completed_by := COALESCE(quest_record.completed_by, ARRAY[]::TEXT[]);
    updated_completed_by := current_completed_by;
    
    -- Find all users who completed this quest from user_quests
    FOR user_record IN
      SELECT DISTINCT LOWER(wallet_address) as wallet
      FROM user_quests
      WHERE quest_id = quest_record.id
    LOOP
      -- Add wallet to array if not already present
      IF NOT (user_record.wallet = ANY(updated_completed_by)) THEN
        updated_completed_by := array_append(updated_completed_by, user_record.wallet);
        RAISE NOTICE 'Adding % to quest %', user_record.wallet, quest_record.id;
      END IF;
    END LOOP;
    
    -- Update the quest if the array changed
    IF array_length(updated_completed_by, 1) != array_length(current_completed_by, 1) OR
       updated_completed_by IS DISTINCT FROM current_completed_by THEN
      UPDATE published_quests
      SET completed_by = updated_completed_by
      WHERE id = quest_record.id;
      
      RAISE NOTICE 'Updated quest % completed_by: % -> %', 
        quest_record.id, 
        array_length(current_completed_by, 1), 
        array_length(updated_completed_by, 1);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete!';
END;
$$ LANGUAGE plpgsql;

-- Step 2: Run the backfill function
SELECT backfill_completed_by();

-- Step 3: Drop the temporary function
DROP FUNCTION backfill_completed_by();

-- Step 4: Verify the results
SELECT 
  pq.id as quest_id,
  pq.title,
  COALESCE(array_length(pq.completed_by, 1), 0) as completed_by_count,
  COUNT(DISTINCT uq.wallet_address) as user_quests_count
FROM published_quests pq
LEFT JOIN user_quests uq ON uq.quest_id = pq.id
GROUP BY pq.id, pq.title, pq.completed_by
HAVING COALESCE(array_length(pq.completed_by, 1), 0) != COUNT(DISTINCT uq.wallet_address)
ORDER BY pq.title;

-- If the query above returns any rows, there's still a mismatch
-- Run this to see the details:
-- SELECT * FROM published_quests WHERE id IN (SELECT id FROM <query_above>);
