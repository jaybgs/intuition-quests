# Render Environment Variables

Copy these to your Render dashboard: https://dashboard.render.com/web/srv-d4pmta24i8rc73fr9l8g/settings

## Required Variables

```
NODE_ENV = production
```

```
JWT_SECRET = 149d925f6d94c2320267d36d5798ff5bbeaf0fda91578e72243d64e3864f750d4250d0069cefc9fb1eb5d32c86d654ec4908cd8498b4952bf717d7fc0cdb59d7
```

```
RPC_URL = https://rpc.intuition.systems
```

```
TRUST_TOKEN_ADDRESS = 0x0000000000000000000000000000000000000000
```

## You Need to Set These Manually:

### SUPABASE_URL
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **"Project URL"** (looks like: `https://xxxxx.supabase.co`)

### SUPABASE_SERVICE_ROLE_KEY
1. In the same Supabase API settings page
2. Find the **"service_role"** key (⚠️ Keep this secret!)
3. Copy the entire key

## How to Add in Render:

1. Go to: https://dashboard.render.com/web/srv-d4pmta24i8rc73fr9l8g/settings
2. Click the **"Environment"** tab
3. Click **"Add Environment Variable"** for each variable above
4. Paste the key and value
5. Click **"Save Changes"**
6. Render will automatically redeploy

## After Setup:

1. Wait for deployment to complete
2. Get your service URL (e.g., `https://intuition-quests-backend.onrender.com`)
3. Update frontend `.env`: `VITE_API_URL=https://your-service.onrender.com/api`
4. Update Vercel environment variables with the same URL

