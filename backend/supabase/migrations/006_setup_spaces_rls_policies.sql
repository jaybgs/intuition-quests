-- Setup Row Level Security (RLS) policies for spaces table
-- This ensures all users can see and interact with spaces created by any user

-- Enable RLS on spaces table
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read spaces" ON spaces;
DROP POLICY IF EXISTS "Anyone can insert spaces" ON spaces;
DROP POLICY IF EXISTS "Anyone can update spaces" ON spaces;
DROP POLICY IF EXISTS "Anyone can delete spaces" ON spaces;

-- Allow anyone (including anonymous users) to read all spaces
-- This is essential so spaces created by one user are visible to all other users
CREATE POLICY "Anyone can read spaces" ON spaces
  FOR SELECT USING (true);

-- Allow anyone to insert new spaces
CREATE POLICY "Anyone can insert spaces" ON spaces
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update spaces
CREATE POLICY "Anyone can update spaces" ON spaces
  FOR UPDATE USING (true);

-- Allow anyone to delete spaces (optional - you may want to restrict this)
CREATE POLICY "Anyone can delete spaces" ON spaces
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'spaces' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table spaces does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;










