# ⚡ URGENT: Database Setup for Launch Today

## Current Issue

The Prisma Cloud database (`db.prisma.io:5432`) is **not reachable**. This is blocking:
- ❌ Backend API endpoints
- ❌ Database migrations
- ❌ Going live

## 🚀 FASTEST Solution: Supabase (2 minutes)

### Step 1: Create Supabase Database (1 minute)
1. Go to: **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with **GitHub** (fastest)
4. Click **"New Project"**
5. Fill in:
   - Name: `intuition-quests`
   - Password: Create a strong password (save it!)
   - Region: Choose closest
6. Click **"Create new project"**
7. Wait 30-60 seconds

### Step 2: Get Connection String (30 seconds)
1. In your project, click the **⚙️ Settings** icon (bottom left)
2. Click **"Database"** in the sidebar
3. Scroll to **"Connection string"**
4. Click the **"URI"** tab
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` with the password you created

### Step 3: Update Backend (30 seconds)
Send me the connection string and I'll:
1. Update `backend/.env`
2. Run migrations
3. Verify it works

## Alternative: Railway (Also Fast)

If Supabase doesn't work:
1. Go to: **https://railway.app**
2. Sign up with GitHub
3. Click **"New Project"** → **"Database"** → **"Add PostgreSQL"**
4. Copy the connection string from Variables tab
5. Send it to me

---

**Recommendation: Use Supabase - it's free, reliable, and takes 2 minutes total!**

