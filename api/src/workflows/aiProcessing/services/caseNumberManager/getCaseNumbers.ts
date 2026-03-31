import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { AIProcessingCase } from '../../types';

/**
 * Gets all AI processing cases for a workflow/node
 * Optionally filters by nodeName
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param nodeId - Node ID (required)
 * @param nodeName - Optional node name filter
 * @returns Array of cases, ordered by createdAt descending
 */
export const getCaseNumbers = async (
  tenantId: string,
  workflowId: string,
  nodeId: string,
  nodeName?: string
): Promise<AIProcessingCase[]> => {
  const db = getFirestore();

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('AiProcessingCases')
    .where('nodeId', '==', nodeId)
    .orderBy('createdAt', 'desc');

  // Add nodeName filter if provided
  if (nodeName) {
    query = query.where('nodeName', '==', nodeName) as any;
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.log(`=Ë No cases found for workflow=${workflowId}, node=${nodeId}`);
    return [];
  }

  const cases: AIProcessingCase[] = snapshot.docs.map((doc) => {
    const data = doc.data() as AIProcessingCase;
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
      completedAt: data.completedAt
        ? (data.completedAt as Timestamp).toDate()
        : undefined,
    } as AIProcessingCase;
  });

  console.log(`=Ë Found ${cases.length} cases for workflow=${workflowId}, node=${nodeId}`);

  return cases;
};

/**
 * Gets a single AI processing case by ID
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param nodeId - Node ID (for verification)
 * @param caseId - Case ID
 * @returns Case or null if not found
 */
export const getCaseNumber = async (
  tenantId: string,
  workflowId: string,
  nodeId: string,
  caseId: string
): Promise<AIProcessingCase | null> => {
  const db = getFirestore();

  const caseDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('AiProcessingCases')
    .doc(caseId)
    .get();

  if (!caseDoc.exists) {
    console.warn(`   Case not found: ${caseId}`);
    return null;
  }

  const data = caseDoc.data() as AIProcessingCase;

  // Verify nodeId matches (security check)
  if (data.nodeId !== nodeId) {
    console.warn(`   NodeId mismatch for case ${caseId}: expected ${data.nodeId}, got ${nodeId}`);
    return null;
  }

  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    completedAt: data.completedAt
      ? (data.completedAt as Timestamp).toDate()
      : undefined,
  } as AIProcessingCase;
};
