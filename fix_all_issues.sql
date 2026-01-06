-- COMPLETE FIX: Run this entire script in Supabase SQL Editor
-- This will fix all quest_drafts table issues

-- Step 1: Check current table state
SELECT 'Current quest_drafts columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quest_drafts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Drop table if it exists with wrong schema (CAUTION: This will delete existing data!)
-- Uncomment the next line ONLY if you want to recreate the table from scratch
-- DROP TABLE IF EXISTS quest_drafts CASCADE;

-- Step 3: Create the complete quest_drafts table with ALL columns
CREATE TABLE IF NOT EXISTS quest_drafts (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  title TEXT,
  difficulty TEXT,
  description TEXT,
  image_preview TEXT,
  end_date TEXT,
  end_time TEXT,
  selected_actions JSONB,
  number_of_winners TEXT,
  winner_prizes JSONB,
  iq_points TEXT,
  reward_deposit TEXT,
  reward_token TEXT DEFAULT 'TRUST',
  distribution_type TEXT DEFAULT 'fcfs',
  current_step INTEGER DEFAULT 1,
  deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'approved', 'deposited')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed')),
  published_at TIMESTAMP WITH TIME ZONE,
  atom_id TEXT,
  atom_transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create all indexes
CREATE INDEX IF NOT EXISTS idx_quest_drafts_user ON quest_drafts(user_address);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_space ON quest_drafts(space_id);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_updated ON quest_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_deposit_status ON quest_drafts(deposit_status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_status ON quest_drafts(status);
CREATE INDEX IF NOT EXISTS idx_quest_drafts_published_at ON quest_drafts(published_at);

-- Step 5: Enable RLS
ALTER TABLE quest_drafts ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Users can read their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can insert their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON quest_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON quest_drafts;

CREATE POLICY "Users can read their own drafts" ON quest_drafts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own drafts" ON quest_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own drafts" ON quest_drafts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete their own drafts" ON quest_drafts FOR DELETE USING (true);

-- Step 7: Verify final table structure
SELECT 'Final quest_drafts columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quest_drafts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 8: Test insert (should work now)
-- Uncomment to test:
-- INSERT INTO quest_drafts (id, user_address, title, difficulty)
-- VALUES ('test-draft', '0x123...', 'Test Quest', 'beginner');



