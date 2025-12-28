-- Create wallet-centric tables for the new architecture
-- This replaces the old user-centric approach with wallet-first design

-- User quests table (replaces any old quest completion tracking)
CREATE TABLE IF NOT EXISTS user_quests (
  wallet_address TEXT NOT NULL,
  quest_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (wallet_address, quest_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_quests_wallet ON user_quests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_quests_quest ON user_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_completed ON user_quests(completed_at);

-- Wallet socials table (you already have this, but let's ensure it exists)
CREATE TABLE IF NOT EXISTS wallet_socials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('twitter', 'discord', 'github', 'google')),
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  provider_data JSONB,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, provider)
);

-- Indexes for wallet_socials
CREATE INDEX IF NOT EXISTS idx_wallet_socials_wallet ON wallet_socials(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_socials_provider ON wallet_socials(provider);
CREATE INDEX IF NOT EXISTS idx_wallet_socials_verified ON wallet_socials(verified_at);

-- Enable RLS on both tables
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_socials ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Backend-only access (service role key only)
-- No direct frontend access to these tables

CREATE POLICY "backend_only_user_quests" ON user_quests
  FOR ALL USING (false);

CREATE POLICY "backend_only_wallet_socials" ON wallet_socials
  FOR ALL USING (false);

-- Optional: Read-only public access for frontend (if needed later)
-- Uncomment if you want frontend to read quest completions
-- CREATE POLICY "public_read_user_quests" ON user_quests
--   FOR SELECT USING (true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_wallet_socials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallet_socials_updated_at_trigger
  BEFORE UPDATE ON wallet_socials
  FOR EACH ROW EXECUTE FUNCTION update_wallet_socials_updated_at();
