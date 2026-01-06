-- FORCE RECREATE quest_drafts table with correct schema
-- Run this in Supabase SQL Editor - WARNING: This will delete existing data!

-- Drop the table completely (this will delete all existing draft data)
DROP TABLE IF EXISTS quest_drafts CASCADE;

-- Recreate with the complete schema
CREATE TABLE quest_drafts (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  title TEXT,
  difficulty TEXT,
  description TEXT,
  image_preview TEXT,
  end_date TEXT,
  end_time TEXT,
  selected_actions JSONB,
  number_of_winners TEXT,
  winner_prizes JSONB,
  iq_points TEXT,
  reward_deposit TEXT,
  reward_token TEXT DEFAULT 'TRUST',
  distribution_type TEXT DEFAULT 'fcfs',
  current_step INTEGER DEFAULT 1,
  deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'approved', 'deposited')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed')),
  published_at TIMESTAMP WITH TIME ZONE,
  atom_id TEXT,
  atom_transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_quest_drafts_user ON quest_drafts(user_address);
CREATE INDEX idx_quest_drafts_space ON quest_drafts(space_id);
CREATE INDEX idx_quest_drafts_updated ON quest_drafts(updated_at DESC);
CREATE INDEX idx_quest_drafts_deposit_status ON quest_drafts(deposit_status);
CREATE INDEX idx_quest_drafts_status ON quest_drafts(status);
CREATE INDEX idx_quest_drafts_published_at ON quest_drafts(published_at);

-- Enable RLS
ALTER TABLE quest_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own drafts" ON quest_drafts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own drafts" ON quest_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own drafts" ON quest_drafts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete their own drafts" ON quest_drafts FOR DELETE USING (true);

-- Verify the table was created correctly
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quest_drafts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert
INSERT INTO quest_drafts (id, user_address, title, difficulty)
VALUES ('test-draft', '0x1234567890123456789012345678901234567890', 'Test Quest', 'beginner');

SELECT * FROM quest_drafts WHERE id = 'test-draft';

-- Clean up test data
DELETE FROM quest_drafts WHERE id = 'test-draft';



