# Database Connection Issue - Fix Required

## Problem

The backend is trying to connect to `db.prisma.io:5432` which is not accessible. This is causing:
- 500 errors on `/api/spaces` endpoints
- Database queries failing

## Solution Options

### Option 1: Setup Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/windows/
   - Or use Docker:
     ```bash
     docker run --name trustquests-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=trustquests -p 5432:5432 -d postgres
     ```

2. **Update `backend/.env` file** with:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/trustquests?schema=public"
   ```

3. **Create the database:**
   ```sql
   CREATE DATABASE trustquests;
   ```

4. **Then run migrations:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

### Option 2: Use Prisma Cloud Database

If you have a Prisma Cloud account, update the `DATABASE_URL` in `backend/.env` with your actual Prisma Cloud connection string.

### Option 3: Use a Cloud Database Service

Use services like:
- **Supabase**: https://supabase.com (free tier available)
- **Railway**: https://railway.app
- **Neon**: https://neon.tech

Then update `DATABASE_URL` in `backend/.env` with the connection string.

## Quick Fix Steps

1. **Check current DATABASE_URL:**
   - Look in `backend/.env` file
   - The URL should point to an accessible database

2. **If using local PostgreSQL:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trustquests?schema=public"
   ```

3. **Create database (if doesn't exist):**
   ```bash
   psql -U postgres
   CREATE DATABASE trustquests;
   \q
   ```

4. **Run migrations:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Restart backend server**

## Current Status

- ❌ Database connection failing: `Can't reach database server at db.prisma.io:5432`
- ⏭️ Need to configure valid DATABASE_URL
- ⏭️ Need to run migrations after fixing connection

---

**The 500 errors will stop once the database connection is fixed and migrations are run!**

