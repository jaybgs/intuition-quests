-- Create wallet_socials table for linking social accounts to wallet addresses
CREATE TABLE IF NOT EXISTS wallet_socials (
  wallet_address TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord', 'github', 'twitter')),
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  provider_data JSONB,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (wallet_address, provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_socials_wallet ON wallet_socials(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_socials_provider ON wallet_socials(provider);
CREATE INDEX IF NOT EXISTS idx_wallet_socials_verified ON wallet_socials(verified_at);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_wallet_socials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_wallet_socials_updated_at_trigger
  BEFORE UPDATE ON wallet_socials
  FOR EACH ROW EXECUTE FUNCTION update_wallet_socials_updated_at();

-- RLS Policies (if using RLS)
ALTER TABLE wallet_socials ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own social connections
CREATE POLICY "Users can read their own social connections"
  ON wallet_socials FOR SELECT
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Allow service role to manage all connections
CREATE POLICY "Service role can manage social connections"
  ON wallet_socials FOR ALL
  USING (true);
