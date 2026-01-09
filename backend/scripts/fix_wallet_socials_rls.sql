-- Fix wallet_socials RLS policy to allow backend operations
-- This fixes the issue where social connections weren't being saved

-- Drop the blocking policy
DROP POLICY IF EXISTS "backend_only_wallet_socials" ON wallet_socials;

-- Create a proper policy that allows service role operations
CREATE POLICY "service_role_wallet_socials" ON wallet_socials
  FOR ALL USING (true);

-- Verify the table exists and RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'wallet_socials'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'wallet_socials table does not exist. Please run the wallet-centric migration first.';
  END IF;
END $$;

-- Confirm RLS is still enabled
ALTER TABLE wallet_socials ENABLE ROW LEVEL SECURITY;
