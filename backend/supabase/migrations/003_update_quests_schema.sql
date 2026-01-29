-- Add columns for PublishQuests contract and IQ-only support
ALTER TABLE published_quests 
ADD COLUMN IF NOT EXISTS unique_id_string text,
ADD COLUMN IF NOT EXISTS quest_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'trust_and_iq';

-- Add comments explaining the columns
COMMENT ON COLUMN published_quests.unique_id_string IS 'Unique string used to generate the Atom ID (format: name_startTime_endTime)';
COMMENT ON COLUMN published_quests.quest_version IS 'Version of the quest contract logic (1 = old manual, 2 = PublishQuests contract)';
COMMENT ON COLUMN published_quests.reward_type IS 'Type of reward: "iq_only", "trust_only", or "trust_and_iq"';

-- Make reward_deposit and reward_token nullable explicitly if they aren't already (usually done by default but good to be safe)
ALTER TABLE published_quests ALTER COLUMN reward_deposit DROP NOT NULL;
ALTER TABLE published_quests ALTER COLUMN reward_token DROP NOT NULL;
