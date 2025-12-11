import { Router } from 'express';
import { z } from 'zod';
import { authenticateWallet, AuthRequest } from '../middleware/auth.js';
import { questDraftService } from '../services/questDraftService.js';

const router = Router();

const saveDraftSchema = z.object({
  id: z.string().min(1),
  space_id: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image_preview: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  selected_actions: z.any().optional(),
  number_of_winners: z.string().optional().nullable(),
  winner_prizes: z.any().optional(),
  iq_points: z.string().optional().nullable(),
  reward_deposit: z.string().optional().nullable(),
  reward_token: z.string().optional().nullable(),
  distribution_type: z.string().optional().nullable(),
  current_step: z.number().int().positive().optional(),
});

// POST /api/quest-drafts - create or update a draft
router.post('/', authenticateWallet, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = saveDraftSchema.parse(req.body);
    await questDraftService.saveDraft({
      ...validated,
      user_address: req.user.address.toLowerCase(),
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message || 'Failed to save quest draft' });
  }
});

// GET /api/quest-drafts - list drafts for user
router.get('/', authenticateWallet, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const spaceId = req.query.spaceId as string | undefined;
    const drafts = await questDraftService.getAllDraftsForUser(req.user.address, spaceId);
    res.json({ drafts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch quest drafts' });
  }
});

// GET /api/quest-drafts/:id - get single draft
router.get('/:id', authenticateWallet, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const draft = await questDraftService.getDraftById(req.params.id, req.user.address);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.json({ draft });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch quest draft' });
  }
});

// DELETE /api/quest-drafts/:id - delete draft
router.delete('/:id', authenticateWallet, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await questDraftService.deleteDraft(req.params.id, req.user.address);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete quest draft' });
  }
});

export default router;


