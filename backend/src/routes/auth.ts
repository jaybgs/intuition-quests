import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyMessage } from 'viem';
import { z } from 'zod';
import { UserService } from '../services/userService.js';

const router = Router();
const userService = new UserService();

const loginSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string(),
  signature: z.string(),
});

// POST /api/auth/login - Authenticate with wallet signature
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { address, message, signature } = validated;

    // Verify signature (simplified - in production, use proper verification)
    // TODO: Implement proper signature verification with viem
    // const recoveredAddress = await verifyMessage({
    //   address: address as `0x${string}`,
    //   message,
    //   signature: signature as `0x${string}`,
    // });

    // For now, accept any signature (replace with actual verification)
    // if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Get or create user
    const user = await userService.getOrCreateUser(address);

    // Generate JWT token
    const token = jwt.sign(
      { address: user.address, userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { address: user.address, id: user.id } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/verify - Verify token
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      address: string;
      userId: string;
    };

    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
      }
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
});

export default router;
