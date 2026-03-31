import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import agentManagementRoutes from '../agents/agentManagement/routes/agentManagementRoutes';
import { agentWebhookSetupRoutes } from '../agents/agentWebhookSetup/routes/agentWebhookSetupRoute';
import { agentWebhookGetRoutes } from '../agents/agentWebhookSetup/routes/agentWebhookGetRoute';

const router = Router();

// All agent routes require authentication
router.use(authenticateToken);

// Mount agent management routes
router.use('/', agentManagementRoutes);

// Mount webhook setup routes
router.use('/webhook-setup', agentWebhookSetupRoutes);

// Mount webhook get routes
router.use('/', agentWebhookGetRoutes);

export default router;