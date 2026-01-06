-- Export current Supabase database schema
-- Run this in Supabase SQL Editor to get your current schema

-- 1. List all tables
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Get table structures (run separately for each table)
-- Replace 'table_name' with actual table names from step 1
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'table_name'
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- 3. Get RLS policies for each table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 4. Get indexes
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;



