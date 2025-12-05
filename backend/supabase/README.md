# Supabase Database Setup

## Quick Setup Instructions

### Step 1: Create Tables in Supabase

1. **Go to Supabase SQL Editor:**
   - Dashboard: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl/sql/new

2. **Copy the SQL from:**
   - `backend/supabase/migrations/001_create_tables.sql`

3. **Paste and Execute:**
   - Paste the entire SQL file into the SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for all tables to be created

### Step 2: Verify Tables Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `users`
   - `user_xp`
   - `projects`
   - `quests`
   - `quest_requirements`
   - `quest_completions`
   - `social_connections`
   - `leaderboard`
   - `trust_token_transactions`
   - `spaces`

### Step 3: Update Backend Services

The backend is now configured to use Supabase. Services will automatically connect to your Supabase database.

## What's Included

- ✅ All table definitions from your Prisma schema
- ✅ Proper indexes for performance
- ✅ Foreign key relationships
- ✅ Auto-update triggers for `updated_at` fields
- ✅ Enums for status/types

## Testing Connection

Once tables are created, test the connection:

```bash
cd backend
npm run dev
```

Then test an API endpoint like:
```
GET http://localhost:3001/api/spaces
```

This should return an empty array `[]` if working correctly (since no spaces exist yet).

---

**All done! Your backend is now connected to Supabase!** 🚀

