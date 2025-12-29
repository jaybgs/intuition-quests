-- Create pro_users table for subscription management
CREATE TABLE IF NOT EXISTS pro_users (
  wallet_address TEXT PRIMARY KEY,
  payment_tx_hash TEXT NOT NULL,
  payment_amount TEXT NOT NULL, -- Amount paid in wei
  payment_timestamp TIMESTAMPTZ DEFAULT NOW(),
  plan_type TEXT DEFAULT 'pro',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ, -- NULL for lifetime access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pro_users
CREATE INDEX IF NOT EXISTS idx_pro_users_wallet ON pro_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pro_users_status ON pro_users(status);
CREATE INDEX IF NOT EXISTS idx_pro_users_payment_timestamp ON pro_users(payment_timestamp);
CREATE INDEX IF NOT EXISTS idx_pro_users_tx_hash ON pro_users(payment_tx_hash);

-- Enable RLS
ALTER TABLE pro_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Backend-only access (service role key only)
-- No direct frontend access to this table for security
CREATE POLICY "backend_only_pro_users" ON pro_users
  FOR ALL USING (false);

-- Function for updating pro_users timestamps
CREATE OR REPLACE FUNCTION update_pro_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pro_users_updated_at_trigger
  BEFORE UPDATE ON pro_users
  FOR EACH ROW EXECUTE FUNCTION update_pro_users_updated_at();
