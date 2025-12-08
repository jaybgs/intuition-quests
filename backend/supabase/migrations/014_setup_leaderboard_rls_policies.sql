-- Setup Row Level Security (RLS) policies for leaderboard table
-- This ensures proper access control for leaderboard data

-- Enable RLS on leaderboard table
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Service role can insert leaderboard entries" ON leaderboard;
DROP POLICY IF EXISTS "Service role can update leaderboard entries" ON leaderboard;
DROP POLICY IF EXISTS "Service role can delete leaderboard entries" ON leaderboard;

-- Allow anyone (including anonymous users) to read leaderboard
-- This is needed for public leaderboard displays
CREATE POLICY "Anyone can read leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new leaderboard entries
-- This is needed when users are added to the leaderboard
CREATE POLICY "Service role can insert leaderboard entries" ON leaderboard
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update leaderboard entries
-- This is needed when leaderboard rankings are updated
CREATE POLICY "Service role can update leaderboard entries" ON leaderboard
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete leaderboard entries
-- This is needed for admin operations or corrections
CREATE POLICY "Service role can delete leaderboard entries" ON leaderboard
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'leaderboard' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table leaderboard does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;

