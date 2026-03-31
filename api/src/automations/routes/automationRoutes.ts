import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  createWorkflow,
  getAllWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getAllFolders,
  createFolder,
  updateFolder,
  deleteFolder
} from '../controllers/automationController';
import {
  getFolderContentsController,
  addAutomationToFolderController
} from '../automationManager/controllers/automationManagerController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ===== WORKFLOW ROUTES =====
router.post('/workflows', createWorkflow);
router.get('/workflows', getAllWorkflows);
router.get('/workflows/:id', getWorkflow);
router.put('/workflows/:id', updateWorkflow);
router.delete('/workflows/:id', deleteWorkflow);

// ===== FOLDER ROUTES =====
router.get('/folders', getAllFolders);
router.post('/folders', createFolder);
router.put('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);

// Folder contents and automation management
router.get('/folders/:folderId/contents', getFolderContentsController);
router.post('/folders/:folderId/add-automation', addAutomationToFolderController);

export default router;
