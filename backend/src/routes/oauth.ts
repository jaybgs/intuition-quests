import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

// Initialize Supabase with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string()
});

// Helper to verify and decode state parameter
function verifyAndDecodeState(state: string): string {
  try {
    // Decode base64 state parameter containing wallet address
    const decoded = Buffer.from(state, 'base64').toString();
    // In production, verify signature here
    return decoded;
  } catch (error) {
    throw new Error('Invalid state parameter');
  }
}

// POST /api/oauth/callback - Handle OAuth callback from social providers
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = oauthCallbackSchema.parse(req.query);

    // 1. Exchange OAuth code for Supabase session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('OAuth exchange error:', error);
      return res.status(400).json({ error: 'Failed to exchange OAuth code' });
    }

    const user = data.user;
    const session = data.session;

    // 2. Extract social identity data
    const identity = user.identities?.[0];
    if (!identity) {
      return res.status(400).json({ error: 'No social identity found' });
    }

    // 3. Decode wallet address from state
    const walletAddress = verifyAndDecodeState(state);

    // 4. Store social connection linked to wallet
    const { error: insertError } = await supabase
      .from('wallet_socials')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        provider: identity.provider,
        provider_user_id: identity.id,
        provider_username: identity.identity_data?.user_name || identity.identity_data?.name,
        provider_data: identity.identity_data,
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        verified_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ error: 'Failed to store social connection' });
    }

    // 5. Clean up temporary Supabase user
    await supabase.auth.admin.deleteUser(user.id);

    // 6. Return success
    res.json({
      success: true,
      provider: identity.provider,
      wallet_address: walletAddress
    });

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message || 'OAuth callback failed' });
  }
});

// GET /api/oauth/social-connections/:walletAddress - Get connected social accounts
router.get('/social-connections/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const { data, error } = await supabase
      .from('wallet_socials')
      .select('provider, provider_username, verified_at')
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch social connections' });
    }

    res.json({ connections: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
