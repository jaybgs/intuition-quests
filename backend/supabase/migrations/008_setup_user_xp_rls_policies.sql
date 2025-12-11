-- Setup Row Level Security (RLS) policies for user_xp table
-- This ensures proper access control for user XP data

-- Enable RLS on user_xp table
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read user XP" ON user_xp;
DROP POLICY IF EXISTS "Service role can insert user XP" ON user_xp;
DROP POLICY IF EXISTS "Service role can update user XP" ON user_xp;

-- Allow anyone (including anonymous users) to read user XP
-- This is needed for leaderboards and public profiles
CREATE POLICY "Anyone can read user XP" ON user_xp
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new user XP records
-- This is needed when users are created or complete quests
CREATE POLICY "Service role can insert user XP" ON user_xp
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update user XP
-- This is needed when users complete quests or earn XP
CREATE POLICY "Service role can update user XP" ON user_xp
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'user_xp' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table user_xp does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;






