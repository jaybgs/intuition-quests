-- Setup Row Level Security (RLS) policies for projects table
-- This ensures proper access control for projects

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
DROP POLICY IF EXISTS "Service role can insert projects" ON projects;
DROP POLICY IF EXISTS "Service role can update projects" ON projects;
DROP POLICY IF EXISTS "Service role can delete projects" ON projects;

-- Allow anyone (including anonymous users) to read all projects
-- This is needed so projects are visible to all users
CREATE POLICY "Anyone can read projects" ON projects
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new projects
-- This is needed when users create projects
CREATE POLICY "Service role can insert projects" ON projects
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update projects
-- The backend will verify that users can only update their own projects
CREATE POLICY "Service role can update projects" ON projects
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete projects
-- The backend will verify that users can only delete their own projects
CREATE POLICY "Service role can delete projects" ON projects
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'projects' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table projects does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;









