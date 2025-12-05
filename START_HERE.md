# 🚨 START HERE - Page Not Responding?

## Quick Fix (3 Steps)

### Step 1: Start Backend
```bash
cd backend
npm run dev
```
**Wait until you see:** `🚀 Backend server running on http://localhost:3001`

### Step 2: Start Frontend (NEW TERMINAL)
```bash
cd frontend
npm run dev
```
**Wait until you see:** `Local: http://localhost:5173/`

### Step 3: Open Browser
Go to: **http://localhost:5173**

---

## If Backend Won't Start

### Quick Fix: Use SQLite (No Database Setup Needed)

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
   npm run dev
   ```

---

## If Frontend Shows Blank Page

1. **Check Browser Console (F12)**
   - Look for red errors
   - Take a screenshot

2. **Create `frontend/.env` file:**
   ```env
   VITE_PRIVY_APP_ID=cmidethu7054di80cyrik5we2
   VITE_API_URL=http://localhost:3001/api
   ```

3. **Restart frontend:**
   ```bash
   # Stop server (Ctrl+C)
   cd frontend
   npm run dev
   ```

---

## Check These First

✅ **Backend running?** Check Terminal 1 - should see "Backend server running"  
✅ **Frontend running?** Check Terminal 2 - should see "Local: http://localhost:5173"  
✅ **Browser console errors?** Press F12, check Console tab  
✅ **API calls failing?** Press F12, check Network tab  

---

## Still Not Working?

1. **Check both terminals** - Are servers actually running?
2. **Check browser console** - What errors do you see?
3. **Check Network tab** - Are requests to `localhost:3001` failing?

**Common Issues:**
- Backend not running → Start it first!
- Wrong API URL → Check `VITE_API_URL` in frontend/.env
- Database error → Use SQLite (see above)
- Port already in use → Change PORT in backend/.env

---

## Need More Help?

See `TROUBLESHOOTING.md` for detailed solutions.

