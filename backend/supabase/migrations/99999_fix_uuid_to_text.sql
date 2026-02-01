-- Fix user_quests and published_quests to use TEXT for IDs, not UUID
-- This script will check current types and fix if necessary

-- STEP 1: Check current column types
DO $$
DECLARE
    quest_id_type text;
    pub_quest_id_type text;
BEGIN
    -- Check user_quests.quest_id type
    SELECT data_type INTO quest_id_type
    FROM information_schema.columns
    WHERE table_name = 'user_quests'
    AND column_name = 'quest_id';

    -- Check published_quests.id type
    SELECT data_type INTO pub_quest_id_type
    FROM information_schema.columns
    WHERE table_name = 'published_quests'
    AND column_name = 'id';

    RAISE NOTICE 'user_quests.quest_id type: %', COALESCE(quest_id_type, 'column not found');
    RAISE NOTICE 'published_quests.id type: %', COALESCE(pub_quest_id_type, 'column not found');

    -- If user_quests.quest_id is UUID, we need to fix it
    IF quest_id_type = 'uuid' THEN
        RAISE NOTICE 'FIXING: user_quests.quest_id is UUID, changing to TEXT';
        
        -- Drop foreign key if it exists
        ALTER TABLE IF EXISTS user_quests DROP CONSTRAINT IF EXISTS user_quests_quest_id_fkey;
        
        -- Change column type to TEXT
        ALTER TABLE user_quests ALTER COLUMN quest_id TYPE TEXT USING quest_id::text;
        
        RAISE NOTICE 'SUCCESS: Changed user_quests.quest_id to TEXT';
    ELSE
        RAISE NOTICE 'OK: user_quests.quest_id is already TEXT';
    END IF;

    -- If published_quests.id is UUID, we need to fix it
    IF pub_quest_id_type = 'uuid' THEN
        RAISE NOTICE 'FIXING: published_quests.id is UUID, changing to TEXT';
        
        -- Change column type to TEXT
        ALTER TABLE published_quests ALTER COLUMN id TYPE TEXT USING id::text;
        
        RAISE NOTICE 'SUCCESS: Changed published_quests.id to TEXT';
    ELSE
        RAISE NOTICE 'OK: published_quests.id is already TEXT';
    END IF;

    -- Re-add foreign key constraint if it doesn't exist and both tables have TEXT
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_quests_quest_id_fkey'
        AND table_name = 'user_quests'
    ) THEN
        ALTER TABLE user_quests
        ADD CONSTRAINT user_quests_quest_id_fkey
        FOREIGN KEY (quest_id) REFERENCES published_quests(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: user_quests_quest_id_fkey';
    END IF;

END $$;
