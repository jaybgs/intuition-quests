-- Add logo and cover columns to published_quests table
ALTER TABLE published_quests 
ADD COLUMN IF NOT EXISTS logo text,
ADD COLUMN IF NOT EXISTS cover text;

-- Comment on columns
COMMENT ON COLUMN published_quests.logo IS 'URL to the quest logo image';
COMMENT ON COLUMN published_quests.cover IS 'URL to the quest cover/background image';
