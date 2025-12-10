import { Router, Request, Response } from 'express';
import { SupabaseSpaceService } from '../services/supabaseSpaceService.js';
import { authenticateWallet, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const spaceService = new SupabaseSpaceService();

// Validation schemas
const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  logo: z.string().optional(), // Can be URL or base64 data URI
  coverPhoto: z.string().optional(), // Can be URL or base64 data URI
  twitterUrl: z.string().url(),
  userType: z.enum(['project', 'user']),
  atomId: z.string().optional(),
  atomTransactionHash: z.string().optional(),
});

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  logo: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
});

// GET /api/spaces - Get all spaces
router.get('/', async (req: Request, res: Response) => {
  try {
    const spaces = await spaceService.getAllSpaces();
    res.json({ spaces });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spaces/search - Search spaces
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.json({ spaces: [] });
    }
    const spaces = await spaceService.searchSpaces(query);
    res.json({ spaces });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spaces/owner/:address - Get spaces by owner
router.get('/owner/:address', async (req: Request, res: Response) => {
  try {
    const spaces = await spaceService.getSpacesByOwner(req.params.address);
    res.json({ spaces });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spaces/slug/:slug - Get space by slug
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const space = await spaceService.getSpaceBySlug(req.params.slug);
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    res.json({ space });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spaces/:id - Get space by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const space = await spaceService.getSpaceById(req.params.id);
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    res.json({ space });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/spaces - Create new space
router.post('/', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = createSpaceSchema.parse(req.body);
    
    const space = await spaceService.createSpace({
      ...validated,
      ownerAddress: req.user.address,
    });

    res.status(201).json({ space });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/spaces/:id - Update space
router.put('/:id', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Verify space ownership
    const validated = updateSpaceSchema.parse(req.body);
    const space = await spaceService.updateSpace(req.params.id, validated);
    
    res.json({ space });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/spaces/:id - Delete space
router.delete('/:id', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Verify space ownership
    await spaceService.deleteSpace(req.params.id);
    res.json({ message: 'Space deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

