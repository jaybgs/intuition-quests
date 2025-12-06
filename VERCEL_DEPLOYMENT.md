# Vercel Deployment Configuration

## Option 1: Set Root Directory in Vercel Dashboard (Recommended)

1. Go to your Vercel project settings
2. Navigate to **Settings** → **General**
3. Under **Root Directory**, set it to: `frontend`
4. Save the settings
5. Update `vercel.json` to:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Option 2: Use Current Configuration

The current `vercel.json` uses `--prefix` flag which should work. If it doesn't, try Option 1.

## Environment Variables Required

Make sure these are set in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Any other `VITE_*` variables your app needs

## Build Settings (if Root Directory is set to `frontend`)

- **Build Command**: `npm run build` (or leave empty, Vercel will auto-detect)
- **Output Directory**: `dist` (or leave empty, Vercel will auto-detect)
- **Install Command**: `npm install` (or leave empty, Vercel will auto-detect)

