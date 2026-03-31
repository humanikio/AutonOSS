import { getExecutionsList } from './workflowExecutions/getExecutionsList';
import { getExecution } from './workflowExecutions/getExecution';

// Export types for use in controllers
export type {
  ExecutionSummary,
  GetExecutionsListOptions,
  GetExecutionsListResponse
} from './workflowExecutions/getExecutionsList';

export type {
  ExecutionData
} from './workflowExecutions/getExecution';

export const workflowExecutions = {
  getExecutionsList,
  getExecution
};
