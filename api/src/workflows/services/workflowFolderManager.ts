// Export all folder CRUD services
export { createFolder } from './workflowFolderManager/createFolder';
export { getFolder } from './workflowFolderManager/getFolder';
export { getFolders } from './workflowFolderManager/getFolders';
export { updateFolder } from './workflowFolderManager/updateFolder';
export { deleteFolder } from './workflowFolderManager/deleteFolder';
export { getFolderContents } from './workflowFolderManager/getFolderContents';
export { addWorkflowToFolder } from './workflowFolderManager/addWorkflowToFolder';

// Create manager object for convenient imports
import * as createFolderService from './workflowFolderManager/createFolder';
import * as getFolderService from './workflowFolderManager/getFolder';
import * as getFoldersService from './workflowFolderManager/getFolders';
import * as updateFolderService from './workflowFolderManager/updateFolder';
import * as deleteFolderService from './workflowFolderManager/deleteFolder';
import * as getFolderContentsService from './workflowFolderManager/getFolderContents';
import * as addWorkflowToFolderService from './workflowFolderManager/addWorkflowToFolder';

export const workflowFolderManager = {
  createFolder: createFolderService.createFolder,
  getFolder: getFolderService.getFolder,
  getFolders: getFoldersService.getFolders,
  updateFolder: updateFolderService.updateFolder,
  deleteFolder: deleteFolderService.deleteFolder,
  getFolderContents: getFolderContentsService.getFolderContents,
  addWorkflowToFolder: addWorkflowToFolderService.addWorkflowToFolder
};
