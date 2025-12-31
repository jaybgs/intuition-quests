/**
 * Subscription Routes
 * Handles pro subscription payments and management
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateWallet, AuthRequest } from '../middleware/auth.js';
import { proSubscriptionService } from '../services/proSubscriptionService.js';

const router = Router();

/**
 * POST /api/subscription/pro-payment
 * Save pro subscription payment to database
 */
router.post('/pro-payment', authenticateWallet, [
  body('txHash').isString().notEmpty(),
  body('amount').isString().notEmpty(),
  body('timestamp').isISO8601()
], async (req: AuthRequest, res: Response) => {
  try {
    // Check validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const authenticatedWallet = req.user?.address!;
    const { txHash, amount, timestamp } = req.body;

    console.log('💰 Processing pro payment for:', authenticatedWallet, 'TX:', txHash);

    // Use the authenticated wallet address
    const walletAddress = authenticatedWallet;

    console.log('💾 Saving pro payment to database:', {
      walletAddress,
      txHash,
      amount,
      timestamp
    });

    // Save to database
    const result = await proSubscriptionService.saveProUser({
      wallet_address: walletAddress.toLowerCase(),
      payment_tx_hash: txHash,
      payment_amount: amount,
      payment_timestamp: timestamp,
      plan_type: 'pro',
      status: 'active'
    });

    if (!result.success) {
      console.error('❌ Failed to save pro payment:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save subscription data'
      });
    }

    console.log('✅ Pro payment saved successfully');
    res.json({
      success: true,
      message: 'Pro subscription activated successfully'
    });

  } catch (error: any) {
    console.error('❌ Pro payment API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/subscription/status
 * Check if user has active pro subscription
 */
router.get('/status', authenticateWallet, async (req: AuthRequest, res: Response) => {
  try {
    const walletAddress = req.user?.address!;

    console.log('🔍 Checking pro status for:', walletAddress);

    const hasPro = await proSubscriptionService.hasActiveProSubscription(walletAddress);

    res.json({
      success: true,
      hasPro,
      walletAddress
    });

  } catch (error: any) {
    console.error('❌ Pro status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/subscription/details
 * Get pro subscription details for user
 */
router.get('/details', authenticateWallet, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.walletAddress!;

    const proUser = await proSubscriptionService.getProUser(walletAddress);

    if (!proUser) {
      return res.json({
        success: true,
        hasPro: false,
        details: null
      });
    }

    res.json({
      success: true,
      hasPro: true,
      details: proUser
    });

  } catch (error: any) {
    console.error('❌ Pro details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
