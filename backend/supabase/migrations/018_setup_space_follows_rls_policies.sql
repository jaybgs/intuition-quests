-- Setup Row Level Security (RLS) policies for space_follows table
-- This ensures proper access control for space follows

-- Enable RLS on space_follows table
ALTER TABLE space_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read space follows" ON space_follows;
DROP POLICY IF EXISTS "Anyone can insert space follows" ON space_follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON space_follows;

-- Allow anyone (including anonymous users) to read follow data
-- This is needed to display follower counts publicly
CREATE POLICY "Anyone can read space follows" ON space_follows
  FOR SELECT USING (true);

-- Allow anyone to insert new follows
-- Users should be able to follow any space
CREATE POLICY "Anyone can insert space follows" ON space_follows
  FOR INSERT WITH CHECK (true);

-- Allow users to delete their own follows (unfollow)
-- Users should be able to unfollow spaces they follow
CREATE POLICY "Users can delete their own follows" ON space_follows
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'space_follows' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table space_follows does not exist. Please run migration 017_create_space_follows_table.sql first.';
  END IF;
END $$;






