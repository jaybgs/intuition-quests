-- Simple migration to create just the quest_winners table
-- Run this first to isolate the table creation issue

CREATE TABLE IF NOT EXISTS quest_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  rank INTEGER, -- For ordered winners (1st, 2nd, etc.)
  reward_amount DECIMAL(18, 6) NOT NULL,
  reward_token TEXT NOT NULL,
  distributed BOOLEAN DEFAULT false,
  distributed_at TIMESTAMPTZ,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quest_id, wallet_address)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quest_winners_quest ON quest_winners(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_winners_wallet ON quest_winners(wallet_address);
CREATE INDEX IF NOT EXISTS idx_quest_winners_distributed ON quest_winners(distributed);

-- Enable RLS
ALTER TABLE quest_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "public_read_quest_winners" ON quest_winners FOR SELECT USING (true);
CREATE POLICY "service_role_manage_quest_winners" ON quest_winners FOR ALL USING (true);
