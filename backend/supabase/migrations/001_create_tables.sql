-- Create all tables for Intuition Quests dApp
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  profile_pic TEXT,
  twitter_handle TEXT,
  discord_id TEXT,
  email TEXT,
  github_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_address ON users(address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- User XP table
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  quests_completed INTEGER DEFAULT 0,
  claims_staked INTEGER DEFAULT 0,
  trade_volume DECIMAL(18, 2) DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);

-- Quest Status enum
CREATE TYPE quest_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  xp_reward INTEGER NOT NULL,
  trust_reward DECIMAL(18, 2),
  status quest_status DEFAULT 'ACTIVE',
  max_completions INTEGER,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_quests_project ON quests(project_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_created ON quests(created_at);

-- Requirement Type enum
CREATE TYPE requirement_type AS ENUM (
  'FOLLOW', 'RETWEET', 'LIKE', 'COMMENT', 'MENTION', 'VISIT',
  'VERIFY_WALLET', 'TRANSACTION', 'NFT_HOLD', 'TOKEN_BALANCE',
  'CONTRACT_INTERACTION', 'SIGNUP', 'CUSTOM', 'SEQUENCE', 'TIME_BASED'
);

-- Quest Requirements table
CREATE TABLE IF NOT EXISTS quest_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  type requirement_type NOT NULL,
  description TEXT NOT NULL,
  verification_data JSONB NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_requirements_quest ON quest_requirements(quest_id);

-- Quest Completions table
CREATE TABLE IF NOT EXISTS quest_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_earned INTEGER NOT NULL,
  trust_earned DECIMAL(18, 2),
  verified BOOLEAN DEFAULT false,
  verification_data JSONB,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claim_id TEXT UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_completions_unique ON quest_completions(quest_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_user ON quest_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_quest ON quest_completions(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_completions_completed ON quest_completions(completed_at);

-- Social Platform enum
CREATE TYPE social_platform AS ENUM ('TWITTER', 'DISCORD', 'EMAIL', 'GITHUB');

-- Social Connections table
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  platform_id TEXT NOT NULL,
  username TEXT,
  verified BOOLEAN DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_connections_user ON social_connections(user_id);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  address TEXT NOT NULL,
  total_xp INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  level INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard(total_xp);

-- Transaction Type enum
CREATE TYPE transaction_type AS ENUM ('QUEST_REWARD', 'STAKING_REWARD', 'REFERRAL_BONUS', 'ADMIN_AWARD');

-- Transaction Status enum
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Trust Token Transactions table
CREATE TABLE IF NOT EXISTS trust_token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  address TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  type transaction_type NOT NULL,
  quest_id UUID REFERENCES quests(id),
  tx_hash TEXT UNIQUE,
  status transaction_status DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON trust_token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_address ON trust_token_transactions(address);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON trust_token_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON trust_token_transactions(status);

-- Space User Type enum
CREATE TYPE space_user_type AS ENUM ('PROJECT', 'USER');

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  logo TEXT,
  twitter_url TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  user_type space_user_type NOT NULL,
  atom_id TEXT,
  atom_transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaces_owner ON spaces(owner_address);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug);
CREATE INDEX IF NOT EXISTS idx_spaces_created ON spaces(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_xp_updated_at BEFORE UPDATE ON user_xp
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

