import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { AIProcessingCase, UpdateCaseRequest } from '../../types';

/**
 * Updates an existing AI processing case
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param nodeId - Node ID
 * @param caseId - Case ID
 * @param updates - Fields to update
 * @returns Updated case or null if not found
 */
export const updateCaseNumber = async (
  tenantId: string,
  workflowId: string,
  nodeId: string,
  caseId: string,
  updates: UpdateCaseRequest
): Promise<AIProcessingCase | null> => {
  const db = getFirestore();

  const caseRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('AiProcessingCases')
    .doc(caseId);

  const caseDoc = await caseRef.get();

  if (!caseDoc.exists) {
    console.warn(`   Case not found: ${caseId}`);
    return null;
  }

  const existingCase = caseDoc.data() as AIProcessingCase;

  // Verify nodeId matches (security check)
  if (existingCase.nodeId !== nodeId) {
    console.warn(`   NodeId mismatch for case ${caseId}: expected ${existingCase.nodeId}, got ${nodeId}`);
    return null;
  }

  const now = Timestamp.now();

  // Build update object
  const updateData: any = {
    ...updates,
    updatedAt: now,
  };

  // Set completedAt if status changed to complete or failed
  if (updates.status && (updates.status === 'complete' || updates.status === 'failed')) {
    if (!existingCase.completedAt) {
      updateData.completedAt = now;
    }
  }

  // Update in Firestore
  await caseRef.update(updateData);

  console.log(` Updated AI processing case: ${caseId} (status: ${updates.status || existingCase.status})`);

  // Fetch and return updated case
  const updatedDoc = await caseRef.get();
  const updatedCase = updatedDoc.data() as AIProcessingCase;

  // Convert Timestamps to Dates for serialization
  return {
    ...updatedCase,
    createdAt: (updatedCase.createdAt as Timestamp).toDate(),
    updatedAt: (updatedCase.updatedAt as Timestamp).toDate(),
    completedAt: updatedCase.completedAt
      ? (updatedCase.completedAt as Timestamp).toDate()
      : undefined,
  } as AIProcessingCase;
};
