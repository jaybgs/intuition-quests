import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

// Supabase service client (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// JWT secret for verifying state parameter
const JWT_SECRET = process.env.JWT_SECRET!;

// Encrypt tokens for storage
function encryptToken(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('social-tokens'));
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
}

// Decrypt tokens for use
export function decryptToken(encryptedText: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const tag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from('social-tokens'));
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Verify and decode state parameter
function verifyAndDecodeState(state: string): { walletAddress: string; nonce: string } {
  try {
    const decoded = jwt.verify(state, JWT_SECRET) as any;
    return {
      walletAddress: decoded.walletAddress,
      nonce: decoded.nonce
    };
  } catch (error) {
    throw new Error('Invalid state parameter');
  }
}

// POST /api/social/connect - Initiate social connection
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { provider, walletAddress } = req.body;

    if (!['google', 'discord', 'github', 'twitter'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Verify user is authenticated with wallet
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.address.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Wallet address mismatch' });
    }

    // Create state parameter with wallet address and nonce
    const state = jwt.sign(
      {
        walletAddress: walletAddress.toLowerCase(),
        nonce: crypto.randomBytes(16).toString('hex'),
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Generate OAuth URL (this would typically redirect, but we'll return the URL)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/social-callback`;

    // In a real implementation, you'd redirect to Supabase OAuth URL
    // For now, return the state for the frontend to use
    res.json({
      state,
      redirectUrl,
      provider
    });

  } catch (error: any) {
    console.error('Social connect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/social/callback - Handle OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=${oauthError}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=missing_code_or_state`);
    }

    // 1. Exchange code for Supabase session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code as string);

    if (error || !data.session) {
      console.error('OAuth exchange error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=oauth_exchange_failed`);
    }

    const user = data.user;
    const session = data.session;

    // 2. Extract verified social identity
    const identity = user.identities?.[0];
    if (!identity) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=no_identity_found`);
    }

    // 3. Verify and decode state to get wallet address
    const stateData = verifyAndDecodeState(state as string);

    // 4. Encrypt tokens for storage
    const encryptedAccessToken = encryptToken(session.access_token);
    const encryptedRefreshToken = session.refresh_token ? encryptToken(session.refresh_token) : null;

    // 5. Store social connection with tokens
    const { error: insertError } = await supabase.from('wallet_socials').upsert({
      wallet_address: stateData.walletAddress,
      provider: identity.provider,
      provider_user_id: identity.id,
      provider_username: identity.identity_data?.user_name || identity.identity_data?.name,
      provider_data: identity.identity_data,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: new Date(session.expires_at! * 1000).toISOString(),
      verified_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=database_error`);
    }

    // 6. Clean up temporary Supabase user
    try {
      await supabase.auth.admin.deleteUser(user.id);
    } catch (deleteError) {
      console.warn('Failed to delete temporary user:', deleteError);
      // Don't fail the whole flow for this
    }

    // 7. Redirect back to dashboard with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?social_connected=${identity.provider}`);

  } catch (error: any) {
    console.error('Social callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=callback_failed`);
  }
});

// GET /api/social/connections - Get user's social connections
router.get('/connections', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const walletAddress = decoded.address;

    const { data, error } = await supabase
      .from('wallet_socials')
      .select('provider, provider_username, verified_at')
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) {
      throw error;
    }

    res.json({ connections: data || [] });

  } catch (error: any) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
