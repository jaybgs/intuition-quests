-- Create quest_winners table first (isolated from other changes)
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

-- Add foreign key constraint (after table creation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'quest_winners_quest_id_fkey'
                   AND table_name = 'quest_winners') THEN
        ALTER TABLE quest_winners ADD CONSTRAINT quest_winners_quest_id_fkey
          FOREIGN KEY (quest_id) REFERENCES published_quests(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add quest status values for reward distribution workflow
-- Update published_quests status constraint to include new statuses

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_name = 'published_quests_status_check'
               AND table_name = 'published_quests') THEN
        ALTER TABLE published_quests DROP CONSTRAINT published_quests_status_check;
    END IF;
END $$;

-- Add updated constraint with new statuses
ALTER TABLE published_quests ADD CONSTRAINT published_quests_status_check
  CHECK (status IN ('active', 'completed', 'expired', 'distributing_rewards', 'rewards_distributed'));

-- Add columns to track reward distribution (using IF NOT EXISTS syntax for safety)
ALTER TABLE published_quests ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'trust_and_iq' CHECK (reward_type IN ('iq_only', 'trust_only', 'trust_and_iq'));
ALTER TABLE published_quests ADD COLUMN IF NOT EXISTS winners_selected JSONB DEFAULT '[]';
ALTER TABLE published_quests ADD COLUMN IF NOT EXISTS reward_distribution_tx_hash TEXT;
ALTER TABLE published_quests ADD COLUMN IF NOT EXISTS rewards_distributed_at TIMESTAMPTZ;

-- Create indexes after table creation
CREATE INDEX IF NOT EXISTS idx_quest_winners_quest ON quest_winners(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_winners_wallet ON quest_winners(wallet_address);
CREATE INDEX IF NOT EXISTS idx_quest_winners_distributed ON quest_winners(distributed);

-- Enable RLS after table creation
ALTER TABLE quest_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (drop if exists first)
DROP POLICY IF EXISTS "public_read_quest_winners" ON quest_winners;
DROP POLICY IF EXISTS "service_role_manage_quest_winners" ON quest_winners;

CREATE POLICY "public_read_quest_winners" ON quest_winners FOR SELECT USING (true);
CREATE POLICY "service_role_manage_quest_winners" ON quest_winners FOR ALL USING (true);

-- Function to select winners and distribute rewards
CREATE OR REPLACE FUNCTION select_quest_winners(p_quest_id TEXT)
RETURNS VOID AS $$
DECLARE
  quest_record RECORD;
  completer_record RECORD;
  winner_count INTEGER := 0;
  total_reward DECIMAL(18, 6) := 0;
  reward_per_winner DECIMAL(18, 6) := 0;
  selected_winners TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get quest details
  SELECT * INTO quest_record
  FROM published_quests
  WHERE id = p_quest_id AND status = 'expired';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or not expired';
  END IF;

  -- Check if rewards already distributed
  IF quest_record.status = 'rewards_distributed' THEN
    RAISE EXCEPTION 'Rewards already distributed for this quest';
  END IF;

  -- Get total reward amount
  IF quest_record.reward_token = 'TRUST' AND quest_record.reward_deposit IS NOT NULL THEN
    total_reward := quest_record.reward_deposit::DECIMAL(18, 6);
  ELSE
    RAISE EXCEPTION 'No TRUST rewards configured for this quest';
  END IF;

  -- Update quest status to distributing
  UPDATE published_quests
  SET status = 'distributing_rewards', updated_at = NOW()
  WHERE id = p_quest_id;

  -- Handle different distribution types
  IF quest_record.distribution_type = 'fcfs' THEN
    -- First Come First Served: All completers get equal share
    SELECT COUNT(*) INTO winner_count
    FROM user_quests
    WHERE quest_id = p_quest_id;

    IF winner_count > 0 THEN
      reward_per_winner := total_reward / winner_count;

      -- Insert all completers as winners
      INSERT INTO quest_winners (quest_id, wallet_address, rank, reward_amount, reward_token)
      SELECT
        p_quest_id,
        wallet_address,
        ROW_NUMBER() OVER (ORDER BY completed_at),
        reward_per_winner,
        'TRUST'
      FROM user_quests
      WHERE quest_id = p_quest_id;
    END IF;

  ELSIF quest_record.distribution_type = 'raffle' THEN
    -- Raffle: Random selection of winners
    winner_count := COALESCE(quest_record.number_of_winners, 1);

    IF winner_count > 0 THEN
      reward_per_winner := total_reward / winner_count;

      -- Randomly select winners from completers
      INSERT INTO quest_winners (quest_id, wallet_address, rank, reward_amount, reward_token)
      SELECT
        p_quest_id,
        wallet_address,
        ROW_NUMBER() OVER (ORDER BY RANDOM()),
        reward_per_winner,
        'TRUST'
      FROM user_quests
      WHERE quest_id = p_quest_id
      ORDER BY RANDOM()
      LIMIT winner_count;
    END IF;
  END IF;

  -- Update quest with selected winners
  SELECT array_agg(wallet_address) INTO selected_winners
  FROM quest_winners
  WHERE quest_id = p_quest_id;

  UPDATE published_quests
  SET winners_selected = selected_winners, updated_at = NOW()
  WHERE id = p_quest_id;

END;
$$ LANGUAGE plpgsql;

-- Function to mark rewards as distributed and update earnings
CREATE OR REPLACE FUNCTION distribute_quest_rewards(p_quest_id TEXT, p_tx_hash TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  winner_record RECORD;
BEGIN
  -- Update all winners as distributed
  UPDATE quest_winners
  SET distributed = true, distributed_at = NOW(), tx_hash = p_tx_hash
  WHERE quest_id = p_quest_id AND distributed = false;

  -- Update user earnings and user_quests.trust_earned for each winner
  FOR winner_record IN
    SELECT wallet_address, reward_amount
    FROM quest_winners
    WHERE quest_id = p_quest_id AND distributed = true
  LOOP
    -- Update user earnings (quest rewards)
    PERFORM update_user_earnings(
      winner_record.wallet_address,
      winner_record.reward_amount,
      0, -- staking rewards
      0  -- referral rewards
    );

    -- Update trust_earned in user_quests table for this specific quest completion
    UPDATE user_quests
    SET trust_earned = winner_record.reward_amount
    WHERE wallet_address = winner_record.wallet_address
      AND quest_id = p_quest_id;
  END LOOP;

  -- Mark quest as rewards distributed
  UPDATE published_quests
  SET
    status = 'rewards_distributed',
    rewards_distributed_at = NOW(),
    reward_distribution_tx_hash = p_tx_hash,
    updated_at = NOW()
  WHERE id = p_quest_id;

END;
$$ LANGUAGE plpgsql;

-- Function to expire quests that have reached their end date
CREATE OR REPLACE FUNCTION expire_quests()
RETURNS VOID AS $$
BEGIN
  UPDATE published_quests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < EXTRACT(epoch FROM NOW()) * 1000; -- Convert to milliseconds for comparison
END;
$$ LANGUAGE plpgsql;
