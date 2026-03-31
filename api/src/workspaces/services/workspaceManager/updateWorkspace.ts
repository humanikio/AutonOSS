import { firestore } from '../../../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { Workspace } from './createWorkspace';

export interface UpdateWorkspaceInput {
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Update a workspace
 * Path: tenants/{tenantId}/workspaces/{workspaceId}
 */
export async function updateWorkspace(
  tenantId: string,
  workspaceId: string,
  input: UpdateWorkspaceInput
): Promise<Workspace | null> {
  const workspaceRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('workspaces')
    .doc(workspaceId);

  const doc = await workspaceRef.get();

  if (!doc.exists) {
    return null;
  }

  const updates: Partial<Workspace> = {
    ...input,
    updatedAt: Timestamp.now(),
  };

  await workspaceRef.update(updates);

  const updatedDoc = await workspaceRef.get();
  return updatedDoc.data() as Workspace;
}
