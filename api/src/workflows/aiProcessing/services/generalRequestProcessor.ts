import { ProcessAIResponse } from '../types';
import { generateCaseNumberTool } from './generalRequestProcessor/tools/generateCaseNumber';
import { reviewRequestData } from './generalRequestProcessor/reviewRequestData';
import { generateResponse } from './generalRequestProcessor/generateResponse';
import { storeResponseInCaseTool } from './generalRequestProcessor/tools/storeResponseInCase';

/**
 * Parameters for processing an AI request
 */
export interface ProcessRequestParams {
  tenantId: string;
  workflowId: string;
  nodeId: string;
  nodeName?: string;
  contactId: string;
  prompt: string;
  systemPrompt?: string;
}

/**
 * Main orchestrator for AI processing requests
 *
 * Flow:
 * 1. Generate case ID and create case document (status: pending)
 * 2. Review request data and inject contact variables into prompt
 * 3. Generate Claude response with prepared prompt
 * 4. Return response immediately to caller
 * 5. Async: Update case with result (fire-and-forget)
 *
 * @param params - Processing parameters
 * @returns Case ID and Claude's response
 */
export const processRequest = async (
  params: ProcessRequestParams
): Promise<ProcessAIResponse> => {
  const { tenantId, workflowId, nodeId, nodeName, contactId, prompt, systemPrompt } = params;

  console.log(`=� Processing AI request for workflow ${workflowId}, node ${nodeId}`);

  const startTime = Date.now();

  // Step 1: Generate case number and create initial case
  const caseId = await generateCaseNumberTool(tenantId, {
    workflowId,
    nodeId,
    nodeName,
    prompt,
    systemPrompt,
  });

  console.log(`=� Case created: ${caseId}`);

  try {
    // Step 2: Review request data and inject contact variables
    const reviewResult = await reviewRequestData.review({
      tenantId,
      contactId,
      content: prompt
    });

    console.log(`=🔍 Request data reviewed: ${reviewResult.variablesFound.length} variables found`);

    // Step 3: Generate response from Claude with prepared prompt
    const response = await generateResponse(reviewResult.preparedContent, systemPrompt);

    const processingTime = Date.now() - startTime;

    console.log(` AI processing complete for case ${caseId} (${processingTime}ms)`);

    // Step 4: Return response immediately to caller
    const result: ProcessAIResponse = {
      caseId,
      response,
    };

    // Step 5: Async - Update case with success status (fire-and-forget)
    // Don't await - this runs in background
    storeResponseInCaseTool({
      tenantId,
      workflowId,
      nodeId,
      caseId,
      status: 'complete',
      response,
      processingTimeMs: processingTime,
      modelUsed: 'claude-sonnet-4-5-20250929',
    }).catch((error) => {
      console.error(`L Failed to store response for case ${caseId}:`, error);
      // Error is logged but doesn't affect the response to the user
    });

    return result;
  } catch (error: any) {
    console.error(`L AI processing failed for case ${caseId}:`, error);

    // Async - Update case with failed status (fire-and-forget)
    storeResponseInCaseTool({
      tenantId,
      workflowId,
      nodeId,
      caseId,
      status: 'failed',
      error: error.message,
    }).catch((storeError) => {
      console.error(`L Failed to store error for case ${caseId}:`, storeError);
    });

    // Throw error so controller can return proper error response
    throw error;
  }
};
