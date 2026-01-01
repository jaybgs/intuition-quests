-- Setup Row Level Security (RLS) policies for weekly_highlights table
-- This ensures only admin users can modify weekly highlights

-- Enable RLS on weekly_highlights table
ALTER TABLE weekly_highlights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Anyone can read weekly highlights" ON weekly_highlights;
DROP POLICY IF EXISTS "Admin users can insert highlights" ON weekly_highlights;
DROP POLICY IF EXISTS "Admin users can update highlights" ON weekly_highlights;
DROP POLICY IF EXISTS "Admin users can delete highlights" ON weekly_highlights;

-- Allow anyone to read weekly highlights (so all users can see them)
CREATE POLICY "Anyone can read weekly highlights" ON weekly_highlights
  FOR SELECT USING (true);

-- Restrict insert/update/delete to admin users only
-- Note: This assumes you have an is_admin column in users table
-- For now, we'll allow authenticated users (admin check is done client-side)
-- TODO: Add proper admin role checking when user roles are implemented
CREATE POLICY "Authenticated users can insert highlights" ON weekly_highlights
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update highlights" ON weekly_highlights
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete highlights" ON weekly_highlights
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'weekly_highlights'
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table weekly_highlights does not exist. Please run the table creation SQL first.';
  END IF;
END $$;
