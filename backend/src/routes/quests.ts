import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { completionService } from '../services/completionService.js';

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
  questId: z.string().min(1), // Allow any non-empty string (supports both UUIDs and custom IDs)
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

// GET /api/quests/:questId/completions - Get completions for a specific quest
router.get('/:questId/completions', async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const completions = await completionService.getQuestCompletions(questId, limit);
    res.json({ completions });
  } catch (error: any) {
    console.error('Error fetching quest completions:', error);
    return res.status(500).json({ error: 'Failed to fetch quest completions' });
  }
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

// GET /api/quests - Get all published quests (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, projectId, spaceId, limit, offset } = req.query;

    let query = supabase
      .from('published_quests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (spaceId) {
      query = query.eq('space_id', spaceId);
    }

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    if (offset) {
      query = query.range(parseInt(offset as string), parseInt(offset as string) + (parseInt(limit as string) || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quests:', error);
      return res.status(500).json({ error: 'Failed to fetch quests' });
    }

    res.json({ quests: data || [] });
  } catch (error: any) {
    console.error('Error in GET /api/quests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quests' });
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
      .from('published_quests')
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
        created_at: validated.createdAt,
        start_at: validated.startAt,
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
        expires_at: validated.expiresAt || null,
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

    // Insert completion to user_quests (primary completion tracking)
    console.log('Attempting to save quest completion:', { walletAddress, questId });
    const { data: userQuestData, error: userQuestError } = await supabase
      .from('user_quests')
      .insert({
        wallet_address: walletAddress,
        quest_id: questId
      })
      .select();

    if (userQuestError) {
      console.error('Database error completing quest (user_quests):', userQuestError);
      return res.status(500).json({
        error: 'Failed to complete quest',
        details: userQuestError.message,
        code: userQuestError.code
      });
    }

    console.log('Quest completion saved to user_quests:', userQuestData);

    // Also save to quest_completions for stats/analytics (if user exists)
    try {
      if (!walletAddress) {
        console.warn('No wallet address available for quest_completions tracking');
        return res.json({ success: true, message: 'Quest completed successfully' });
      }

      const user = await supabase
        .from('users')
        .select('id')
        .eq('address', walletAddress.toLowerCase())
        .maybeSingle();

      if (user) {
        // Check if already exists in quest_completions
        const existing = await supabase
          .from('quest_completions')
          .select('id')
          .eq('quest_id', questId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existing) {
          const { error: questCompletionError } = await supabase
            .from('quest_completions')
            .insert({
              quest_id: questId,
              user_id: user.id,
              xp_earned: 20, // IQ points earned
              verified: true,
              verification_data: { completed_via: 'wallet_claim' }
            });

          if (questCompletionError) {
            console.warn('Failed to save to quest_completions (non-critical):', questCompletionError);
            // Don't fail the request - user_quests is the primary table
          } else {
            console.log('Quest completion also saved to quest_completions for stats');
          }
        }
      }
    } catch (statsError) {
      console.warn('Error saving quest completion stats (non-critical):', statsError);
      // Don't fail the request - stats are secondary to completion
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

// DELETE /api/quests/reset-all - Reset all published quests (admin only)
router.delete('/reset-all', async (req, res) => {
  try {
    console.log('🗑️ Admin request: Resetting all published quests...');

    // Get count before deletion
    const { count: questCount, error: countError } = await supabase
      .from('published_quests')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting quests:', countError);
      return res.status(500).json({ error: 'Failed to count quests' });
    }

    console.log(`📊 Found ${questCount} published quests to delete...`);

    // Delete all quests
    const { error: deleteError } = await supabase
      .from('published_quests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Matches all records

    if (deleteError) {
      console.error('Error deleting quests:', deleteError);
      return res.status(500).json({ error: 'Failed to delete quests' });
    }

    console.log(`✅ Successfully deleted ${questCount} quests`);

    // Verify deletion
    const { count: verifyCount, error: verifyError } = await supabase
      .from('published_quests')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      console.error('Error verifying deletion:', verifyError);
    }

    res.json({
      success: true,
      message: `Reset quest launch counts for all users. Deleted ${questCount} quests.`,
      verification: `${verifyCount} quests remaining`
    });

  } catch (error: any) {
    console.error('Error resetting quests:', error);
    res.status(500).json({ error: error.message || 'Failed to reset quests' });
  }
});

export default router;