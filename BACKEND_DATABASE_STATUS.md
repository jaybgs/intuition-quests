# Backend Database Status

## Current Issue

**Database Connection Failed:**
```
Can't reach database server at `db.prisma.io:5432`
```

**Root Cause:**
The backend is configured to use a Prisma Cloud database, but the connection is failing. This is causing all `/api/spaces` endpoints to return 500 errors.

## Options to Fix

### Option 1: Fix Prisma Cloud Connection (If you have access)

1. Check your Prisma Cloud dashboard: https://cloud.prisma.io
2. Verify the database is still active
3. Get a fresh connection string if needed
4. Update `backend/.env` with the correct DATABASE_URL

### Option 2: Switch to Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL locally** or use Docker:
   ```bash
   docker run --name trustquests-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=trustquests -p 5432:5432 -d postgres
   ```

2. **Update `backend/.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/trustquests?schema=public"
   ```

3. **Run migrations:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

### Option 3: Use a Free Cloud Database (Easiest)

1. **Sign up for free tier:**
   - **Supabase**: https://supabase.com (free PostgreSQL)
   - **Railway**: https://railway.app (free tier)
   - **Neon**: https://neon.tech (serverless PostgreSQL)

2. **Get connection string** from the service

3. **Update `backend/.env`** with the new DATABASE_URL

4. **Run migrations:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

## Quick Fix for Development

If you just want to get it working quickly, use SQLite:

1. **Update `backend/prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. **Update `backend/.env`:**
   ```env
   DATABASE_URL="file:./dev.db"
   ```

3. **Run migrations:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

## After Fixing Database

Once the database connection works:

1. ✅ Backend 500 errors will stop
2. ✅ `/api/spaces` will return 200 with data (or empty array)
3. ✅ Space creation will work
4. ✅ All backend endpoints will function properly

---

**The frontend is working fine - the issue is only the backend database connection!**

