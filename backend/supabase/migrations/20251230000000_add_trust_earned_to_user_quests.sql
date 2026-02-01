-- Add trust_earned column to user_quests table to track TRUST tokens earned from quest completion

-- Add trust_earned column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_quests'
                   AND column_name = 'trust_earned') THEN
        ALTER TABLE user_quests ADD COLUMN trust_earned DECIMAL(18, 6) DEFAULT 0;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_quests.trust_earned IS 'TRUST tokens earned from completing this quest';

