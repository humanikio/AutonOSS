import express from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { updateSingleTenantSmsRoute, updateAllTenantsSmsRoute } from '../controllers/updateInboundSmsRouteController';

const router = express.Router();

router.post('/single', updateSingleTenantSmsRoute);

router.post('/bulk', updateAllTenantsSmsRoute);

export default router;