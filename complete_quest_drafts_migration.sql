-- Complete quest_drafts table migration
-- Run this in Supabase SQL Editor to ensure all required columns exist

-- First, check if table exists and what columns it has
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quest_drafts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ensure the base table structure exists (from migration 019)
CREATE TABLE IF NOT EXISTS quest_drafts (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  title TEXT,
  difficulty TEXT,  -- This column is missing!
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns from later migrations
ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'approved', 'deposited'));

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed'));

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS atom_id TEXT;

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS atom_transaction_hash TEXT;

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_quest_drafts_user ON quest_drafts(user_address);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_space ON quest_drafts(space_id);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_updated ON quest_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_deposit_status ON quest_drafts(deposit_status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_status ON quest_drafts(status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_published_at ON quest_drafts(published_at);

-- Enable RLS
ALTER TABLE quest_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can insert their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON quest_drafts;

-- RLS Policies (allow all for now, as in the original migration)
CREATE POLICY "Users can read their own drafts" ON quest_drafts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own drafts" ON quest_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own drafts" ON quest_drafts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete their own drafts" ON quest_drafts FOR DELETE USING (true);

-- Final verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quest_drafts'
AND table_schema = 'public'
ORDER BY ordinal_position;



