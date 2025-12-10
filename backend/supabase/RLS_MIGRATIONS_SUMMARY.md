# RLS Policies Migration Summary

This document lists all Row Level Security (RLS) policy migrations for the Intuition Quests database.

## Migration Files

### Already Applied
- **005_setup_rls_policies.sql** - RLS policies for `published_quests` table
- **006_setup_spaces_rls_policies.sql** - RLS policies for `spaces` table
- **007_setup_users_rls_policies.sql** - RLS policies for `users` table

### New Migrations to Apply

1. **008_setup_user_xp_rls_policies.sql**
   - Table: `user_xp`
   - Policies: Public read, service role insert/update
   - Purpose: Control access to user XP data

2. **009_setup_projects_rls_policies.sql**
   - Table: `projects`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to project data

3. **010_setup_quests_rls_policies.sql**
   - Table: `quests`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to quest data

4. **011_setup_quest_requirements_rls_policies.sql**
   - Table: `quest_requirements`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to quest requirements

5. **012_setup_quest_completions_rls_policies.sql**
   - Table: `quest_completions`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to quest completion records

6. **013_setup_social_connections_rls_policies.sql**
   - Table: `social_connections`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to social account connections

7. **014_setup_leaderboard_rls_policies.sql**
   - Table: `leaderboard`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to leaderboard data

8. **015_setup_trust_token_transactions_rls_policies.sql**
   - Table: `trust_token_transactions`
   - Policies: Public read, service role insert/update/delete
   - Purpose: Control access to token transaction records

## How to Apply

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. For each migration file (008-015):
   - Click **"New query"**
   - Open the migration file from `backend/supabase/migrations/`
   - Copy and paste the entire SQL content
   - Click **"Run"** (or press Ctrl+Enter)
   - Wait for it to complete successfully

## Policy Pattern

All policies follow this pattern:
- **SELECT (Read)**: Public access - anyone can read (needed for public displays, leaderboards, etc.)
- **INSERT**: Service role only - backend creates records
- **UPDATE**: Service role only - backend enforces ownership/authorization
- **DELETE**: Service role only - backend enforces ownership/authorization

## Security Notes

- The backend service role has full access to all tables
- The backend application code enforces business logic (e.g., users can only update their own profiles)
- Public read access is intentional for most tables to enable public features (leaderboards, quest browsing, etc.)
- Sensitive operations are protected by backend authentication and authorization

## Verification

After applying all migrations, you can verify RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'user_xp', 'projects', 'quests', 'quest_requirements',
  'quest_completions', 'social_connections', 'leaderboard',
  'trust_token_transactions', 'spaces', 'published_quests'
)
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.




