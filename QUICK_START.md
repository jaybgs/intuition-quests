# 🚀 Quick Start - Get Your App Running

## If Page is Not Responding, Follow These Steps:

### 1️⃣ Start Backend Server

Open **Terminal 1**:
```bash
cd backend
npm install  # If you haven't already
npm run dev
```

**Expected output:**
```
🚀 Backend server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

**If you see errors:**
- Database not connected? See "Database Setup" below
- Missing dependencies? Run `npm install`

### 2️⃣ Start Frontend Server

Open **Terminal 2** (new terminal):
```bash
cd frontend
npm install  # If you haven't already
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 3️⃣ Open Browser

Go to: **http://localhost:5173**

### 4️⃣ Check for Errors

Press `F12` to open Developer Tools:
- **Console tab**: Look for red errors
- **Network tab**: Check if API calls are failing

## Common Issues & Quick Fixes

### ❌ Backend won't start

**Error: "Cannot connect to database"**
```bash
# Option 1: Use SQLite (easiest)
# Edit backend/prisma/schema.prisma, change:
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

# Then run:
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

**Error: "Module not found"**
```bash
cd backend
npm install
```

### ❌ Frontend shows blank page

**Check browser console (F12):**
- If you see "Privy App ID is missing":
  ```bash
  # Create frontend/.env file:
  VITE_PRIVY_APP_ID=cmidethu7054di80cyrik5we2
  VITE_API_URL=http://localhost:3001/api
  
  # Then restart frontend server
  ```

- If you see "Network Error":
  - Backend is not running. Start it first!

### ❌ API calls failing

**Check:**
1. Is backend running? (Terminal 1)
2. Is `VITE_API_URL` set correctly?
3. Check Network tab in browser (F12)

## Database Setup (Choose One)

### Option A: SQLite (Easiest - No Setup Required)

1. Edit `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. Run:
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

3. Done! No `.env` needed for database.

### Option B: PostgreSQL (Production Ready)

1. Install PostgreSQL or use Docker:
   ```bash
   docker run --name trustquests-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=trustquests -p 5432:5432 -d postgres
   ```

2. Create `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/trustquests?schema=public
   PORT=3001
   JWT_SECRET=your-secret-key
   ```

3. Run:
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

## Environment Files Needed

### Frontend `.env` (in `frontend/` folder)
```env
VITE_PRIVY_APP_ID=cmidethu7054di80cyrik5we2
VITE_API_URL=http://localhost:3001/api
```

### Backend `.env` (in `backend/` folder)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/trustquests
# OR for SQLite:
# DATABASE_URL=file:./dev.db

PORT=3001
JWT_SECRET=your-secret-key-change-this
```

**Important:** After creating/editing `.env` files, **restart the dev servers**.

## Verify Everything Works

### Test Backend
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok",...}`

### Test Frontend
1. Open http://localhost:5173
2. Should see the TrustQuests interface
3. No errors in browser console (F12)

## Still Stuck?

1. **Check both terminals** - Are servers running?
2. **Check browser console** (F12) - What errors do you see?
3. **Check Network tab** - Are API calls failing?
4. **Restart everything**:
   - Stop both servers (Ctrl+C)
   - Restart backend, then frontend

## Next Steps After It's Running

1. Connect wallet (Login button)
2. View quests (should load from backend)
3. Check user dashboard (My Profile)

