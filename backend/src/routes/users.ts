import { Router, Request, Response } from 'express';
import { XPService } from '../services/xpService.js';
import { CompletionService } from '../services/completionService.js';
import { BlockchainService } from '../services/blockchainService.js';
import { UserService } from '../services/userService.js';
import { supabase } from '../config/supabase.js';
import { authenticateWallet, AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();
const xpService = new XPService();
const completionService = new CompletionService();
const blockchainService = new BlockchainService();
const userService = new UserService();

// GET /api/users/:address/xp - Get user XP
router.get('/:address/xp', optionalAuth, async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const xp = await xpService.getUserXP(address);
    
    if (!xp) {
      return res.json({
        totalXP: 0,
        level: 1,
        questsCompleted: 0,
        claimsStaked: 0,
        tradeVolume: 0,
      });
    }

    res.json({
      totalXP: xp.totalXP,
      level: xp.level,
      questsCompleted: xp.questsCompleted,
      claimsStaked: xp.claimsStaked,
      tradeVolume: xp.tradeVolume.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:address/completions - Get user quest completions
router.get('/:address/completions', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserByAddress(req.params.address.toLowerCase());

    if (!user) {
      return res.json({ completions: [] });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const completions = await completionService.getUserCompletions(user.id, limit);
    
    res.json({ completions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:address/completions/count - Get count of quest completions
router.get('/:address/completions/count', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserByAddress(req.params.address.toLowerCase());

    if (!user) {
      return res.json({ count: 0 });
    }

    const { count, error: countError } = await supabase
      .from('quest_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (countError) {
      throw new Error(countError.message);
    }
    
    res.json({ count: count || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:address/trust-balance - Get trust token balance
router.get('/:address/trust-balance', async (req: Request, res: Response) => {
  try {
    const address = req.params.address as `0x${string}`;
    const balance = await blockchainService.getTrustBalance(address);
    res.json({ balance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:address/rank - Get user rank
router.get('/:address/rank', async (req: Request, res: Response) => {
  try {
    const rank = await xpService.getUserRank(req.params.address);
    res.json({ rank });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:address/username - Update username
router.put('/:address/username', optionalAuth, async (req: Request, res: Response) => {
  try {
    const address = req.params.address.toLowerCase();
    const { username } = req.body;

    console.log(`[Users Route] Update username request for ${address}:`, username);

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      console.log('[Users Route] Validation failed: username is empty');
      return res.status(400).json({ error: 'Username is required' });
    }

    const trimmedUsername = username.trim();

    // Check if username is already taken
    console.log(`[Users Route] Checking if username "${trimmedUsername}" is taken`);
    const isTaken = await userService.isUsernameTaken(trimmedUsername, address);
    if (isTaken) {
      console.log(`[Users Route] Username "${trimmedUsername}" is already taken`);
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Update username
    console.log(`[Users Route] Updating username to "${trimmedUsername}"`);
    const user = await userService.updateUsername(address, trimmedUsername);

    console.log(`[Users Route] Username updated successfully: ${user.username}`);
    res.json({ username: user.username });
  } catch (error: any) {
    console.error('[Users Route] Error updating username:', error);
    console.error('[Users Route] Error stack:', error.stack);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.message?.includes('username')) {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    res.status(500).json({ error: error.message || 'Failed to update username' });
  }
});

export default router;
