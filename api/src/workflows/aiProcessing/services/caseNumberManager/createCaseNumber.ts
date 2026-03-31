import { v4 as uuidv4 } from 'uuid';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { AIProcessingCase, CreateCaseRequest } from '../../types';

/**
 * Creates a new AI processing case
 *
 * @param tenantId - Tenant ID
 * @param request - Case creation request
 * @returns Created case with Date objects
 */
export const createCaseNumber = async (
  tenantId: string,
  request: CreateCaseRequest
): Promise<AIProcessingCase> => {
  const db = getFirestore();
  const caseId = uuidv4();

  const now = Timestamp.now();

  const newCase: AIProcessingCase = {
    id: caseId,
    workflowId: request.workflowId,
    nodeId: request.nodeId,
    nodeName: request.nodeName,
    prompt: request.prompt,
    systemPrompt: request.systemPrompt,
    status: 'pending',
    response: undefined,
    error: undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
  };

  // Save to Firestore: tenants/{tenantId}/workflows/{workflowId}/AiProcessingCases/{caseId}
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(request.workflowId)
    .collection('AiProcessingCases')
    .doc(caseId)
    .set(newCase);

  console.log(` Created AI processing case: ${caseId}`);

  // Return case with Date objects for proper serialization
  return {
    ...newCase,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as AIProcessingCase;
};
