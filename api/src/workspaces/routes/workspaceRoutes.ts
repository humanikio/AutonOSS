import { Router } from 'express';
import { authenticateEither } from '../../middleware/authenticateEither';
import { requireFirebaseAuth } from '../../middleware/requireFirebaseAuth';
import {
  handleCreateWorkspace,
  handleGetWorkspace,
  handleGetWorkspaceNames,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
} from '../controllers/workspaceController';

const router = Router();

// Apply dual authentication middleware first (supports both Firebase JWT and API keys)
router.use(authenticateEither);

// Then require Firebase JWT only for workspace routes
router.use(requireFirebaseAuth);

// Workspace CRUD routes
router.post('/', handleCreateWorkspace);           // Create workspace
router.get('/', handleGetWorkspaceNames);          // Get all workspace names
router.get('/:id', handleGetWorkspace);            // Get workspace by ID
router.put('/:id', handleUpdateWorkspace);         // Update workspace
router.delete('/:id', handleDeleteWorkspace);      // Delete workspace

export default router;
