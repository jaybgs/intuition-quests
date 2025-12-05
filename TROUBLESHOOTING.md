# 🔧 Troubleshooting Guide

## Page Not Responding - Quick Fixes

### Step 1: Check if Backend is Running

Open a terminal and run:
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Backend server running on http://localhost:3001
```

If you see errors, check:
- Is PostgreSQL running? (if using PostgreSQL)
- Is DATABASE_URL set in `.env`?
- Are dependencies installed? (`npm install`)

### Step 2: Check if Frontend is Running

Open another terminal and run:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 3: Check Browser Console

1. Open your browser (http://localhost:5173)
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Look for red errors

Common errors and fixes:

#### Error: "Network Error" or "Failed to fetch"
- **Fix**: Backend is not running. Start it with `cd backend && npm run dev`

#### Error: "CORS policy"
- **Fix**: Backend CORS is already configured. Make sure backend is running on port 3001

#### Error: "Cannot read property of undefined"
- **Fix**: API endpoint might be wrong. Check `VITE_API_URL` in frontend `.env`

#### Error: "Privy App ID is missing"
- **Fix**: Create `frontend/.env` file with:
  ```
  VITE_PRIVY_APP_ID=cmidethu7054di80cyrik5we2
  VITE_API_URL=http://localhost:3001/api
  ```
  Then restart the frontend dev server.

### Step 4: Check Network Tab

1. Open Developer Tools (`F12`)
2. Go to **Network** tab
3. Refresh the page
4. Look for failed requests (red)

If you see:
- `GET http://localhost:3001/api/quests` → 404 or Connection refused
  - **Fix**: Backend is not running or wrong URL

- `GET http://localhost:3001/api/quests` → CORS error
  - **Fix**: Backend CORS should be enabled (already done)

### Step 5: Verify Environment Variables

#### Frontend `.env` (in `frontend/` folder)
```env
VITE_PRIVY_APP_ID=cmidethu7054di80cyrik5we2
VITE_API_URL=http://localhost:3001/api
```

#### Backend `.env` (in `backend/` folder)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/trustquests
PORT=3001
JWT_SECRET=your-secret-key
```

**Important**: After changing `.env` files, **restart the dev servers**.

### Step 6: Check Database Connection

If backend is failing to start:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

If you see database errors:
- **PostgreSQL**: Make sure PostgreSQL is running
- **SQLite**: Should work automatically

### Step 7: Clear Browser Cache

1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Clear cache and cookies
3. Refresh the page

### Step 8: Check for Import Errors

Open browser console and look for:
- "Cannot find module"
- "Failed to resolve import"

**Fix**: Run `npm install` in both frontend and backend folders.

## Common Issues

### Issue: Page loads but shows blank/white screen

**Possible causes:**
1. JavaScript error - Check browser console
2. React error - Check console for React errors
3. API calls failing - Check Network tab

**Fix:**
1. Open browser console (`F12`)
2. Look for errors
3. Check if backend is running
4. Verify API URL is correct

### Issue: "Cannot connect to backend"

**Check:**
1. Is backend running? `cd backend && npm run dev`
2. Is it on port 3001? Check backend terminal
3. Is `VITE_API_URL` correct in frontend `.env`?

**Fix:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Issue: API calls return 404

**Check:**
1. Backend routes are correct
2. API URL includes `/api` prefix
3. Backend server is running

**Fix:**
- Verify `VITE_API_URL=http://localhost:3001/api` (note the `/api` at the end)

### Issue: Database connection errors

**For PostgreSQL:**
```bash
# Check if PostgreSQL is running
# Windows: Check Services
# Mac/Linux: sudo systemctl status postgresql

# Create database
createdb trustquests

# Update DATABASE_URL in backend/.env
```

**For SQLite (easier for development):**
1. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
2. Run: `npm run prisma:migrate`

## Quick Test Commands

### Test Backend
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok",...}`

### Test Frontend API Connection
Open browser console and run:
```javascript
fetch('http://localhost:3001/api/quests')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

## Still Not Working?

1. **Check all terminals** - Are both servers running?
2. **Check ports** - Is port 3001 and 5173 available?
3. **Check firewall** - Is it blocking connections?
4. **Restart everything**:
   ```bash
   # Stop all servers (Ctrl+C)
   # Then restart:
   cd backend && npm run dev
   # New terminal:
   cd frontend && npm run dev
   ```

## Get Help

If still stuck, provide:
1. Browser console errors (screenshot)
2. Backend terminal output
3. Frontend terminal output
4. Network tab screenshot (showing failed requests)

