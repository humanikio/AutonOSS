import { firestore } from '../../../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';

export interface CreateWorkspaceInput {
  name: string;
  metadata?: Record<string, any>;
}

export interface Workspace {
  id: string;
  name: string;
  tenantId: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Create a new workspace for a tenant
 * Path: tenants/{tenantId}/workspaces/{workspaceId}
 */
export async function createWorkspace(
  tenantId: string,
  uid: string,
  input: CreateWorkspaceInput
): Promise<Workspace> {
  const workspaceRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('workspaces')
    .doc();

  const now = Timestamp.now();

  const workspace: Workspace = {
    id: workspaceRef.id,
    name: input.name,
    tenantId,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata || {},
  };

  await workspaceRef.set(workspace);

  return workspace;
}
