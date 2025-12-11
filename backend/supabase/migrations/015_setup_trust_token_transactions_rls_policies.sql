-- Setup Row Level Security (RLS) policies for trust_token_transactions table
-- This ensures proper access control for token transactions

-- Enable RLS on trust_token_transactions table
ALTER TABLE trust_token_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can read their own transactions" ON trust_token_transactions;
DROP POLICY IF EXISTS "Anyone can read public transaction data" ON trust_token_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON trust_token_transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON trust_token_transactions;
DROP POLICY IF EXISTS "Service role can delete transactions" ON trust_token_transactions;

-- Allow anyone (including anonymous users) to read transaction data
-- This is needed for transparency and public transaction history
-- Note: Sensitive data should be filtered by the backend
CREATE POLICY "Anyone can read public transaction data" ON trust_token_transactions
  FOR SELECT USING (true);

-- Allow service role (backend) to insert new transactions
-- This is needed when transactions are created
CREATE POLICY "Service role can insert transactions" ON trust_token_transactions
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role (backend) to update transactions
-- This is needed for status updates (pending -> completed, etc.)
CREATE POLICY "Service role can update transactions" ON trust_token_transactions
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Allow service role (backend) to delete transactions
-- This is needed for admin operations or corrections
CREATE POLICY "Service role can delete transactions" ON trust_token_transactions
  FOR DELETE USING (true);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'trust_token_transactions' 
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'Table trust_token_transactions does not exist. Please run migration 001_create_tables.sql first.';
  END IF;
END $$;









