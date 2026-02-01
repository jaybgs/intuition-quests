
import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

const router = express.Router();
const analyticsService = new AnalyticsService();

router.get('/builder/:address', async (req, res) => {
    try {
        const { address } = req.params;
        if (!address) {
            return res.status(400).json({ error: 'Creator address is required' });
        }

        const data = await analyticsService.getBuilderAnalytics(address);
        res.json(data);
    } catch (error) {
        console.error('Error in builder analytics route:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
