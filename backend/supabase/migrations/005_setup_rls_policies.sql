-- Setup Row Level Security (RLS) policies for published_quests table
-- This ensures all users can see and interact with quests created by any user

-- Enable RLS on published_quests table
ALTER TABLE published_quests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read published quests" ON published_quests;
DROP POLICY IF EXISTS "Anyone can insert quests" ON published_quests;
DROP POLICY IF EXISTS "Anyone can update quests" ON published_quests;
DROP POLICY IF EXISTS "Anyone can delete quests" ON published_quests;

-- Allow anyone (including anonymous users) to read all published quests
-- This is essential so quests created by one user are visible to all other users
CREATE POLICY "Anyone can read published quests" ON published_quests
  FOR SELECT USING (true);

-- Allow anyone to insert new quests
CREATE POLICY "Anyone can insert quests" ON published_quests
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update quests
CREATE POLICY "Anyone can update quests" ON published_quests
  FOR UPDATE USING (true);

-- Allow anyone to delete quests (optional - you may want to restrict this)
CREATE POLICY "Anyone can delete quests" ON published_quests
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'published_quests' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table published_quests does not exist. Please run migration 002_create_published_quests_table.sql first.';
  END IF;
END $$;

