import { Router } from 'express';
import { startPhoneCall, handlePostCall, handleCallInitiation } from '../controllers/agentPhoneController';
import { authenticateEither } from '../../../middleware/authenticateEither';

const router = Router();

// Public webhook endpoints (called by ElevenLabs - no auth required)
router.post('/post-call', handlePostCall);
router.post('/call-initiated', handleCallInitiation);

// Protected API endpoint (requires authentication)
router.post('/start-call', authenticateEither, startPhoneCall);

export default router;