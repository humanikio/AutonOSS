// Export all automation manager services
export { createWorkflow } from './automationManager/createWorkflow';
export { getWorkflows } from './automationManager/getWorkflows';
export { getWorkflow } from './automationManager/getWorkflow';
export { updateWorkflow } from './automationManager/updateWorkflow';
export { deleteWorkflow } from './automationManager/deleteWorkflow';
export { getFolders } from './automationManager/getFolders';
export { createFolder } from './automationManager/createFolder';
export { updateFolder } from './automationManager/updateFolder';
export { deleteFolder } from './automationManager/deleteFolder';

// Create manager object for convenient imports
import * as workflows from './automationManager/createWorkflow';
import * as getWorkflowsService from './automationManager/getWorkflows';
import * as getWorkflowService from './automationManager/getWorkflow';
import * as updateWorkflowService from './automationManager/updateWorkflow';
import * as deleteWorkflowService from './automationManager/deleteWorkflow';
import * as getFoldersService from './automationManager/getFolders';
import * as createFolderService from './automationManager/createFolder';
import * as updateFolderService from './automationManager/updateFolder';
import * as deleteFolderService from './automationManager/deleteFolder';

export const automationManager = {
  // Workflow operations
  createWorkflow: workflows.createWorkflow,
  getWorkflows: getWorkflowsService.getWorkflows,
  getWorkflow: getWorkflowService.getWorkflow,
  updateWorkflow: updateWorkflowService.updateWorkflow,
  deleteWorkflow: deleteWorkflowService.deleteWorkflow,

  // Folder operations
  getFolders: getFoldersService.getFolders,
  createFolder: createFolderService.createFolder,
  updateFolder: updateFolderService.updateFolder,
  deleteFolder: deleteFolderService.deleteFolder
};
