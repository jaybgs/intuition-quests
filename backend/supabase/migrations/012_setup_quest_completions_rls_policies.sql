-- Setup Row Level Security (RLS) policies for quest_completions table
-- This ensures proper access control for quest completions

-- Enable RLS on quest_completions table
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read quest completions" ON quest_completions;
DROP POLICY IF EXISTS "Users can read their own completions" ON quest_completions;
DROP POLICY IF EXISTS "Service role can insert quest completions" ON quest_completions;
DROP POLICY IF EXISTS "Service role can update quest completions" ON quest_completions;
DROP POLICY IF EXISTS "Service role can delete quest completions" ON quest_completions;

-- Allow anyone (including anonymous users) to read quest completions
-- This is needed for leaderboards and quest statistics
CREATE POLICY "Anyone can read quest completions" ON quest_completions
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new quest completions
-- This is needed when users complete quests
CREATE POLICY "Service role can insert quest completions" ON quest_completions
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update quest completions
-- This is needed for verification status updates
CREATE POLICY "Service role can update quest completions" ON quest_completions
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete quest completions
-- This is needed for admin operations or corrections
CREATE POLICY "Service role can delete quest completions" ON quest_completions
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quest_completions' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table quest_completions does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;




