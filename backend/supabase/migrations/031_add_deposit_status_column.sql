-- Add deposit_status column to quest_drafts table
-- This tracks the escrow deposit status for quest drafts

ALTER TABLE quest_drafts
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'approved', 'deposited'));

-- Create index for deposit status filtering
CREATE INDEX IF NOT EXISTS idx_quest_drafts_deposit_status ON quest_drafts(deposit_status);
