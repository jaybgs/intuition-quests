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

// Middleware to verify JWT and extract wallet address
const authenticateWallet = (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.wallet) {
      return res.status(401).json({ error: 'Invalid token: no wallet address' });
    }

    req.walletAddress = decoded.wallet.toLowerCase();
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Social verification schema
const socialVerificationSchema = z.object({
  provider: z.enum(['twitter', 'discord', 'github', 'google']),
  action: z.string(), // 'follow', 'join_server', 'star_repo', etc.
  params: z.record(z.any()), // Additional parameters for the action
});

// GET /api/social/connections/:walletAddress - Get connected social accounts
router.get('/connections/:walletAddress', async (req: Request, res: Response) => {
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

// POST /api/social/verify - Verify social task completion
router.post('/verify', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const validated = socialVerificationSchema.parse(req.body);
    const { provider, action, params } = validated;
    const walletAddress = req.walletAddress;

    // Get stored connection for this wallet and provider
    const { data: connection, error: fetchError } = await supabase
      .from('wallet_socials')
      .select('access_token, refresh_token, token_expires_at, provider_user_id, provider_username')
      .eq('wallet_address', walletAddress)
      .eq('provider', provider)
      .single();

    if (fetchError || !connection) {
      return res.status(404).json({
        success: false,
        completed: false,
        error: `No ${provider} connection found for this wallet`
      });
    }

    // TODO: Implement actual social media API verification
    // For now, return a placeholder response
    const verificationResult = {
      success: false,
      completed: false,
      error: `${provider} ${action} verification not implemented yet`
    };

    res.json(verificationResult);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/social/connect - Connect social account (placeholder for future OAuth)
router.post('/connect', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    const walletAddress = req.walletAddress;

    // TODO: Implement OAuth flow for social account connection
    // For now, return placeholder response
    res.json({
      success: false,
      error: `${provider} OAuth connection not implemented yet`,
      walletAddress
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
