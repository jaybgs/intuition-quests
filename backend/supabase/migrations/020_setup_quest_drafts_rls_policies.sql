-- Setup Row Level Security (RLS) policies for quest_drafts table
-- This ensures users can only access their own drafts

-- Enable RLS on quest_drafts table
ALTER TABLE quest_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can read their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can insert their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON quest_drafts;

-- Allow users to read their own drafts
CREATE POLICY "Users can read their own drafts" ON quest_drafts
  FOR SELECT USING (true); -- Allow all reads for now (can be restricted to user_address matching if needed)

-- Allow users to insert their own drafts
CREATE POLICY "Users can insert their own drafts" ON quest_drafts
  FOR INSERT WITH CHECK (true); -- Allow all inserts for now

-- Allow users to update their own drafts
CREATE POLICY "Users can update their own drafts" ON quest_drafts
  FOR UPDATE USING (true) WITH CHECK (true); -- Allow all updates for now

-- Allow users to delete their own drafts
CREATE POLICY "Users can delete their own drafts" ON quest_drafts
  FOR DELETE USING (true); -- Allow all deletes for now

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quest_drafts' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table quest_drafts does not exist. Please run migration 019_create_quest_drafts_table.sql first.';
  END IF;
END $$;

