# 🚀 Create Tables in Supabase - Step by Step

## Quick Setup (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: **https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl/sql/new**

### Step 2: Copy the SQL Migration

Open this file: `backend/supabase/migrations/001_create_tables.sql`

Copy **ALL** the SQL code from that file.

### Step 3: Paste and Run

1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** button (or press `Ctrl+Enter`)
3. Wait for success message - all tables should be created!

### Step 4: Verify Tables Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - ✅ `users`
   - ✅ `user_xp`
   - ✅ `projects`
   - ✅ `quests`
   - ✅ `quest_requirements`
   - ✅ `quest_completions`
   - ✅ `social_connections`
   - ✅ `leaderboard`
   - ✅ `trust_token_transactions`
   - ✅ `spaces`

## What Was Created

- ✅ All database tables from your Prisma schema
- ✅ Proper indexes for fast queries
- ✅ Foreign key relationships
- ✅ Enums for status/types
- ✅ Auto-update triggers for `updated_at` fields

## Test Your Backend

Once tables are created, test it:

```bash
cd backend
npm run dev
```

Then test an endpoint:
```
GET http://localhost:3001/api/spaces
```

Should return: `{ "spaces": [] }` (empty array if no spaces exist yet)

## Next Steps

- ✅ Tables created
- ✅ Backend connected to Supabase
- ✅ Ready to store data!

---

**Your backend is now fully connected to Supabase!** 🎉

