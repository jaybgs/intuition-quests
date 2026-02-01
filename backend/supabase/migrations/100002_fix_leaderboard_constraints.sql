-- Fix leaderboard table for wallet-based system
-- Drop the foreign key constraint on user_id since we're using wallet addresses now

-- Drop the foreign key constraint
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

-- Make user_id nullable since we're primarily using address now
ALTER TABLE leaderboard ALTER COLUMN user_id DROP NOT NULL;

-- Verification
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'leaderboard' 
  AND constraint_type = 'FOREIGN KEY';
