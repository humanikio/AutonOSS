import { firestore } from '../../../config/firebase';
import { Workspace } from './createWorkspace';

/**
 * Read a workspace by ID
 * Path: tenants/{tenantId}/workspaces/{workspaceId}
 */
export async function readWorkspace(
  tenantId: string,
  workspaceId: string
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

  return doc.data() as Workspace;
}
