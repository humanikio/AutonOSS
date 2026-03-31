import { Router } from 'express';
import { CustomToolController } from '../controllers/customToolController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all custom tool routes
router.use(authenticateToken);

// Custom tool CRUD endpoints
router.get('/', CustomToolController.getCustomTools);
router.post('/', CustomToolController.createCustomTool);
router.get('/:id', CustomToolController.getCustomTool);
router.put('/:id', CustomToolController.updateCustomTool);
router.delete('/:id', CustomToolController.deleteCustomTool);

export default router;