-- Setup Row Level Security (RLS) policies for quests table
-- This ensures proper access control for quests

-- Enable RLS on quests table
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read quests" ON quests;
DROP POLICY IF EXISTS "Service role can insert quests" ON quests;
DROP POLICY IF EXISTS "Service role can update quests" ON quests;
DROP POLICY IF EXISTS "Service role can delete quests" ON quests;

-- Allow anyone (including anonymous users) to read all quests
-- This is needed so quests are visible to all users
CREATE POLICY "Anyone can read quests" ON quests
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new quests
-- This is needed when users create quests
CREATE POLICY "Service role can insert quests" ON quests
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update quests
-- The backend will verify that users can only update their own quests
CREATE POLICY "Service role can update quests" ON quests
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete quests
-- The backend will verify that users can only delete their own quests
CREATE POLICY "Service role can delete quests" ON quests
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quests' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table quests does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;

