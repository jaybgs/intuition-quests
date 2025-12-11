# Render Deployment Guide

This guide will help you deploy the backend API to Render.

## Prerequisites

1. A GitHub account with your code pushed to a repository
2. A Render account (sign up at https://render.com)
3. Your Supabase credentials

## Step 1: Push Code to GitHub

Make sure your backend code is pushed to GitHub:

```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

## Step 2: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository
5. Configure the service:

### Basic Settings:
- **Name**: `intuition-quests-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Environment Variables:

Click **"Environment"** tab and add these variables:

**Required:**
- `NODE_ENV` = `production`
- `JWT_SECRET` = `[Generate a strong random string - keep this secret!]`
- `SUPABASE_URL` = `[Your Supabase project URL]`
- `SUPABASE_SERVICE_ROLE_KEY` = `[Your Supabase service role key]`

**Optional (with defaults):**
- `RPC_URL` = `https://rpc.intuition.systems`
- `TRUST_TOKEN_ADDRESS` = `0x0000000000000000000000000000000000000000`

**OAuth (if using):**
- `TWITTER_CLIENT_ID` = `[Your Twitter OAuth client ID]`
- `TWITTER_CLIENT_SECRET` = `[Your Twitter OAuth secret]`
- `DISCORD_CLIENT_ID` = `[Your Discord OAuth client ID]`
- `DISCORD_CLIENT_SECRET` = `[Your Discord OAuth secret]`
- `GITHUB_CLIENT_ID` = `[Your GitHub OAuth client ID]`
- `GITHUB_CLIENT_SECRET` = `[Your GitHub OAuth secret]`
- `GOOGLE_CLIENT_ID` = `[Your Google OAuth client ID]`
- `GOOGLE_CLIENT_SECRET` = `[Your Google OAuth secret]`

### Generate JWT_SECRET:

You can generate a secure JWT secret using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use an online generator: https://generate-secret.vercel.app/64

## Step 3: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the TypeScript code
   - Start the server

3. Wait for deployment to complete (usually 2-5 minutes)

## Step 4: Get Your Backend URL

Once deployed, Render will provide a URL like:
- `https://intuition-quests-backend.onrender.com`

**Note:** Free tier services spin down after 15 minutes of inactivity. The first request after spin-down may take 30-60 seconds.

## Step 5: Update Frontend

Update your frontend `.env` file (or Vercel environment variables):

```env
VITE_API_URL=https://your-backend-name.onrender.com/api
```

**For Vercel:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add/update `VITE_API_URL` = `https://your-backend-name.onrender.com/api`
4. Redeploy your frontend

## Step 6: Update CORS (if needed)

If your frontend URL is different from `trustquests.com`, you may need to update CORS in `backend/src/index.ts` to include your Vercel URL.

## Step 7: Test

1. Visit: `https://your-backend-name.onrender.com/health`
   - Should return: `{"status":"ok","message":"TrustQuests API is running"}`

2. Test from your frontend:
   - Connect wallet
   - Try creating a quest
   - Check browser console for any errors

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run build` locally

### 401 Unauthorized Errors
- Verify `JWT_SECRET` is set correctly
- Check that frontend is calling the correct backend URL
- Ensure wallet authentication is working

### CORS Errors
- Add your frontend URL to `allowedOrigins` in `backend/src/index.ts`
- Redeploy backend after CORS changes

### Service Spins Down (Free Tier)
- First request after 15 min inactivity will be slow (cold start)
- Consider upgrading to paid plan for always-on service
- Or use a service like UptimeRobot to ping your service every 5 minutes

## Upgrading to Paid Plan (Optional)

For production, consider upgrading to a paid plan ($7/month):
- Always-on service (no spin-down)
- Better performance
- More resources

## Monitoring

Render provides:
- **Logs**: View real-time logs in dashboard
- **Metrics**: CPU, memory, request metrics
- **Events**: Deployment history

## Next Steps

1. ✅ Backend deployed to Render
2. ✅ Frontend updated with new API URL
3. ✅ Test quest creation
4. ✅ Monitor logs for errors
5. ✅ Set up monitoring/alerting (optional)

