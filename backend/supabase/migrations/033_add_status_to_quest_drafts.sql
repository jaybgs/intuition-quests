-- Add status tracking columns to quest_drafts table
-- This allows drafts to be marked as published instead of deleted

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed'));

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS atom_id TEXT;

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS atom_transaction_hash TEXT;

-- Create index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_quest_drafts_status ON quest_drafts(status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_published_at ON quest_drafts(published_at);