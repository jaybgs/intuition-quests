# Supabase OAuth Setup Guide

This guide shows how to configure OAuth providers in Supabase for social authentication.

## Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **OAuth Applications**: Set up apps on each provider (see below)
3. **Custom Domain**: For production, use your custom domain

## 1. Configure Supabase Auth Settings

### Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Configure the settings below:

### Site URL
```
Site URL: https://yourdomain.com
```
Replace `yourdomain.com` with your actual domain.

### Redirect URLs
Add these redirect URLs:
```
https://yourdomain.com/auth/callback
https://your-project.supabase.co/auth/v1/callback
```

## 2. Configure OAuth Providers

### Twitter/X OAuth
1. **Go to**: https://developer.twitter.com/en/portal/dashboard
2. **Create App** or select existing
3. **App Settings**:
   - **App name**: Your app name
   - **Description**: Brief description
   - **Website URL**: `https://yourdomain.com`
4. **Authentication settings**:
   - **Type of App**: Web App
   - **App permissions**: Read
   - **Callback URLs**: `https://yourdomain.com/auth/callback`
5. **Copy credentials**:
   - **API Key** (Consumer Key)
   - **API Key Secret** (Consumer Secret)

### Discord OAuth
1. **Go to**: https://discord.com/developers/applications
2. **Create Application** or select existing
3. **OAuth2 Settings**:
   - **Redirects**: `https://yourdomain.com/auth/callback`
4. **Copy credentials**:
   - **Client ID**
   - **Client Secret**

### GitHub OAuth
1. **Go to**: https://github.com/settings/developers
2. **New OAuth App**:
   - **Application name**: Your app name
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/auth/callback`
3. **Copy credentials**:
   - **Client ID**
   - **Client Secret**

### Google OAuth
1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Create OAuth 2.0 Client ID**:
   - **Application type**: Web application
   - **Name**: Your app name
   - **Authorized redirect URIs**: `https://yourdomain.com/auth/callback`
3. **Copy credentials**:
   - **Client ID**
   - **Client Secret**

## 3. Enable Providers in Supabase

### Go to Authentication → Providers

For each provider, click **Enable** and enter:

### Twitter/X
- **Client ID**: Your Twitter API Key
- **Client Secret**: Your Twitter API Key Secret

### Discord
- **Client ID**: Your Discord Client ID
- **Client Secret**: Your Discord Client Secret

### GitHub
- **Client ID**: Your GitHub Client ID
- **Client Secret**: Your GitHub Client Secret

### Google
- **Client ID**: Your Google Client ID
- **Client Secret**: Your Google Client Secret

## 4. Test OAuth Flow

1. **Visit your site**: `https://yourdomain.com`
2. **Go to Profile** → **Edit Profile**
3. **Click "Connect"** on any social provider
4. **Complete OAuth flow** - you should be redirected back
5. **Check connection status** - should show as "connected"

## 5. Troubleshooting

### "Invalid redirect URI"
- Ensure your domain matches exactly in OAuth provider settings
- Check for `http` vs `https` mismatch

### "Client ID not configured"
- Verify credentials are entered correctly in Supabase
- Check that provider is enabled

### "CORS error"
- Update your backend CORS settings to allow your domain
- Check that `VITE_API_URL` points to your Render backend

### "OAuth callback failed"
- Check browser console for errors
- Verify `/auth/callback` route exists in your frontend
- Ensure Supabase URL is correct in environment variables

## 6. Production Considerations

### Custom Domain
- Use your actual domain, not `localhost`
- Ensure SSL certificate is configured
- Update all OAuth provider callback URLs

### Environment Variables
```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://api.yourdomain.com/api

# Backend (Render env vars)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Security
- Never commit OAuth secrets to version control
- Use environment variables for all sensitive data
- Regularly rotate OAuth credentials

## 7. Additional OAuth Providers

Supabase also supports:
- Apple
- Facebook
- GitLab
- Bitbucket
- Azure
- Keycloak
- LinkedIn

Configure them the same way by enabling in Supabase dashboard and setting up the OAuth app on the provider's side.

## Support

If you encounter issues:
1. Check Supabase Auth logs in your dashboard
2. Verify OAuth provider settings
3. Test with different browsers
4. Check browser developer tools for errors
