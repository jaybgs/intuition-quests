import { Router, Request, Response } from 'express';
import { QuestService } from '../services/questService';
import { CompletionService } from '../services/completionService';
import { authenticateWallet, AuthRequest } from '../middleware/auth';
import { RequirementType } from '../types';
import { z } from 'zod';

const router = Router();
const questService = new QuestService();
const completionService = new CompletionService();

// Validation schemas
const createQuestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  projectId: z.string().min(1),
  projectName: z.string().optional(),
  xpReward: z.number().int().positive(),
  trustReward: z.number().positive().optional(),
  requirements: z.array(z.object({
    type: z.string(),
    description: z.string(),
    verificationData: z.record(z.any()),
    order: z.number().optional(),
  })).optional().default([]),
  maxCompletions: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

const completeQuestSchema = z.object({
  verificationData: z.record(z.any()).optional(),
});

// GET /api/quests - Get all quests
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const quests = await questService.getAllQuests({
      status: status as any,
      projectId,
      limit,
      offset,
    });

    res.json({ quests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/quests/:id - Get quest by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const quest = await questService.getQuestById(req.params.id);
    res.json({ quest });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// POST /api/quests - Create new quest
router.post('/', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = createQuestSchema.parse(req.body);
    
    const quest = await questService.createQuest(req.user.address, {
      ...validated,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
      requirements: validated.requirements.map(req => ({
        ...req,
        type: req.type as RequirementType,
      })),
    });

    res.status(201).json({ quest });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/quests/:id - Update quest
router.put('/:id', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Verify quest ownership
    const quest = await questService.updateQuest(req.params.id, req.body);
    res.json({ quest });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/quests/:id - Delete quest
router.delete('/:id', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Verify quest ownership
    await questService.deleteQuest(req.params.id);
    res.json({ message: 'Quest deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/quests/:id/complete - Complete a quest
router.post('/:id/complete', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = completeQuestSchema.parse(req.body);

    const completion = await completionService.completeQuest({
      questId: req.params.id,
      userId: req.user.userId,
      verificationData: validated.verificationData,
    });

    res.json({ completion });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ error: error.message });
  }
});

// GET /api/quests/:id/completions - Get quest completions
router.get('/:id/completions', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const completions = await completionService.getQuestCompletions(req.params.id, limit);
    res.json({ completions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

