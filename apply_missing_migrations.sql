-- Apply missing migrations to quest_drafts table
-- Run this in Supabase SQL Editor

-- Add deposit_status column (from migration 031)
ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'approved', 'deposited'));

-- Add status tracking columns (from migration 033)
ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed'));

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS atom_id TEXT;

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS atom_transaction_hash TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quest_drafts_deposit_status ON quest_drafts(deposit_status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_status ON quest_drafts(status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_published_at ON quest_drafts(published_at);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quest_drafts'
AND table_schema = 'public'
ORDER BY ordinal_position;



