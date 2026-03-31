import { Router } from 'express';
import { CallAnalyticsController } from '../controllers/callAnalyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All call analytics routes require authentication
router.use(authenticateToken);

// Get call logs with optional filtering
// GET /api/call-analytics/logs?agentId=xxx&limit=50&startAfter=xxx&startDate=2024-01-01&endDate=2024-01-31
router.get('/logs', CallAnalyticsController.getCallLogs);

// Get analytics summary
// GET /api/call-analytics/summary?startDate=2024-01-01&endDate=2024-01-31
router.get('/summary', CallAnalyticsController.getAnalyticsSummary);

// Get specific call log
// GET /api/call-analytics/logs/:conversationId
router.get('/logs/:conversationId', CallAnalyticsController.getCallLog);

export default router;