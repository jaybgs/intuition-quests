-- Add quest_link column to weekly_highlights table
ALTER TABLE weekly_highlights
ADD COLUMN IF NOT EXISTS quest_link TEXT;

-- Add index for quest_link for faster queries (optional)
CREATE INDEX IF NOT EXISTS idx_weekly_highlights_quest_link ON weekly_highlights(quest_link);

-- Update existing highlights to have default quest link if they don't have one
UPDATE weekly_highlights
SET quest_link = '#quests'
WHERE quest_link IS NULL OR quest_link = '';
