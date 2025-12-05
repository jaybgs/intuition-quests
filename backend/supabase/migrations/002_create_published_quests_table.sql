-- Create published_quests table for storing quests published by users
-- This table stores quests in a format compatible with the frontend

-- Drop table if it exists (to fix any previous incomplete migrations)
DROP TABLE IF EXISTS published_quests CASCADE;

CREATE TABLE published_quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  creator_address TEXT,
  xp_reward INTEGER DEFAULT 100,
  iq_points INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
  twitter_link TEXT,
  atom_id TEXT,
  atom_transaction_hash TEXT,
  distribution_type TEXT CHECK (distribution_type IN ('fcfs', 'raffle')),
  number_of_winners INTEGER,
  reward_deposit TEXT,
  reward_token TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  winner_prizes JSONB DEFAULT '[]'::jsonb,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_published_quests_project ON published_quests(project_id);
CREATE INDEX idx_published_quests_status ON published_quests(status);
CREATE INDEX idx_published_quests_creator ON published_quests(creator_address);
CREATE INDEX idx_published_quests_created ON published_quests(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_published_quests_updated_at BEFORE UPDATE ON published_quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
