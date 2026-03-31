import { createWorkflow } from './workflowManager/createWorkflow';
import { getWorkflows } from './workflowManager/getWorkflows';
import { readWorkflow } from './workflowManager/readWorkflow';
import { updateWorkflow } from './workflowManager/updateWorkflow';
import { deleteWorkflow } from './workflowManager/deleteWorkflow';
import { activateWorkflow } from './workflowManager/activateWorkflow';
import { deactivateWorkflow } from './workflowManager/deactivateWorkflow';

// Export types for use in controllers
export type {
  WorkflowData,
  WorkflowUpdateData,
  N8nWorkflow,
  GetWorkflowsOptions,
  WorkflowNode
} from './types';

export const workflowManager = {
  createWorkflow,
  getWorkflows,
  readWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow
};
