-- Create published_quests table matching current Quest interface
-- This replaces the old quest schema with the current implementation

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS published_quests CASCADE;
DROP TABLE IF EXISTS quests CASCADE;

-- Create new published_quests table matching current implementation
CREATE TABLE IF NOT EXISTS published_quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_id TEXT, -- Changed from UUID to TEXT to match current usage
  project_name TEXT,
  space_id TEXT, -- Space ID that the quest belongs to
  xp_reward INTEGER, -- Changed from xpReward to xp_reward for consistency
  requirements JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
  created_at BIGINT NOT NULL, -- Timestamp in milliseconds
  start_at BIGINT, -- When quest starts
  start_date TEXT,
  start_time TEXT,
  creator_address TEXT NOT NULL, -- Wallet address instead of UUID reference
  atom_id TEXT, -- Intuition atom ID
  atom_transaction_hash TEXT, -- Transaction hash of atom creation
  distribution_type TEXT CHECK (distribution_type IN ('fcfs', 'raffle')),
  triple_id TEXT, -- Triple/claim ID for quest completion
  triple_transaction_hash TEXT,
  image TEXT, -- Quest image (base64 or URL)
  iq_points INTEGER, -- IQ points users earn
  number_of_winners INTEGER,
  winner_prizes JSONB DEFAULT '[]',
  reward_deposit TEXT,
  reward_token TEXT,
  expires_at BIGINT, -- Timestamp when quest expires
  end_date TEXT,
  end_time TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_published_quests_creator_address ON published_quests(creator_address);
CREATE INDEX IF NOT EXISTS idx_published_quests_space_id ON published_quests(space_id);
CREATE INDEX IF NOT EXISTS idx_published_quests_status ON published_quests(status);
CREATE INDEX IF NOT EXISTS idx_published_quests_created_at ON published_quests(created_at);

-- Add comment
COMMENT ON TABLE published_quests IS 'Published quests created by users';
