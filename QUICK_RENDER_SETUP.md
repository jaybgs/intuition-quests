# Quick Render Setup

## ✅ What's Already Done:

1. ✅ `render.yaml` created in root directory
2. ✅ JWT_SECRET generated
3. ✅ Build/start commands configured
4. ✅ CORS updated for Vercel

## 🚀 Next Steps (You Need to Do):

### Option 1: Use Render Blueprint (Automatic)

1. In your Render dashboard, go to: https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repo
4. Render will detect `render.yaml` and auto-configure
5. **Still need to add manually:**
   - `SUPABASE_URL` 
   - `SUPABASE_SERVICE_ROLE_KEY`

### Option 2: Manual Configuration (Current Service)

Since you already have a service, update it manually:

1. Go to: https://dashboard.render.com/web/srv-d4pmta24i8rc73fr9l8g/settings

2. **Basic Settings:**
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Environment Variables** (Environment tab):
   ```
   NODE_ENV = production
   JWT_SECRET = 149d925f6d94c2320267d36d5798ff5bbeaf0fda91578e72243d64e3864f750d4250d0069cefc9fb1eb5d32c86d654ec4908cd8498b4952bf717d7fc0cdb59d7
   RPC_URL = https://rpc.intuition.systems
   TRUST_TOKEN_ADDRESS = 0x0000000000000000000000000000000000000000
   SUPABASE_URL = [Get from Supabase dashboard]
   SUPABASE_SERVICE_ROLE_KEY = [Get from Supabase dashboard]
   ```

4. **Get Supabase Credentials:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Settings → API
   - Copy "Project URL" → `SUPABASE_URL`
   - Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

5. Click **"Save Changes"** - Render will redeploy

## 📝 After Deployment:

1. Get your Render URL (e.g., `https://intuition-quests-backend.onrender.com`)
2. Update `frontend/.env`:
   ```env
   VITE_API_URL=https://your-service.onrender.com/api
   ```
3. Update Vercel environment variables with same URL
4. Redeploy frontend

## ✅ Test:

Visit: `https://your-service.onrender.com/health`
Should return: `{"status":"ok","message":"TrustQuests API is running"}`

