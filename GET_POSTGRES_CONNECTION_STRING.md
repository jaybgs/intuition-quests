# Get PostgreSQL Connection String from Supabase

## What You Shared vs What We Need

**What you shared:**
- `NEXT_PUBLIC_SUPABASE_URL` - This is for Supabase client SDK (frontend)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - This is for Supabase client SDK

**What we need:**
- PostgreSQL connection string for Prisma (backend database access)

## How to Get the PostgreSQL Connection String

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `cxelbkflhlrpboahxbkl`
3. **Click Settings** (⚙️ icon - bottom left)
4. **Click "Database"** in the sidebar
5. **Scroll down to "Connection string"**
6. **Click the "URI" tab**
7. **Copy the connection string** - it looks like:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.cxelbkflhlrpboahxbkl.supabase.co:5432/postgres
   ```

8. **Replace `[YOUR-PASSWORD]`** with your actual database password (the one you set when creating the project)

## The Connection String Format

Should look like this:
```
postgresql://postgres:your-actual-password@db.cxelbkflhlrpboahxbkl.supabase.co:5432/postgres
```

Or with connection pooling:
```
postgresql://postgres.cxelbkflhlrpboahxbkl:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Quick Steps

1. Open: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl/settings/database
2. Find "Connection string" section
3. Click "URI" tab
4. Copy the string
5. Replace `[YOUR-PASSWORD]` with your password
6. Send me the complete string

---

**Send me the complete PostgreSQL connection string (not the Supabase URL/key) and I'll set it up!** 🚀

