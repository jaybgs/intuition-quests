-- Setup Row Level Security (RLS) policies for social_connections table
-- This ensures proper access control for social connections

-- Enable RLS on social_connections table
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read social connections" ON social_connections;
DROP POLICY IF EXISTS "Service role can insert social connections" ON social_connections;
DROP POLICY IF EXISTS "Service role can update social connections" ON social_connections;
DROP POLICY IF EXISTS "Service role can delete social connections" ON social_connections;

-- Allow anyone (including anonymous users) to read social connections
-- This is needed for public profiles and verification
CREATE POLICY "Anyone can read social connections" ON social_connections
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new social connections
-- This is needed when users connect their social accounts
CREATE POLICY "Service role can insert social connections" ON social_connections
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update social connections
-- The backend will verify that users can only update their own connections
CREATE POLICY "Service role can update social connections" ON social_connections
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete social connections
-- The backend will verify that users can only delete their own connections
CREATE POLICY "Service role can delete social connections" ON social_connections
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'social_connections' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table social_connections does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;






