import { Router, Request, Response } from 'express';
import { XPService } from '../services/xpService';

const router = Router();
const xpService = new XPService();

// GET /api/leaderboard - Get leaderboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const leaderboard = await xpService.getLeaderboard(limit, offset);
    res.json({ leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

