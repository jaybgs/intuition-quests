# Supabase Quick Setup Guide

You already have Supabase configured with credentials. Follow these steps to set up the database tables.

## Step 1: Run Database Migrations

Go to your Supabase project dashboard: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl

### Option A: Using SQL Editor (Recommended)

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste the SQL from `backend/supabase/migrations/001_create_tables.sql`
4. Click **"Run"** (or press Ctrl+Enter)
5. Wait for it to complete successfully
6. Create another new query
7. Copy and paste the SQL from `backend/supabase/migrations/002_create_published_quests_table.sql`
8. Click **"Run"**

### Option B: Check Existing Tables

If you already have tables, check what you have:

1. Go to **"Table Editor"** in the left sidebar
2. Check if these tables exist:
   - `spaces` (required)
   - `published_quests` (required)

If they don't exist, run the migrations above.

## Step 2: Set Up Row Level Security (RLS)

After creating the tables, set up RLS policies so users can read/write data:

### For `spaces` table:

```sql
-- Enable RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read spaces
CREATE POLICY "Anyone can read spaces" ON spaces
  FOR SELECT USING (true);

-- Allow anyone to insert spaces
CREATE POLICY "Anyone can insert spaces" ON spaces
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update spaces
CREATE POLICY "Anyone can update spaces" ON spaces
  FOR UPDATE USING (true);

-- Allow anyone to delete spaces
CREATE POLICY "Anyone can delete spaces" ON spaces
  FOR DELETE USING (true);
```

### For `published_quests` table:

```sql
-- Enable RLS
ALTER TABLE published_quests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published quests
CREATE POLICY "Anyone can read published quests" ON published_quests
  FOR SELECT USING (true);

-- Allow anyone to insert quests
CREATE POLICY "Anyone can insert quests" ON published_quests
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update quests
CREATE POLICY "Anyone can update quests" ON published_quests
  FOR UPDATE USING (true);

-- Allow anyone to delete quests
CREATE POLICY "Anyone can delete quests" ON published_quests
  FOR DELETE USING (true);
```

**Note:** These policies allow public read/write access. For production, you may want to restrict based on user authentication.

## Step 3: Verify Your Setup

1. Go to **"Table Editor"** in Supabase dashboard
2. You should see:
   - `spaces` table with columns: id, name, slug, description, logo, twitter_url, owner_address, user_type, etc.
   - `published_quests` table with columns: id, title, description, project_id, xp_reward, iq_points, etc.

## Step 4: Test the Integration

1. Your frontend server should be running (already started)
2. Open your app in the browser
3. Try creating a space - it should save to Supabase
4. Try publishing a quest - it should save to Supabase
5. Check the Supabase dashboard → Table Editor to see the data

## Troubleshooting

### "relation does not exist" error
- Make sure you ran both migration files
- Check the Table Editor to verify tables exist

### "permission denied" error
- Make sure you ran the RLS policies
- Check that RLS is enabled on the tables

### Data not appearing
- Check browser console for errors
- Verify your `.env` file has the correct credentials
- Make sure you restarted the dev server after adding env variables

## Your Current Configuration

✅ Supabase URL: `https://cxelbkflhlrpboahxbkl.supabase.co`
✅ Anon Key: Configured in `.env`
✅ Frontend server: Running

You're all set! Just run the migrations and RLS policies above.
