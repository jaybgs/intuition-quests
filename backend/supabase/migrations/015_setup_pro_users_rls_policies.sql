-- Enable RLS on pro_users table
ALTER TABLE pro_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pro_users (needed for checking verified status on frontend)
CREATE POLICY "Anyone can read pro users"
ON pro_users FOR SELECT
USING (true);

-- Allow service role to insert/update (already covered by bypass RLS, but good to be explicit for other roles if needed)
-- Assuming service role bypasses RLS, but we can add policies for authenticated users if we had auth.
-- For now, just public read is key.
