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

// Create quest schema
const createQuestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  spaceId: z.string().optional(),
  xpReward: z.number(),
  requirements: z.array(z.any()),
  status: z.string(),
  createdAt: z.number(),
  startAt: z.number(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  creatorAddress: z.string(),
  atomId: z.string().optional(),
  atomTransactionHash: z.string().optional(),
  distributionType: z.string(),
  tripleId: z.string().optional(),
  tripleTransactionHash: z.string().optional(),
  image: z.string().optional(),
  iqPoints: z.number(),
  numberOfWinners: z.number(),
  winnerPrizes: z.array(z.any()),
  rewardDeposit: z.string().optional(),
  rewardToken: z.string().optional(),
  expiresAt: z.number().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
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

// POST /api/quests - Create/publish a new quest
router.post('/', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const validated = createQuestSchema.parse(req.body);
    const walletAddress = req.walletAddress;

    // Verify the quest creator matches the authenticated wallet
    if (validated.creatorAddress.toLowerCase() !== walletAddress) {
      return res.status(403).json({ error: 'Quest creator does not match authenticated wallet' });
    }

    // Insert quest into database
    const { data, error } = await supabase
      .from('quests')
      .insert({
        id: validated.id,
        title: validated.title,
        description: validated.description,
        project_id: validated.projectId || null,
        project_name: validated.projectName || null,
        space_id: validated.spaceId || null,
        xp_reward: validated.xpReward,
        requirements: validated.requirements,
        status: validated.status,
        created_at: new Date(validated.createdAt).toISOString(),
        start_at: new Date(validated.startAt).toISOString(),
        start_date: validated.startDate || null,
        start_time: validated.startTime || null,
        creator_address: validated.creatorAddress,
        atom_id: validated.atomId || null,
        atom_transaction_hash: validated.atomTransactionHash || null,
        distribution_type: validated.distributionType,
        triple_id: validated.tripleId || null,
        triple_transaction_hash: validated.tripleTransactionHash || null,
        image: validated.image || null,
        iq_points: validated.iqPoints,
        number_of_winners: validated.numberOfWinners,
        winner_prizes: validated.winnerPrizes,
        reward_deposit: validated.rewardDeposit || null,
        reward_token: validated.rewardToken || null,
        expires_at: validated.expiresAt ? new Date(validated.expiresAt).toISOString() : null,
        end_date: validated.endDate || null,
        end_time: validated.endTime || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating quest:', error);
      return res.status(500).json({ error: 'Failed to create quest', details: error.message });
    }

    console.log('✅ Quest created successfully:', data.id);
    res.json({ success: true, quest: data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating quest:', error);
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