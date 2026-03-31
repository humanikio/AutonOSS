import { getFirestore } from 'firebase-admin/firestore';

/**
 * Deletes an AI processing case
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param nodeId - Node ID (for verification)
 * @param caseId - Case ID
 * @returns true if deleted, false if not found
 */
export const deleteCaseNumber = async (
  tenantId: string,
  workflowId: string,
  nodeId: string,
  caseId: string
): Promise<boolean> => {
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
    return false;
  }

  const data = caseDoc.data();

  // Verify nodeId matches (security check)
  if (data?.nodeId !== nodeId) {
    console.warn(`   NodeId mismatch for case ${caseId}: expected ${data?.nodeId}, got ${nodeId}`);
    return false;
  }

  await caseRef.delete();

  console.log(` Deleted AI processing case: ${caseId}`);

  return true;
};
