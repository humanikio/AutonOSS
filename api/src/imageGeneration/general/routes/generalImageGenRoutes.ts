import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { 
  generateAvatarImage 
} from '../controller/generalImageGenController';

const router = Router();

/**
 * @route POST /api/image-generation/avatar
 * @desc Generate stylized avatar from user selfie
 * @access Private (requires authentication)
 */
router.post('/avatar', authenticateToken, generateAvatarImage);

export default router;