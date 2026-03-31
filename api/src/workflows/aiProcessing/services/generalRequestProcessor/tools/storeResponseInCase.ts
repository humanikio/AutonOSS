import { updateCaseNumber } from '../../caseNumberManager';
import { CaseStatus } from '../../../types';

/**
 * Parameters for storing response in case
 */
export interface StoreResponseParams {
  tenantId: string;
  workflowId: string;
  nodeId: string;
  caseId: string;
  status: CaseStatus;
  response?: string;
  error?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  modelUsed?: string;
}

/**
 * Stores the AI response (or error) in the case document
 *
 * @param params - Storage parameters
 */
export const storeResponseInCaseTool = async (params: StoreResponseParams): Promise<void> => {
  const { tenantId, workflowId, nodeId, caseId, status, response, error, tokensUsed, processingTimeMs, modelUsed } = params;

  console.log(`=¾ Storing ${status} result for case ${caseId}...`);

  try {
    await updateCaseNumber(tenantId, workflowId, nodeId, caseId, {
      status,
      response,
      error,
      tokensUsed,
      processingTimeMs,
      modelUsed,
    });

    console.log(` Case ${caseId} updated with ${status} status`);
  } catch (error: any) {
    console.error(`L Failed to store response in case ${caseId}:`, error);
    // Don't throw - this is fire-and-forget, we don't want to fail the main request
  }
};
