import { v4 as uuidv4 } from 'uuid';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Workflow, CreateWorkflowRequest } from '../../types';

export const createWorkflow = async (
  tenantId: string,
  userId: string,
  data: CreateWorkflowRequest
): Promise<Workflow> => {
  const db = getFirestore();
  const workflowId = uuidv4();

  const now = Timestamp.now();
  const workflow: Workflow = {
    id: workflowId,
    name: data.name || 'Untitled Workflow',
    folderId: data.folderId || null,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    status: data.status || 'draft',
    isPublic: false, // Default to private (not synced to n8n)
    nodes: [],
    edges: []
  };

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .set(workflow);

  // Return workflow with Date objects for proper serialization
  return {
    ...workflow,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as Workflow;
};
