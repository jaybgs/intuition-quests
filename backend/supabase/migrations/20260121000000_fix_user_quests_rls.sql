-- Fix RLS policy for user_quests table
-- The current policy blocks ALL access including service role

-- Drop the blocking policy
DROP POLICY IF EXISTS "backend_only_user_quests" ON user_quests;

-- For backend-only tables, disable RLS entirely since service role bypasses it anyway
ALTER TABLE user_quests DISABLE ROW LEVEL SECURITY;

-- Optional: If you want to keep RLS enabled but allow service role access, use this instead:
-- CREATE POLICY "service_role_user_quests" ON user_quests
--   FOR ALL USING (true);
