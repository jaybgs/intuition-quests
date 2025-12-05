# Complete OAuth Setup Guide - Step by Step

This guide will walk you through enabling social account connections (Twitter/X, Discord, Gmail, GitHub) for your TrustQuests dApp.

## What is OAuth?

OAuth lets users connect their social accounts to your app without giving you their passwords. When they click "Connect Twitter", they authorize your app to access their profile info.

---

## Overview: What You Need to Do

1. **Create OAuth apps** on each platform (Twitter, Discord, GitHub, Google)
2. **Get Client IDs** from each platform
3. **Add Client IDs** to your `.env` file
4. **Set up redirect URLs** in each OAuth app
5. **Restart your dev server**
6. **Test the connections**

---

## Step 1: Twitter/X OAuth Setup

### 1.1 Create Twitter Developer Account
1. Go to: https://developer.twitter.com/
2. Click "Sign up" or "Sign in"
3. If new, apply for a developer account (usually instant approval)

### 1.2 Create a Twitter App
1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Click **"Create Project"** or **"Create App"**
3. Fill in the form:
   - **Project name**: TrustQuests
   - **Use case**: Select "Making a bot" or "Exploring the API"
   - **Project description**: "A decentralized quest platform for social engagement"
   - Click **"Next"**

### 1.3 Configure Your App
1. **App name**: TrustQuests (or your preferred name)
2. **App description**: "Decentralized quest platform on 0xIntuition mainnet"
3. **Website URL**: 
   - For local: `http://localhost:5173`
   - For hosting: `https://your-app-name.vercel.app` (or your hosting URL)
4. **Callback URLs**: 
   - For local: `http://localhost:5173/oauth/twitter/callback`
   - For hosting: `https://your-app-name.vercel.app/oauth/twitter/callback`
   - **You can add BOTH URLs** (separate with commas or add multiple)
5. **App permissions**: Select **"Read"** (we only need to read profile info)
6. Click **"Create"**

### 1.4 Get Your OAuth Client ID
1. In your app dashboard, go to **"Keys and tokens"** tab
2. Scroll to **"OAuth 2.0 Client ID and Client Secret"**
3. Click **"Generate"** if you haven't already
4. Copy the **"Client ID"** (looks like: `aBc123XyZ...`)
5. **IMPORTANT**: Also copy the **"Client Secret"** (you'll need this for backend later, but keep it secret!)

### 1.5 Add to Your .env File
Open `frontend/.env` (create it if it doesn't exist) and add:
```
VITE_TWITTER_CLIENT_ID=your_client_id_here
```

---

## Step 2: Discord OAuth Setup

### 2.1 Create Discord Application
1. Go to: https://discord.com/developers/applications
2. Click **"New Application"**
3. Name it: **TrustQuests**
4. Click **"Create"**

### 2.2 Configure OAuth2
1. In the left sidebar, click **"OAuth2"**
2. Under **"Redirects"**, click **"Add Redirect"**
3. Add these URLs:
   - `http://localhost:5173/oauth/discord/callback`
   - `https://your-app-name.vercel.app/oauth/discord/callback` (if you have hosting)
4. Scroll to **"OAuth2 URL Generator"**
5. Select scopes:
   - ✅ **identify** (get username)
   - ✅ **email** (get email address)
6. Copy the generated URL (you'll see the client_id in it)

### 2.3 Get Your Client ID
1. In **"OAuth2"** → **"General"** section
2. Copy the **"Client ID"** (it's a long number like: `1443547800288624783`)
3. Copy the **"Client Secret"** (click "Reset Secret" if needed, keep it secret!)

### 2.4 Add to Your .env File
Add to `frontend/.env`:
```
VITE_DISCORD_CLIENT_ID=1443547800288624783
```

---

## Step 3: GitHub OAuth Setup

### 3.1 Create GitHub OAuth App
1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: TrustQuests
   - **Homepage URL**: 
     - Local: `http://localhost:5173`
     - Hosting: `https://your-app-name.vercel.app`
   - **Authorization callback URL**: 
     - Local: `http://localhost:5173/oauth/github/callback`
     - Hosting: `https://your-app-name.vercel.app/oauth/github/callback`
4. Click **"Register application"**

### 3.2 Get Your Client ID
1. On the app page, you'll see:
   - **Client ID** (copy this)
   - **Client Secret** (click "Generate a new client secret" if needed, copy it and keep it secret!)

### 3.3 Add to Your .env File
Add to `frontend/.env`:
```
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
```

---

## Step 4: Google OAuth Setup (for Gmail)

### 4.1 Create Google Cloud Project
1. Go to: https://console.cloud.google.com/
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Name it: **TrustQuests**
5. Click **"Create"**

### 4.2 Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in:
   - **App name**: TrustQuests
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On **"Scopes"** page, click **"Add or Remove Scopes"**
7. Select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
8. Click **"Update"** → **"Save and Continue"**
9. On **"Test users"** (if External), add your email for testing
10. Click **"Save and Continue"** → **"Back to Dashboard"**

### 4.3 Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Name it: **TrustQuests Web**
5. **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `https://your-app-name.vercel.app` (if you have hosting)
6. **Authorized redirect URIs**:
   - `http://localhost:5173/oauth/google/callback`
   - `https://your-app-name.vercel.app/oauth/google/callback`
7. Click **"Create"**

### 4.4 Get Your Client ID
1. A popup will show your **Client ID** and **Client Secret**
2. Copy the **Client ID**
3. Copy the **Client Secret** (keep it secret!)

### 4.5 Add to Your .env File
Add to `frontend/.env`:
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

## Step 5: Create/Update Your .env File

Create a file called `.env` in the `frontend` folder with this content:

```env
# OAuth Client IDs
VITE_TWITTER_CLIENT_ID=your_twitter_client_id_here
VITE_DISCORD_CLIENT_ID=1443547800288624783
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

**Replace the placeholder values with your actual Client IDs!**

---

## Step 6: Restart Your Dev Server

1. **Stop your current dev server** (press `Ctrl+C` in the terminal)
2. **Start it again**:
   ```bash
   npm run dev
   ```

**Important**: Environment variables are only loaded when the server starts, so you MUST restart after changing `.env`!

---

## Step 7: Test the Connections

1. **Start your app**: `npm run dev`
2. **Open your browser**: Go to `http://localhost:5173`
3. **Connect your wallet**
4. **Go to "My Profile"** (click your profile icon → "My Profile")
5. **Scroll to "Social Connections"** section
6. **Click "Connect"** on any social account:
   - A popup window should open
   - You'll be asked to authorize the app
   - After authorizing, you'll be redirected back
   - Your account should show as "Connected"

---

## Troubleshooting

### "Invalid redirect URI" Error
- **Problem**: The callback URL doesn't match what you set in the OAuth app
- **Solution**: 
  - Check the exact URL in your OAuth app settings
  - Make sure it matches exactly (including `http://` vs `https://`, no trailing slashes)
  - For localhost, use: `http://localhost:5173/oauth/{platform}/callback`

### "Popup blocked" Error
- **Problem**: Browser is blocking the OAuth popup
- **Solution**: 
  - Allow popups for `localhost:5173`
  - Or use the browser's popup blocker settings

### "Client ID not found"
- **Problem**: Environment variable not loaded
- **Solution**:
  - Make sure `.env` file is in the `frontend` folder
  - Make sure variable names start with `VITE_`
  - Restart your dev server after changing `.env`

### OAuth popup opens but nothing happens
- **Problem**: Backend callback handler not set up
- **Solution**: 
  - For now, the app uses "demo mode" (prompts for username)
  - For full OAuth, you need backend endpoints (see next section)

---

## Important Notes

### Client Secrets
- **Client Secrets** should NEVER be in your frontend code
- They should only be on your backend server
- The frontend only needs Client IDs

### Backend Setup (For Full OAuth)
Currently, the OAuth service will:
- **If Client IDs are set**: Try to open OAuth popup
- **If no Client IDs**: Use demo mode (prompts for username)

For **full OAuth** to work, you need backend endpoints to:
1. Handle the OAuth callback
2. Exchange authorization code for access token
3. Get user profile from the platform API
4. Return user data to frontend

This requires backend setup (see `OAUTH_SETUP_GUIDE.md` for backend implementation).

### Demo Mode
If OAuth isn't fully set up, the app will automatically use "demo mode" where users can manually enter their username/email. This is fine for testing!

---

## Quick Checklist

- [ ] Twitter OAuth app created
- [ ] Twitter Client ID added to `.env`
- [ ] Discord OAuth app created
- [ ] Discord Client ID added to `.env`
- [ ] GitHub OAuth app created
- [ ] GitHub Client ID added to `.env`
- [ ] Google OAuth app created
- [ ] Google Client ID added to `.env`
- [ ] `.env` file created in `frontend` folder
- [ ] Dev server restarted
- [ ] Tested connection on My Profile page

---

## Next Steps

Once basic OAuth is working:
1. Set up backend endpoints for OAuth callbacks
2. Store access tokens securely
3. Implement actual verification of social tasks
4. Add error handling and user feedback

Good luck! 🚀







