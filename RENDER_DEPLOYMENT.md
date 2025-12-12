# Render Deployment Guide

This guide explains how to deploy your Intuition Quests app to Render.

## Prerequisites

1. **GitHub Repository**: Your code must be pushed to GitHub
2. **OAuth Applications**: Set up OAuth apps on the respective platforms

## OAuth Setup

### Twitter/X OAuth
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app or use existing one
3. Go to "Keys and tokens" tab
4. Copy:
   - **Client ID** (not API Key)
   - **Client Secret**
5. Set callback URL: `https://intuition-quests-frontend.onrender.com/oauth/twitter/callback`

### Discord OAuth
1. Go to https://discord.com/developers/applications
2. Create new application or select existing
3. Go to "OAuth2" section
4. Copy:
   - **Client ID**
   - **Client Secret**
5. Add redirect URI: `https://intuition-quests-frontend.onrender.com/oauth/discord/callback`

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill application details
4. Set Authorization callback URL: `https://intuition-quests-frontend.onrender.com/oauth/github/callback`
5. Copy:
   - **Client ID**
   - **Client Secret**

### Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Set application type to "Web application"
4. Add authorized redirect URIs:
   - `https://intuition-quests-frontend.onrender.com/oauth/google/callback`
5. Copy:
   - **Client ID**
   - **Client Secret**

## Render Deployment

### 1. Connect to Render

1. Go to https://render.com
2. Connect your GitHub account
3. Import your repository: `jaybgs/intuition-quests`

### 2. Deploy Backend Service

1. **Service Type**: Web Service
2. **Name**: `intuition-quests-backend`
3. **Environment**: Node
4. **Root Directory**: `backend`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm start`

### 3. Backend Environment Variables

In Render dashboard, set these environment variables for the backend:

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Secrets (from step above)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT Secret (generate a new random string)
JWT_SECRET=your-random-jwt-secret

# RPC and Contract Addresses (if needed)
RPC_URL=https://rpc.intuition.systems
TRUST_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
```

### 4. Deploy Frontend Service

1. **Service Type**: Web Service
2. **Name**: `intuition-quests-frontend`
3. **Environment**: Node
4. **Root Directory**: `frontend`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run preview`

### 5. Frontend Environment Variables

In Render dashboard, set these environment variables for the frontend:

```bash
# API URL (update with your backend URL)
VITE_API_URL=https://intuition-quests-backend.onrender.com/api

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OAuth Client IDs (from step above)
VITE_TWITTER_CLIENT_ID=your-twitter-client-id
VITE_DISCORD_CLIENT_ID=your-discord-client-id
VITE_GITHUB_CLIENT_ID=your-github-client-id
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Alternative: Manual Deployment

If you prefer to deploy manually:

### Backend Deployment
```bash
cd backend
npm install
npm run build
npm start
```

### Frontend Deployment
```bash
cd frontend
npm install
npm run build
npm run preview
```

## Troubleshooting

### Build Errors
- **TypeScript errors**: Make sure `@types/*` packages are in `backend/package.json` dependencies
- **Missing dependencies**: Check that all required packages are installed

### Runtime Errors
- **OAuth not working**: Verify callback URLs match the frontend domain
- **API connection failed**: Check `VITE_API_URL` points to the correct backend URL
- **Database errors**: Verify Supabase credentials are correct

### Common Issues
- **Popup blocked**: OAuth popups might be blocked by browser extensions
- **CORS errors**: Backend must allow requests from frontend domain
- **Environment variables**: Must be set in Render dashboard, not in local `.env` files

## Post-Deployment

1. **Test OAuth**: Try connecting social accounts
2. **Test API**: Verify quests load and save properly
3. **Test Wallet**: Connect wallet and complete a quest
4. **Monitor Logs**: Check Render logs for any errors

## URLs

After deployment, your app will be available at:
- **Frontend**: `https://intuition-quests-frontend.onrender.com`
- **Backend API**: `https://intuition-quests-backend.onrender.com/api`

Make sure to update the OAuth callback URLs with your actual Render domains.
