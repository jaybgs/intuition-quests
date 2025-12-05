# OAuth Setup Guide for Social Account Connections

This guide will walk you through setting up OAuth authentication for Twitter, Discord, GitHub, and Google (Gmail) so users can connect their real social accounts.

## Prerequisites

- A web server (for OAuth redirect URLs)
- Developer accounts on each platform you want to support

---

## 1. Twitter OAuth 2.0 Setup

### Step 1: Create Twitter Developer Account
1. Go to https://developer.twitter.com/
2. Sign in with your Twitter account
3. Apply for a developer account (if needed)

### Step 2: Create a Twitter App
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Click "Create App" or "Create Project"
3. Fill in:
   - **App name**: TrustQuests (or your app name)
   - **App description**: Your app description
   - **Website URL**: `https://yourdomain.com`
   - **Callback URLs**: `https://yourdomain.com/oauth/twitter/callback`
   - **App permissions**: Read (to read user profile)

### Step 3: Get OAuth 2.0 Credentials
1. In your app settings, go to "Keys and tokens"
2. Under "OAuth 2.0 Client ID and Client Secret":
   - Copy the **Client ID**
   - Copy the **Client Secret** (keep this secure!)

### Step 4: Add to Environment Variables
Add to `frontend/.env`:
```
VITE_TWITTER_CLIENT_ID=your_twitter_client_id_here
```

**Note**: For production, you'll also need the Client Secret on your backend.

---

## 2. Discord OAuth 2.0 Setup

### Step 1: Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "TrustQuests")
4. Click "Create"

### Step 2: Configure OAuth2
1. In your application, go to "OAuth2" → "General"
2. Add Redirect URL: `https://yourdomain.com/oauth/discord/callback`
3. Under "OAuth2 URL Generator":
   - Select scopes: `identify`, `email`
   - Copy the generated URL (contains client_id)

### Step 3: Get Client ID
1. In "OAuth2" → "General", copy the **Client ID**
2. Copy the **Client Secret** (keep secure!)

### Step 4: Add to Environment Variables
Add to `frontend/.env`:
```
VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
```

---

## 3. GitHub OAuth Setup

### Step 1: Create GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: TrustQuests
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/oauth/github/callback`
4. Click "Register application"

### Step 2: Get Client ID
1. On the app page, copy the **Client ID**
2. Generate a **Client Secret** (click "Generate a new client secret")
3. Copy the secret (you won't see it again!)

### Step 3: Add to Environment Variables
Add to `frontend/.env`:
```
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
```

---

## 4. Google OAuth Setup (for Gmail)

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Name it (e.g., "TrustQuests")

### Step 2: Enable Google+ API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "People API"
3. Click "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: TrustQuests
   - User support email: your email
   - Developer contact: your email
   - Save and continue through scopes
4. Create OAuth client:
   - Application type: **Web application**
   - Name: TrustQuests Web
   - Authorized redirect URIs: `https://yourdomain.com/oauth/google/callback`
   - Click "Create"

### Step 4: Get Client ID
1. Copy the **Client ID**
2. Copy the **Client Secret** (keep secure!)

### Step 5: Add to Environment Variables
Add to `frontend/.env`:
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

## 5. Backend Setup (Required for Production)

You'll need backend endpoints to handle OAuth callbacks and exchange authorization codes for access tokens.

### Required Backend Endpoints:

1. **POST /api/oauth/twitter/callback**
   - Receives authorization code
   - Exchanges code for access token
   - Gets user profile from Twitter API
   - Returns user data

2. **POST /api/oauth/discord/callback**
   - Similar flow for Discord

3. **POST /api/oauth/github/callback**
   - Similar flow for GitHub

4. **POST /api/oauth/google/callback**
   - Similar flow for Google

### Example Backend Implementation (Node.js/Express):

```javascript
// OAuth callback handler example
app.post('/api/oauth/twitter/callback', async (req, res) => {
  const { code } = req.body;
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID,
      client_secret: process.env.TWITTER_CLIENT_SECRET,
      redirect_uri: process.env.TWITTER_REDIRECT_URI,
      code_verifier: 'challenge', // Use PKCE in production
    }),
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Get user profile
  const userResponse = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  
  const userData = await userResponse.json();
  
  res.json({
    success: true,
    account: {
      platform: 'twitter',
      username: userData.data.username,
      id: userData.data.id,
    },
  });
});
```

---

## 6. Frontend Configuration

### Step 1: Create `.env` file
Create `frontend/.env` (or add to existing):

```env
# OAuth Client IDs
VITE_TWITTER_CLIENT_ID=your_twitter_client_id_here
VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Backend API URL (for OAuth callbacks)
VITE_API_URL=http://localhost:3000
```

### Step 2: Update OAuth Service
The OAuth service in `frontend/src/services/oauthService.ts` is already configured to use these environment variables.

### Step 3: Update Redirect URIs
Make sure the redirect URIs in your OAuth apps match:
- Development: `http://localhost:5173/oauth/{platform}/callback`
- Production: `https://yourdomain.com/oauth/{platform}/callback`

---

## 7. Local Development Setup

For local development, you can use:

1. **ngrok** or similar tunneling service:
   ```bash
   ngrok http 5173
   ```
   Use the ngrok URL for OAuth redirect URIs

2. **localhost with port forwarding**:
   - Use `http://localhost:5173/oauth/{platform}/callback`
   - Some OAuth providers allow localhost

---

## 8. Testing OAuth Flow

1. Start your frontend: `npm run dev`
2. Go to My Profile page
3. Click "Connect" on any social account
4. OAuth popup should open
5. Authorize the app
6. You should be redirected back and see your real account connected

---

## 9. Security Best Practices

1. **Never expose Client Secrets** in frontend code
   - Client secrets should only be on the backend
   - Frontend only needs Client IDs

2. **Use PKCE** (Proof Key for Code Exchange)
   - More secure for public clients
   - Already implemented in the OAuth service

3. **Validate state parameter**
   - Prevents CSRF attacks
   - State is included in OAuth URLs

4. **Store tokens securely**
   - Access tokens should be stored server-side
   - Use secure, httpOnly cookies if possible

5. **Set proper CORS headers** on backend

---

## 10. Troubleshooting

### "Invalid redirect URI"
- Make sure redirect URI in OAuth app matches exactly (including http/https, trailing slashes)
- Check both development and production URLs

### "Popup blocked"
- Browser may block popups
- User needs to allow popups for your domain

### "Client ID not found"
- Check `.env` file exists and has correct variable names
- Restart dev server after changing `.env`
- Make sure variables start with `VITE_`

### OAuth callback not working
- Check backend endpoint is running
- Verify redirect URI matches
- Check browser console for errors

---

## Quick Start (Demo Mode)

If you just want to test without full OAuth setup:
- The app will automatically use demo mode (prompts for username/email)
- No OAuth client IDs needed
- Users can manually enter their social account info

---

## Need Help?

- Twitter OAuth: https://developer.twitter.com/en/docs/authentication/oauth-2-0
- Discord OAuth: https://discord.com/developers/docs/topics/oauth2
- GitHub OAuth: https://docs.github.com/en/apps/oauth-apps
- Google OAuth: https://developers.google.com/identity/protocols/oauth2







