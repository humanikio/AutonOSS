import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import conversationRoutes from '../crm/conversations/routes/conversationRoute';

const router = Router();
router.use(authenticateToken);

// Mount conversation management routes
router.use('/', conversationRoutes);

export default router;