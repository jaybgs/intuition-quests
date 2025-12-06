# Supabase Spaces Verification

## Current Implementation

The frontend uses Supabase with the **anon key** for public access to spaces. This means:
- Spaces should be visible to **everyone**, even without wallet connection
- The `getAllSpaces()` method uses: `supabase.from('spaces').select('*')`
- Uses anon key (not service role key) for client-side operations

## Required Supabase RLS Policies

To ensure spaces are visible to everyone, you need to verify these RLS policies in your Supabase dashboard:

### 1. Enable Public Read Access for Spaces Table

```sql
-- Allow anyone (including anonymous users) to read spaces
CREATE POLICY "Allow public read access to spaces"
ON spaces
FOR SELECT
TO anon, authenticated
USING (true);
```

### 2. Verify the Policy Exists

In Supabase Dashboard:
1. Go to **Authentication** → **Policies**
2. Select the `spaces` table
3. Ensure there's a policy that allows `SELECT` for `anon` role
4. The policy should use `USING (true)` to allow all rows

### 3. Test Public Access

To verify spaces are accessible without authentication:
1. Open browser in incognito mode (no wallet connected)
2. Visit the site
3. Navigate to "Discover & Earn" tab
4. Spaces should load and display

## Current Code Behavior

- ✅ Uses anon key (public access)
- ✅ Has localStorage fallback if Supabase fails
- ✅ Loads spaces on component mount (no wallet required)
- ✅ Refreshes spaces every 3 seconds
- ✅ Listens for space creation events

## If Spaces Don't Show

1. **Check Supabase RLS Policies**: Ensure public read access is enabled
2. **Check Environment Variables**: Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. **Check Browser Console**: Look for Supabase errors
4. **Check Network Tab**: Verify the Supabase API calls are successful

## Fallback Behavior

If Supabase is not accessible:
- The service falls back to localStorage
- Spaces created locally will still show
- But won't sync across devices/users

