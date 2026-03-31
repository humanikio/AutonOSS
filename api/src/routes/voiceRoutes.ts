import { Router } from 'express';
import { VoiceController } from '../controllers/voiceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all voice routes
router.use(authenticateToken);

// Get all voices
router.get('/', VoiceController.getVoices);

// Get specific voice details
router.get('/:voiceId', VoiceController.getVoice);

// Generate voice preview
router.post('/:voiceId/preview', VoiceController.generateVoicePreview);

export default router;