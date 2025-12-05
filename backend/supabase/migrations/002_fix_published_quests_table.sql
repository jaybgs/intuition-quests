-- Fix published_quests table if it was created without creator_address column
-- Run this if you got the "column creator_address does not exist" error

-- Check if table exists and add missing column if needed
DO $$
BEGIN
  -- Add creator_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'published_quests' AND column_name = 'creator_address'
  ) THEN
    ALTER TABLE published_quests ADD COLUMN creator_address TEXT;
  END IF;
END $$;

-- Create index on creator_address if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_published_quests_creator ON published_quests(creator_address);
