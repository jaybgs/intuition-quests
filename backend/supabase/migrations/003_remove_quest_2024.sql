-- Remove "My Quest 2024" quest from the database
-- This migration deletes the quest from both published_quests and quests tables

-- Delete from published_quests table
DELETE FROM published_quests
WHERE title ILIKE '%My Quest 2024%';

-- Delete from quests table (this will cascade delete requirements and completions)
DELETE FROM quests
WHERE title ILIKE '%My Quest 2024%';

-- Verify deletion
DO $$
DECLARE
    published_count INTEGER;
    quests_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO published_count
    FROM published_quests
    WHERE title ILIKE '%My Quest 2024%';
    
    SELECT COUNT(*) INTO quests_count
    FROM quests
    WHERE title ILIKE '%My Quest 2024%';
    
    IF published_count = 0 AND quests_count = 0 THEN
        RAISE NOTICE '✅ Successfully removed "My Quest 2024" from all tables';
    ELSE
        RAISE WARNING '⚠️  Found % quest(s) in published_quests and % quest(s) in quests table', published_count, quests_count;
    END IF;
END $$;

