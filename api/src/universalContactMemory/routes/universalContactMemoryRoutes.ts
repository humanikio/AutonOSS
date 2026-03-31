import { Router, Request, Response, NextFunction } from 'express';
import { universalContactController } from '../controllers/universalContactController';

const router = Router();

// Debug middleware to log incoming requests
const debugUniversalContact = (req: Request, res: Response, next: NextFunction) => {
  console.log('<¯ Universal Contact Memory - Request received:');
  console.log('=Í Method:', req.method);
  console.log('= URL:', req.originalUrl);
  console.log('=æ Query:', JSON.stringify(req.query, null, 2));
  console.log('ð Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

/**
 * GET /api/universal-contact-memory/contact-overview
 * Get complete contact overview: AI profile + conversation history in one call
 *
 * Query Parameters:
 * - tenantId: string (required - tenant identifier)
 * - contactId: string (required - contact identifier)
 * - conversationId?: string (optional - for production mode)
 * - sessionId?: string (optional - for training mode)
 * - messageLimit?: number (optional - default: 15)
 * - isTraining?: boolean (optional - default: false)
 *
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     contactProfile: {
 *       profileId: string;
 *       profileText: string;
 *       isEmpty: boolean;
 *       lastUpdated: Timestamp;
 *     };
 *     conversationHistory: {
 *       messages: Message[];
 *       summary?: string;
 *       totalMessages: number;
 *       hasMoreHistory: boolean;
 *       conversationalContext: string;
 *     };
 *     promptContext: {
 *       contactProfileSection: string;
 *       conversationHistorySection: string;
 *     };
 *   };
 *   error?: string;
 * }
 *
 * Usage:
 * GET /api/universal-contact-memory/contact-overview?tenantId=xxx&contactId=yyy&conversationId=zzz&messageLimit=15
 *
 * Used by: SMS and Phone agent communication layers for prompt building
 */
router.get(
  '/contact-overview',
  debugUniversalContact,
  universalContactController.getContactOverview.bind(universalContactController)
);

/**
 * GET /api/universal-contact-memory/health
 * Health check endpoint
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'universal-contact-memory',
    timestamp: new Date().toISOString()
  });
});

export default router;
