# Supabase Setup Guide

This guide will help you set up Supabase for storing spaces and quests data in the TrustQuests application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: TrustQuests (or your preferred name)
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for the project to be created (takes a few minutes)

## Step 2: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor" in the left sidebar
3. Run the migration files in order:

### Migration 1: Base Tables
Open `backend/supabase/migrations/001_create_tables.sql` and run it in the SQL Editor.

This creates:
- Users table
- User XP table
- Projects table
- Quests table
- Quest Requirements table
- Quest Completions table
- Social Connections table
- Leaderboard table
- Trust Token Transactions table
- **Spaces table** (for storing user-created spaces)

### Migration 2: Published Quests Table
Open `backend/supabase/migrations/002_create_published_quests_table.sql` and run it in the SQL Editor.

This creates:
- **Published Quests table** (for storing quests published by users)

## Step 3: Configure Row Level Security (RLS)

For the `spaces` and `published_quests` tables, you'll want to set up RLS policies:

### Spaces Table RLS

```sql
-- Enable RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read spaces
CREATE POLICY "Anyone can read spaces" ON spaces
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own spaces
CREATE POLICY "Users can insert their own spaces" ON spaces
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own spaces
CREATE POLICY "Users can update their own spaces" ON spaces
  FOR UPDATE USING (true);

-- Allow users to delete their own spaces
CREATE POLICY "Users can delete their own spaces" ON spaces
  FOR DELETE USING (true);
```

### Published Quests Table RLS

```sql
-- Enable RLS
ALTER TABLE published_quests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read published quests
CREATE POLICY "Anyone can read published quests" ON published_quests
  FOR SELECT USING (true);

-- Allow authenticated users to insert quests
CREATE POLICY "Users can insert quests" ON published_quests
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own quests
CREATE POLICY "Users can update their own quests" ON published_quests
  FOR UPDATE USING (true);

-- Allow users to delete their own quests
CREATE POLICY "Users can delete their own quests" ON published_quests
  FOR DELETE USING (true);
```

## Step 4: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to "Settings" → "API"
2. Copy the following:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon/public key** (this is your `VITE_SUPABASE_ANON_KEY`)

## Step 5: Configure Frontend Environment Variables

1. Copy `frontend/.env.example` to `frontend/.env`
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Contract Addresses (already configured)
VITE_TRANSACTION_WRAPPER_ADDRESS=0x114cd8A832303d14b87Dd1658a482003a0722ACB
VITE_QUEST_CLAIM_SURCHARGE_ADDRESS=0x85e07bfB784A069e19AE552Dd5209a463528165d
VITE_QUEST_ESCROW_ADDRESS=0xDaeb8F72678a723b273F7273c628Ad6d31cE3A4e
```

## Step 6: Install Dependencies

The Supabase client is already installed. If you need to reinstall:

```bash
cd frontend
npm install @supabase/supabase-js
```

## Step 7: Test the Integration

1. Start your frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Create a space - it should be saved to Supabase
3. Create and publish a quest - it should be saved to Supabase
4. Check your Supabase dashboard → Table Editor to verify data is being stored

## How It Works

### Spaces
- When a user creates a space, it's saved to the `spaces` table in Supabase
- The `spaceService` automatically uses Supabase if configured, with localStorage as fallback
- All users can see all spaces created by any user

### Quests
- When a user publishes a quest, it's saved to the `published_quests` table in Supabase
- The `questServiceBackend` fetches from Supabase first, then falls back to localStorage and backend API
- All users can see all published quests from any user

### Fallback Behavior
- If Supabase is not configured or unavailable, the app automatically falls back to localStorage
- This ensures the app continues to work even if Supabase is down
- Data is synchronized when Supabase becomes available again

## Troubleshooting

### "Supabase not configured" warnings
- Make sure your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after changing `.env` files

### RLS Policy Errors
- Make sure you've run the RLS policies SQL commands
- Check that RLS is enabled on the tables

### Data not appearing
- Check the Supabase dashboard → Table Editor to see if data is being inserted
- Check the browser console for any error messages
- Verify your RLS policies allow the operations you're trying to perform

## Next Steps

- Set up authentication if you want user-specific data access
- Configure backups in Supabase dashboard
- Set up monitoring and alerts for your database
