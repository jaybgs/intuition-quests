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

// Complete quest schema
const completeQuestSchema = z.object({
  questId: z.string().uuid(),
});

// GET /api/quests/completions/:walletAddress - Get completed quests for wallet
router.get('/completions/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const { data, error } = await supabase
      .from('user_quests')
      .select('quest_id, completed_at')
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch quest completions' });
    }

    res.json({ completions: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/quests/complete - Complete a quest for authenticated wallet
router.post('/complete', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const validated = completeQuestSchema.parse(req.body);
    const { questId } = validated;
    const walletAddress = req.walletAddress;

    // Check if already completed
    const { data: existing } = await supabase
      .from('user_quests')
      .select('quest_id')
      .eq('wallet_address', walletAddress)
      .eq('quest_id', questId)
      .single();

    if (existing) {
      return res.json({ success: true, message: 'Quest already completed' });
    }

    // Insert completion
    const { error } = await supabase
      .from('user_quests')
      .insert({
        wallet_address: walletAddress,
        quest_id: questId
      });

    if (error) {
      return res.status(500).json({ error: 'Failed to complete quest' });
    }

    res.json({ success: true, message: 'Quest completed successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/quests/stats/:walletAddress - Get quest stats for wallet
router.get('/stats/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const { count, error } = await supabase
      .from('user_quests')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch quest stats' });
    }

    res.json({
      totalCompleted: count || 0,
      walletAddress: walletAddress.toLowerCase()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;