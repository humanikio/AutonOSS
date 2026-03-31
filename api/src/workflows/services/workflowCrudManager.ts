// Export all workflow CRUD services
export { createWorkflow } from './workflowCrudManager/createWorkflow';
export { getWorkflow } from './workflowCrudManager/getWorkflow';
export { getWorkflows } from './workflowCrudManager/getWorkflows';
export { updateWorkflow } from './workflowCrudManager/updateWorkflow';
export { deleteWorkflow } from './workflowCrudManager/deleteWorkflow';

// Create manager object for convenient imports
import * as createWorkflowService from './workflowCrudManager/createWorkflow';
import * as getWorkflowService from './workflowCrudManager/getWorkflow';
import * as getWorkflowsService from './workflowCrudManager/getWorkflows';
import * as updateWorkflowService from './workflowCrudManager/updateWorkflow';
import * as deleteWorkflowService from './workflowCrudManager/deleteWorkflow';

export const workflowCrudManager = {
  createWorkflow: createWorkflowService.createWorkflow,
  getWorkflow: getWorkflowService.getWorkflow,
  getWorkflows: getWorkflowsService.getWorkflows,
  updateWorkflow: updateWorkflowService.updateWorkflow,
  deleteWorkflow: deleteWorkflowService.deleteWorkflow
};
