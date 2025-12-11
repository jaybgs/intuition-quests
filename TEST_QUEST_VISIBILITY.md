# Testing Quest Visibility Across Accounts

## Pre-Testing Checklist

Before testing, ensure:
- [ ] Migration `005_setup_rls_policies.sql` has been run in Supabase
- [ ] No errors occurred during migration
- [ ] Frontend application is running
- [ ] Supabase credentials are configured in `.env`

## Test Steps

### Test 1: Verify RLS Policies Exist

1. Go to Supabase dashboard: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl
2. Navigate to **Table Editor** → `published_quests` table
3. Click on **"Policies"** tab (or go to Authentication → Policies)
4. Verify you see 4 policies:
   - ✅ "Anyone can read published quests" (SELECT)
   - ✅ "Anyone can insert quests" (INSERT)
   - ✅ "Anyone can update quests" (UPDATE)
   - ✅ "Anyone can delete quests" (DELETE)

### Test 2: Create Quest on Account A

1. Open the application in Browser/Account A
2. Connect wallet or log in as User A
3. Create a new quest:
   - Fill in quest details
   - Publish the quest
4. Verify the quest appears in the quest list for User A
5. Check browser console for any errors

### Test 3: Verify Quest Visibility on Account B

1. Open the application in a different browser/incognito window (or different device)
2. Connect a different wallet or log in as User B
3. Navigate to the quests page
4. **Expected Result**: The quest created by User A should be visible to User B
5. Check browser console for any errors

### Test 4: Verify Quest Details

1. On Account B, click on the quest created by Account A
2. Verify all quest details are visible:
   - Title
   - Description
   - Requirements
   - Rewards
   - Creator information
3. **Expected Result**: All quest information should be accessible

### Test 5: Create Quest on Account B

1. While logged in as User B, create a new quest
2. Verify the quest appears for User B
3. Switch back to Account A
4. **Expected Result**: The quest created by User B should be visible to User A

### Test 6: Database Verification

1. Go to Supabase dashboard → Table Editor → `published_quests`
2. Verify you can see quests created by both users
3. Check that `creator_address` field shows different addresses for different quests
4. Verify all quest data is present

## Expected Results

✅ **Success Criteria:**
- Quests created by User A are visible to User B
- Quests created by User B are visible to User A
- No console errors when fetching quests
- All quest details are accessible to all users
- Quests appear in the database with correct data

❌ **Failure Indicators:**
- Empty quest list on Account B when Account A created quests
- "permission denied" errors in console
- "relation does not exist" errors
- Quests only visible to their creator

## Troubleshooting

### If quests are still not visible:

1. **Check RLS Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'published_quests';
   ```
   Should return 4 policies.

2. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'published_quests';
   ```
   `rowsecurity` should be `true`.

3. **Check quests exist in database:**
   ```sql
   SELECT id, title, creator_address, created_at FROM published_quests ORDER BY created_at DESC;
   ```

4. **Test direct query:**
   ```sql
   SELECT * FROM published_quests;
   ```
   Should return all quests without errors.

5. **Check browser console:**
   - Look for Supabase errors
   - Check network tab for failed requests
   - Verify Supabase URL and keys are correct

6. **Clear cache:**
   - Clear browser localStorage
   - Hard refresh (Ctrl+Shift+R)
   - Clear browser cache

## SQL Verification Queries

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'published_quests';

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'published_quests';

-- Test read access (should return all quests)
SELECT COUNT(*) FROM published_quests;

-- View all quests
SELECT id, title, creator_address, status, created_at 
FROM published_quests 
ORDER BY created_at DESC;
```

## Success Confirmation

Once all tests pass:
- ✅ Quest visibility issue is resolved
- ✅ RLS policies are correctly configured
- ✅ Supabase backend is active and running
- ✅ Quests are accessible across all user accounts











