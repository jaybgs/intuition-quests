# OAuth Setup with Supabase Auth

Your app now uses Supabase Auth for OAuth authentication. This is much simpler than the previous custom implementation!

## What's Changed

✅ **Removed**: Custom OAuth service, callback handling, token exchange
✅ **Added**: Supabase Auth integration with automatic OAuth flow
✅ **Simplified**: No need for frontend OAuth client IDs/secrets

## Setup Steps

### 1. Configure Supabase OAuth Providers

Follow the detailed guide in `SUPABASE_OAUTH_SETUP.md` to:
- Set up OAuth apps on Twitter, Discord, GitHub, Google
- Enable providers in your Supabase dashboard
- Configure redirect URLs

### 2. Update Environment Variables

**Frontend (.env):**
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (Render env vars):**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-jwt-secret
```

### 3. Test OAuth

1. Go to **Edit Profile** → **Social Connections**
2. Click **Connect** on any provider
3. Complete OAuth flow
4. Should redirect back and show as "connected"

## How It Works Now

1. **User clicks "Connect"** → Calls `supabase.auth.signInWithOAuth()`
2. **Supabase redirects** → User authenticates on provider
3. **Provider redirects back** → To `/auth/callback`
4. **Callback component** → Processes session and updates UI
5. **User is connected** → Profile shows connected status

## Benefits of Supabase Auth

- ✅ **Secure**: Supabase handles all OAuth complexity
- ✅ **Simple**: No manual token exchange needed
- ✅ **Managed**: Automatic session management
- ✅ **Multi-provider**: Easy to add more providers
- ✅ **Production-ready**: Built-in security features

## Troubleshooting

### "OAuth not working"
- Check Supabase dashboard → Auth → Providers are enabled
- Verify redirect URLs match your domain exactly
- Check browser console for errors

### "Invalid redirect URI"
- Ensure domain matches OAuth provider settings
- Use `https://` not `http://` in production

### "Provider not configured"
- Enable provider in Supabase Auth settings
- Enter correct Client ID/Secret from provider

## Adding More Providers

Supabase supports additional providers:
- Apple, Facebook, GitLab, Bitbucket, Azure, LinkedIn, etc.

Just enable them in Supabase dashboard and add the OAuth app configuration!

## Migration from Custom OAuth

If you had users with the old system:
- Old connections will be lost (different storage system)
- Users need to reconnect their social accounts
- No data migration needed - Supabase handles everything

Ready to test? Make sure your Supabase OAuth providers are configured and try connecting a social account! 🚀
