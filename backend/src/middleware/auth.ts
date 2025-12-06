import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService.js';

export interface AuthRequest extends Request {
  user?: {
    address: string;
    userId: string;
  };
}

const userService = new UserService();

/**
 * Middleware to verify wallet signature and authenticate user
 */
export async function authenticateWallet(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      address: string;
      userId?: string;
    };

    // Get or create user
    const user = await userService.getOrCreateUser(decoded.address);

    req.user = {
      address: user.address,
      userId: user.id,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid token', details: error.message });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (!process.env.JWT_SECRET) {
        // Continue without authentication if JWT_SECRET is not configured
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        address: string;
      };

      const user = await userService.getUserByAddress(decoded.address);

      if (user) {
        req.user = {
          address: user.address,
          userId: user.id,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
