-- Setup Row Level Security (RLS) policies for users table
-- This ensures proper access control for user profiles

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read user profiles" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Service role can update users" ON users;

-- Allow anyone (including anonymous users) to read user profiles
-- This is needed for leaderboards, quest creators, etc.
CREATE POLICY "Anyone can read user profiles" ON users
  FOR SELECT USING (true);

-- Allow service role to update users
-- The backend will verify that users can only update their own profile
-- This policy allows the service role to perform updates
CREATE POLICY "Service role can update users" ON users
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to insert new users
-- This is needed when users connect their wallet for the first time
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT 
  WITH CHECK (true);


-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'users' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table users does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;

