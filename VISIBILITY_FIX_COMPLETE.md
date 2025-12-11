# Complete Visibility Fix - Quests & Spaces RLS Policies

## Problem
Quests and spaces created by one user/account were not visible to other users/accounts. This was caused by missing Row Level Security (RLS) policies on the `published_quests` and `spaces` tables in Supabase.

## Root Cause
When RLS is enabled on a Supabase table but no policies exist, Supabase blocks all access by default. This means:
- Users cannot read quests/spaces created by others
- Users may not be able to insert/update quests/spaces properly
- The tables appear empty or inaccessible

## Solution
Two migration files have been created:
1. `backend/supabase/migrations/005_setup_rls_policies.sql` - For quests
2. `backend/supabase/migrations/006_setup_spaces_rls_policies.sql` - For spaces

These migrations:
1. Enable RLS on the respective tables
2. Create policies that allow **anyone** to read all published quests and spaces
3. Create policies that allow **anyone** to insert, update, and delete quests and spaces

## How to Apply the Fix

### Step 1: Run the Migrations

**For Quests:**
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Open the file `backend/supabase/migrations/005_setup_rls_policies.sql`
5. Copy and paste the entire SQL content into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Wait for it to complete successfully

**For Spaces:**
1. Click **"New query"** again
2. Open the file `backend/supabase/migrations/006_setup_spaces_rls_policies.sql`
3. Copy and paste the entire SQL content into the SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)
5. Wait for it to complete successfully

### Step 2: Verify the Fix

**For Quests:**
1. Go to **"Table Editor"** in Supabase dashboard
2. Click on the `published_quests` table
3. Go to the **"Policies"** tab (or check via SQL Editor)
4. You should see 4 policies:
   - "Anyone can read published quests" (SELECT)
   - "Anyone can insert quests" (INSERT)
   - "Anyone can update quests" (UPDATE)
   - "Anyone can delete quests" (DELETE)

**For Spaces:**
1. Click on the `spaces` table
2. Go to the **"Policies"** tab
3. You should see 4 policies:
   - "Anyone can read spaces" (SELECT)
   - "Anyone can insert spaces" (INSERT)
   - "Anyone can update spaces" (UPDATE)
   - "Anyone can delete spaces" (DELETE)

### Step 3: Test

**Test Quests:**
1. Create a quest on one account
2. Log in with a different account
3. The quest should now be visible on the second account

**Test Spaces:**
1. Create a space on one account
2. Log in with a different account
3. The space should now be visible on the second account

## Files Created

1. **`backend/supabase/migrations/005_setup_rls_policies.sql`**
   - RLS policies for `published_quests` table

2. **`backend/supabase/migrations/006_setup_spaces_rls_policies.sql`**
   - RLS policies for `spaces` table

## Files Modified

1. **`frontend/src/services/questServiceSupabase.ts`**
   - Fixed status field to use lowercase instead of uppercase
   - Ensures consistency with database constraints

2. **`SUPABASE_QUICK_SETUP.md`**
   - Added instructions for both RLS migrations
   - Highlighted the critical nature of these fixes

## Verification Checklist

### Quests:
- [ ] Migration `005_setup_rls_policies.sql` has been run in Supabase
- [ ] RLS policies are visible in Supabase dashboard for `published_quests`
- [ ] Quest created on Account A is visible on Account B
- [ ] Quest created on Account B is visible on Account A
- [ ] No console errors when fetching quests
- [ ] Quests can be created, updated, and deleted successfully

### Spaces:
- [ ] Migration `006_setup_spaces_rls_policies.sql` has been run in Supabase
- [ ] RLS policies are visible in Supabase dashboard for `spaces`
- [ ] Space created on Account A is visible on Account B
- [ ] Space created on Account B is visible on Account A
- [ ] No console errors when fetching spaces
- [ ] Spaces can be created, updated, and deleted successfully

## SQL Verification Queries

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if RLS is enabled for both tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('published_quests', 'spaces');

-- Check policies exist for quests
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'published_quests';

-- Check policies exist for spaces
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'spaces';

-- Test read access (should return all records)
SELECT COUNT(*) FROM published_quests;
SELECT COUNT(*) FROM spaces;
```

## Troubleshooting

### "permission denied" error
- Make sure you ran both RLS migrations
- Check that RLS is enabled: Use the verification queries above
- Verify policies exist: Check the Policies tab in Supabase dashboard

### Quests/Spaces still not visible
- Clear browser cache and localStorage
- Check browser console for errors
- Verify Supabase connection in `.env` file
- Check that quests/spaces actually exist in the database (Table Editor)

### Migration fails
- Make sure the tables exist (run migrations 001 and 002 first)
- Check for any existing policies that might conflict
- The migrations include DROP POLICY statements to handle re-runs safely

## Security Note

The current policies allow public read/write access. For production, you may want to:
- Restrict DELETE to creators only
- Add authentication checks
- Implement rate limiting
- Add audit logging

For now, these policies ensure quests and spaces are visible to all users, which is the desired behavior.










