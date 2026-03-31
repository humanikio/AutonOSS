import { firestore } from '../../../config/firebase';

/**
 * Delete a workspace
 * Path: tenants/{tenantId}/workspaces/{workspaceId}
 */
export async function deleteWorkspace(
  tenantId: string,
  workspaceId: string
): Promise<boolean> {
  const workspaceRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('workspaces')
    .doc(workspaceId);

  const doc = await workspaceRef.get();

  if (!doc.exists) {
    return false;
  }

  await workspaceRef.delete();
  return true;
}
