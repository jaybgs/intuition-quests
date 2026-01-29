import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { completionService } from '../services/completionService.js';
import { XPService } from '../services/xpService.js';
import { UserService } from '../services/userService.js';

const router = Router();

// Initialize Supabase with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize services
const xpService = new XPService();
const userService = new UserService();

// Middleware to verify JWT and extract wallet address
const authenticateWallet = (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let walletAddress: string;

    // Try JWT verification first (if JWT_SECRET is available)
    if (process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (decoded.wallet) {
          walletAddress = decoded.wallet.toLowerCase();
          req.walletAddress = walletAddress;
          return next();
        }
      } catch (jwtError) {
        console.log('JWT verification failed, trying fallback token');
      }
    } else {
      console.log('No JWT_SECRET set, using fallback token authentication');
    }

    // Try fallback token (base64 encoded JSON)
    try {
      const decodedJson = JSON.parse(Buffer.from(token, 'base64').toString());
      if (decodedJson.address) {
        walletAddress = decodedJson.address.toLowerCase();
        console.log('✅ Using fallback token authentication for:', walletAddress);
      } else {
        throw new Error('No address in fallback token');
      }
    } catch (fallbackError) {
      console.error('Fallback token parsing failed:', fallbackError);
      return res.status(401).json({ error: 'Invalid token format' });
    }

    req.walletAddress = walletAddress;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Complete quest schema
const completeQuestSchema = z.object({
  questId: z.string().min(1), // Allow any non-empty string (supports both UUIDs and custom IDs)
});

// GET /api/quests/earnings/:walletAddress - Get user earnings for rewards page
router.get('/earnings/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get earnings from user_earnings table using the stored function
    const { data: earnings, error } = await supabase.rpc('get_user_earnings', {
      p_wallet_address: walletAddress
    });

    if (error) {
      console.error('Error fetching user earnings:', error);
      return res.status(500).json({ error: 'Failed to fetch earnings data' });
    }

    // If no earnings data exists, return zeros
    const userEarnings = earnings && earnings.length > 0 ? earnings[0] : {
      total_trust_earned: 0,
      quest_rewards: 0,
      staking_rewards: 0,
      referral_rewards: 0
    };

    res.json({
      success: true,
      earnings: {
        total: parseFloat(userEarnings.total_trust_earned || 0),
        quest: parseFloat(userEarnings.quest_rewards || 0),
        staking: parseFloat(userEarnings.staking_rewards || 0),
        referral: parseFloat(userEarnings.referral_rewards || 0)
      }
    });

  } catch (error) {
    console.error('Error in earnings endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/:questId/select-winners - Select winners for expired quest
router.post('/:questId/select-winners', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;
    const walletAddress = req.walletAddress;

    // Check if caller is quest creator (only creator can select winners)
    const { data: quest, error: questError } = await supabase
      .from('published_quests')
      .select('creator_address, status')
      .eq('id', questId)
      .single();

    if (questError || !quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    if (quest.creator_address !== walletAddress) {
      return res.status(403).json({ error: 'Only quest creator can select winners' });
    }

    if (quest.status !== 'expired') {
      return res.status(400).json({ error: 'Quest must be expired before selecting winners' });
    }

    // Select winners using stored function
    const { error: selectError } = await supabase.rpc('select_quest_winners', {
      p_quest_id: questId
    });

    if (selectError) {
      console.error('Error selecting winners:', selectError);
      return res.status(500).json({ error: 'Failed to select winners' });
    }

    // Get selected winners
    const { data: winners, error: winnersError } = await supabase
      .from('quest_winners')
      .select('wallet_address, reward_amount, reward_token')
      .eq('quest_id', questId)
      .order('rank');

    res.json({
      success: true,
      message: 'Winners selected successfully',
      winners: winners || []
    });

  } catch (error) {
    console.error('Error in select-winners endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quests/:questId/distribute-rewards - Distribute rewards to winners
router.post('/:questId/distribute-rewards', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;
    const { tx_hash } = req.body;
    const walletAddress = req.walletAddress;

    // Check if caller is quest creator
    const { data: quest, error: questError } = await supabase
      .from('published_quests')
      .select('creator_address, status')
      .eq('id', questId)
      .single();

    if (questError || !quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    if (quest.creator_address !== walletAddress) {
      return res.status(403).json({ error: 'Only quest creator can distribute rewards' });
    }

    if (quest.status !== 'distributing_rewards') {
      return res.status(400).json({ error: 'Winners must be selected before distributing rewards' });
    }

    // Distribute rewards and update earnings
    const { error: distributeError } = await supabase.rpc('distribute_quest_rewards', {
      p_quest_id: questId,
      p_tx_hash: tx_hash || null
    });

    if (distributeError) {
      console.error('Error distributing rewards:', distributeError);
      return res.status(500).json({ error: 'Failed to distribute rewards' });
    }

    res.json({
      success: true,
      message: 'Rewards distributed successfully'
    });

  } catch (error) {
    console.error('Error in distribute-rewards endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quests/:questId/winners - Get winners for a quest
router.get('/:questId/winners', async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;

    const { data: winners, error } = await supabase
      .from('quest_winners')
      .select('wallet_address, rank, reward_amount, reward_token, distributed, distributed_at')
      .eq('quest_id', questId)
      .order('rank');

    if (error) {
      console.error('Error fetching quest winners:', error);
      return res.status(500).json({ error: 'Failed to fetch winners' });
    }

    res.json({
      success: true,
      winners: winners || []
    });

  } catch (error) {
    console.error('Error in winners endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
  reward_type: z.enum(['iq_only', 'trust_only', 'trust_and_iq']).optional(),
  expiresAt: z.number().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  uniqueIdString: z.string().optional(),
  questVersion: z.number().optional(),
});

// GET /api/quests/:questId/completions - Get completions for a specific quest
/* ... existing code ... */

// POST /api/quests - Create/publish a new quest
router.post('/', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const validated = createQuestSchema.parse(req.body);
    const walletAddress = req.walletAddress || '';

    // Verify the quest creator matches the authenticated wallet (case-insensitive)
    console.log('--- Quest Creation Auth Check ---');
    console.log('Creator (Payload):', validated.creatorAddress);
    console.log('Wallet (Token):', walletAddress);
    console.log('Match?', validated.creatorAddress.toLowerCase() === walletAddress.toLowerCase());
    if (validated.creatorAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        error: 'Quest creator does not match authenticated wallet',
        details: `Expected ${walletAddress}, got ${validated.creatorAddress}`
      });
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
        reward_type: validated.reward_type || 'trust_and_iq',
        expires_at: validated.expiresAt || null,
        end_date: validated.endDate || null,
        end_time: validated.endTime || null,
        unique_id_string: validated.uniqueIdString || null,
        quest_version: validated.questVersion || 1,
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
    // Note: trust_earned is not set here - it will be set only when rewards are actually distributed
    // But iq_earned should be set immediately when quest is completed
    console.log('Attempting to save quest completion:', { walletAddress, questId });
    const { data: userQuestData, error: userQuestError } = await supabase
      .from('user_quests')
      .insert({
        wallet_address: walletAddress,
        quest_id: questId,
        iq_earned: 20, // IQ points awarded immediately upon completion
        // trust_earned will be set to 0 by default and updated later during reward distribution
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

    // Note: XP updates and earnings are handled separately
    // This keeps quest completion simple and focused on recording completion

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

// GET /api/quests/earnings/:walletAddress - Get user earnings for rewards page
router.get('/earnings/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    // Get earnings data from user_earnings table
    const { data: earnings, error: earningsError } = await supabase
      .from('user_earnings')
      .select('total_trust_earned, quest_rewards, staking_rewards, referral_rewards')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (earningsError && earningsError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user earnings:', earningsError);
      return res.status(500).json({ error: 'Failed to fetch earnings data' });
    }

    // If no earnings data exists yet, return zeros
    const earningsData = earnings || {
      total_trust_earned: 0,
      quest_rewards: 0,
      staking_rewards: 0,
      referral_rewards: 0
    };

    res.json({
      walletAddress: walletAddress.toLowerCase(),
      totalTrustEarned: parseFloat(earningsData.total_trust_earned || 0),
      questRewards: parseFloat(earningsData.quest_rewards || 0),
      stakingRewards: parseFloat(earningsData.staking_rewards || 0),
      referralRewards: parseFloat(earningsData.referral_rewards || 0)
    });
  } catch (error: any) {
    console.error('Error in earnings endpoint:', error);
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