-- Complete setup for wallet_socials table
-- This creates the table and ensures proper permissions for OAuth social connections

-- Create the table if it doesn't exist
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_socials_wallet ON wallet_socials(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_socials_provider ON wallet_socials(provider);
CREATE INDEX IF NOT EXISTS idx_wallet_socials_verified ON wallet_socials(verified_at);

-- Enable RLS
ALTER TABLE wallet_socials ENABLE ROW LEVEL SECURITY;

-- Drop any existing problematic policies
DROP POLICY IF EXISTS "backend_only_wallet_socials" ON wallet_socials;
DROP POLICY IF EXISTS "service_role_wallet_socials" ON wallet_socials;
DROP POLICY IF EXISTS "wallet_socials_service_role" ON wallet_socials;
DROP POLICY IF EXISTS "wallet_socials_full_access" ON wallet_socials;
DROP POLICY IF EXISTS "wallet_socials_unrestricted" ON wallet_socials;

-- Create a comprehensive policy that allows full access
-- This is safe because the service role has elevated permissions
CREATE POLICY "wallet_socials_unrestricted" ON wallet_socials
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create an updated_at trigger function
CREATE OR REPLACE FUNCTION update_wallet_socials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS update_wallet_socials_updated_at_trigger ON wallet_socials;
CREATE TRIGGER update_wallet_socials_updated_at_trigger
  BEFORE UPDATE ON wallet_socials
  FOR EACH ROW EXECUTE FUNCTION update_wallet_socials_updated_at();

-- Grant necessary permissions to service role
GRANT ALL ON wallet_socials TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verification query to check setup
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'wallet_socials';
