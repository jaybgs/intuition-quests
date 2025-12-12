# Quest Visibility Fix - RLS Policies Setup

## Problem
Quests created by one user/account were not visible to other users/accounts. This was caused by missing Row Level Security (RLS) policies on the `published_quests` table in Supabase.

## Root Cause
When RLS is enabled on a Supabase table but no policies exist, Supabase blocks all access by default. This means:
- Users cannot read quests created by others
- Users may not be able to insert/update quests properly
- The table appears empty or inaccessible

## Solution
A new migration file has been created: `backend/supabase/migrations/005_setup_rls_policies.sql`

This migration:
1. Enables RLS on the `published_quests` table
2. Creates policies that allow **anyone** to read all published quests
3. Creates policies that allow **anyone** to insert, update, and delete quests

## How to Apply the Fix

### Step 1: Run the Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Open the file `backend/supabase/migrations/005_setup_rls_policies.sql`
5. Copy and paste the entire SQL content into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Wait for it to complete successfully

### Step 2: Verify the Fix

1. Go to **"Table Editor"** in Supabase dashboard
2. Click on the `published_quests` table
3. Go to the **"Policies"** tab (or check via SQL Editor)
4. You should see 4 policies:
   - "Anyone can read published quests" (SELECT)
   - "Anyone can insert quests" (INSERT)
   - "Anyone can update quests" (UPDATE)
   - "Anyone can delete quests" (DELETE)

### Step 3: Test

1. Create a quest on one account
2. Log in with a different account
3. The quest should now be visible on the second account

## Additional Fixes Applied

### Status Field Consistency
Fixed status field handling to use lowercase consistently:
- Database stores: `'active'`, `'completed'`, `'pending'` (lowercase)
- Code now converts to lowercase when inserting/updating/filtering

## Files Modified

1. **Created**: `backend/supabase/migrations/005_setup_rls_policies.sql`
   - New migration file with RLS policies

2. **Updated**: `frontend/src/services/questServiceSupabase.ts`
   - Fixed status field to use lowercase instead of uppercase
   - Ensures consistency with database constraints

3. **Updated**: `SUPABASE_QUICK_SETUP.md`
   - Added instructions for the RLS migration
   - Highlighted the critical nature of this fix

## Verification Checklist

- [ ] Migration `005_setup_rls_policies.sql` has been run in Supabase
- [ ] RLS policies are visible in Supabase dashboard
- [ ] Quest created on Account A is visible on Account B
- [ ] Quest created on Account B is visible on Account A
- [ ] No console errors when fetching quests
- [ ] Quests can be created, updated, and deleted successfully

## Troubleshooting

### "permission denied" error
- Make sure you ran the RLS migration
- Check that RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'published_quests';`
- Verify policies exist: Check the Policies tab in Supabase dashboard

### Quests still not visible
- Clear browser cache and localStorage
- Check browser console for errors
- Verify Supabase connection in `.env` file
- Check that quests actually exist in the database (Table Editor)

### Migration fails
- Make sure the `published_quests` table exists (run migration 002 first)
- Check for any existing policies that might conflict
- The migration includes DROP POLICY statements to handle re-runs safely

## Security Note

The current policies allow public read/write access. For production, you may want to:
- Restrict DELETE to quest creators only
- Add authentication checks
- Implement rate limiting
- Add audit logging

For now, these policies ensure quests are visible to all users, which is the desired behavior.












