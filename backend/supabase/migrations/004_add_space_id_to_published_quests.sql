-- Add space_id column to published_quests table
ALTER TABLE published_quests 
ADD COLUMN IF NOT EXISTS space_id TEXT;

-- Create index for space_id for faster queries
CREATE INDEX IF NOT EXISTS idx_published_quests_space_id ON published_quests(space_id);



