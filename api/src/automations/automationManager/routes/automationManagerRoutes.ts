import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { 
  createAutomationController, 
  getAutomationsController,
  createFolderController,
  getFoldersController,
  addAutomationToFolderController,
  getFolderContentsController
} from '../controllers/automationManagerController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/automations - Get all automations for tenant
router.get('/', getAutomationsController);

// POST /api/automations - Create new automation
router.post('/', createAutomationController);

// GET /api/automations/folders - Get all folders for tenant
router.get('/folders', getFoldersController);

// POST /api/automations/folders - Create new folder
router.post('/folders', createFolderController);

// GET /api/automations/folders/:folderId/contents - Get folder contents
router.get('/folders/:folderId/contents', getFolderContentsController);

// POST /api/automations/folders/:folderId/add-automation - Add automation to folder
router.post('/folders/:folderId/add-automation', addAutomationToFolderController);

export default router;