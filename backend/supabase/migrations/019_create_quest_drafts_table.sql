-- Create quest_drafts table to store quest drafts in the database
-- This allows quest drafts to be synced across devices

CREATE TABLE IF NOT EXISTS quest_drafts (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  title TEXT,
  difficulty TEXT,
  description TEXT,
  image_preview TEXT, -- Base64 encoded image
  end_date TEXT,
  end_time TEXT,
  selected_actions JSONB, -- Array of action objects
  number_of_winners TEXT,
  winner_prizes JSONB, -- Array of prize amounts
  iq_points TEXT,
  reward_deposit TEXT,
  reward_token TEXT DEFAULT 'TRUST',
  distribution_type TEXT DEFAULT 'fcfs',
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_quest_drafts_user ON quest_drafts(user_address);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_space ON quest_drafts(space_id);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_updated ON quest_drafts(updated_at DESC);

-- Verify the table was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'quest_drafts' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table quest_drafts was not created successfully';
  END IF;
END $$;

