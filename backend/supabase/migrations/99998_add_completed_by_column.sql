-- Add completed_by column back to published_quests if it doesn't exist
-- Migration 023 may have dropped this column

-- Check if column exists and add it if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'published_quests' 
    AND column_name = 'completed_by'
  ) THEN
    ALTER TABLE published_quests 
    ADD COLUMN completed_by JSONB NOT NULL DEFAULT '[]'::jsonb;
    
    RAISE NOTICE 'Added completed_by column to published_quests';
  ELSE
    RAISE NOTICE 'completed_by column already exists';
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_published_quests_completed_by ON published_quests USING GIN (completed_by);
