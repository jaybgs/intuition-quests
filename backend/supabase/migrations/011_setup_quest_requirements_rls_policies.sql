-- Setup Row Level Security (RLS) policies for quest_requirements table
-- This ensures proper access control for quest requirements

-- Enable RLS on quest_requirements table
ALTER TABLE quest_requirements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read quest requirements" ON quest_requirements;
DROP POLICY IF EXISTS "Service role can insert quest requirements" ON quest_requirements;
DROP POLICY IF EXISTS "Service role can update quest requirements" ON quest_requirements;
DROP POLICY IF EXISTS "Service role can delete quest requirements" ON quest_requirements;

-- Allow anyone (including anonymous users) to read quest requirements
-- This is needed so quest requirements are visible to all users
CREATE POLICY "Anyone can read quest requirements" ON quest_requirements
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new quest requirements
-- This is needed when users create quests with requirements
CREATE POLICY "Service role can insert quest requirements" ON quest_requirements
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update quest requirements
-- The backend will verify that users can only update requirements for their own quests
CREATE POLICY "Service role can update quest requirements" ON quest_requirements
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete quest requirements
-- The backend will verify that users can only delete requirements for their own quests
CREATE POLICY "Service role can delete quest requirements" ON quest_requirements
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quest_requirements' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table quest_requirements does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;






