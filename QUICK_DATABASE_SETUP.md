# Quick Database Setup - Go Live Today! 🚀

## Recommended: Supabase (Fastest & Easiest)

**Why Supabase:**
- ✅ Free tier with 500MB database
- ✅ Setup in 2 minutes
- ✅ Production-ready
- ✅ Automatic backups
- ✅ Web dashboard included

## Step-by-Step Setup (5 minutes)

### 1. Create Supabase Account
1. Go to: https://supabase.com
2. Click "Start your project" 
3. Sign up with GitHub/Google (fastest)

### 2. Create New Project
1. Click "New Project"
2. Fill in:
   - **Name**: `intuition-quests` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
3. Click "Create new project"
4. Wait 2-3 minutes for setup

### 3. Get Connection String
1. Go to **Project Settings** (gear icon)
2. Click **Database** in sidebar
3. Scroll to **Connection string**
4. Copy the **URI** connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### 4. Update Backend .env
Replace the `DATABASE_URL` in `backend/.env` with your Supabase connection string.

### 5. Run Migrations
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

## Alternative: Railway (Also Fast)

If Supabase doesn't work, use Railway:
1. Go to: https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Database" → "Add PostgreSQL"
4. Copy the connection string
5. Update `backend/.env`
6. Run migrations

## Alternative: Neon (Serverless)

Another fast option:
1. Go to: https://neon.tech
2. Sign up
3. Create project
4. Copy connection string
5. Update and migrate

---

**Recommendation: Use Supabase - it's the fastest and most reliable for going live today!**

