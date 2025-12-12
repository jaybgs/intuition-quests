-- Create space_follows table to track which spaces users follow
-- This allows users to follow spaces and see their follower counts

CREATE TABLE IF NOT EXISTS space_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, user_address)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_space_follows_space ON space_follows(space_id);
CREATE INDEX IF NOT EXISTS idx_space_follows_user ON space_follows(user_address);
CREATE INDEX IF NOT EXISTS idx_space_follows_created ON space_follows(created_at);

-- Verify the table was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'space_follows' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table space_follows was not created successfully';
  END IF;
END $$;










