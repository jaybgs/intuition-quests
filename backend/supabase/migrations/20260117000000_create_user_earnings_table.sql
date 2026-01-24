-- Create user earnings table to track TRUST token rewards earned by users
-- This table stores aggregated earnings data for display on the rewards page

CREATE TABLE IF NOT EXISTS user_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  total_trust_earned DECIMAL(18, 6) DEFAULT 0, -- Total TRUST tokens earned
  quest_rewards DECIMAL(18, 6) DEFAULT 0, -- TRUST earned from quest completions
  staking_rewards DECIMAL(18, 6) DEFAULT 0, -- TRUST earned from staking
  referral_rewards DECIMAL(18, 6) DEFAULT 0, -- TRUST earned from referrals
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_earnings_wallet ON user_earnings(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_earnings_updated ON user_earnings(last_updated);

-- Enable RLS
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only read their own earnings
CREATE POLICY "users_read_own_earnings" ON user_earnings
  FOR SELECT USING (wallet_address = current_setting('app.current_wallet_address', true));

-- Service role can do everything
CREATE POLICY "service_role_manage_earnings" ON user_earnings
  FOR ALL USING (true);

-- Function to update user earnings when they complete quests or earn rewards
CREATE OR REPLACE FUNCTION update_user_earnings(
  p_wallet_address TEXT,
  p_quest_rewards DECIMAL(18, 6) DEFAULT 0,
  p_staking_rewards DECIMAL(18, 6) DEFAULT 0,
  p_referral_rewards DECIMAL(18, 6) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_earnings (
    wallet_address,
    quest_rewards,
    staking_rewards,
    referral_rewards,
    total_trust_earned,
    last_updated
  ) VALUES (
    p_wallet_address,
    p_quest_rewards,
    p_staking_rewards,
    p_referral_rewards,
    p_quest_rewards + p_staking_rewards + p_referral_rewards,
    NOW()
  )
  ON CONFLICT (wallet_address) DO UPDATE SET
    quest_rewards = user_earnings.quest_rewards + EXCLUDED.quest_rewards,
    staking_rewards = user_earnings.staking_rewards + EXCLUDED.staking_rewards,
    referral_rewards = user_earnings.referral_rewards + EXCLUDED.referral_rewards,
    total_trust_earned = user_earnings.total_trust_earned + EXCLUDED.total_trust_earned,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user earnings for the rewards page
CREATE OR REPLACE FUNCTION get_user_earnings(p_wallet_address TEXT)
RETURNS TABLE (
  total_trust_earned DECIMAL(18, 6),
  quest_rewards DECIMAL(18, 6),
  staking_rewards DECIMAL(18, 6),
  referral_rewards DECIMAL(18, 6)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ue.total_trust_earned,
    ue.quest_rewards,
    ue.staking_rewards,
    ue.referral_rewards
  FROM user_earnings ue
  WHERE ue.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql;
