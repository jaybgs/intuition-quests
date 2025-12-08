# Remove "My Quest 2024" from Database

This guide explains how to remove "My Quest 2024" from your local database.

## Option 1: Run SQL Migration (Recommended)

The easiest way is to run the SQL migration directly in Supabase:

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `backend/supabase/migrations/003_remove_quest_2024.sql`
4. Click "Run"

This will delete "My Quest 2024" from both `published_quests` and `quests` tables.

## Option 2: Run TypeScript Script

If you have your Supabase credentials configured in `backend/.env`:

```bash
cd backend
npm run remove:quest-2024
```

Make sure your `.env` file contains:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Option 3: Clear localStorage (Browser)

If the quest is also stored in browser localStorage:

1. Open your browser DevTools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Find keys starting with `published_quests_`
5. For each key:
   - Click on it to view the stored data
   - Look for entries with title "My Quest 2024"
   - Edit the JSON to remove those entries, or delete the entire key if it only contains that quest

## Verification

After running any of the above methods, verify the quest is removed:

1. Check your quest list in the frontend
2. Or query the database:
   ```sql
   SELECT * FROM published_quests WHERE title ILIKE '%My Quest 2024%';
   SELECT * FROM quests WHERE title ILIKE '%My Quest 2024%';
   ```

Both queries should return no results.




