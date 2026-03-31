import { firestore } from '../../../config/firebase';

export interface WorkspaceName {
  id: string;
  name: string;
}

/**
 * Get all workspace names for a tenant (for card display)
 * Path: tenants/{tenantId}/workspaces
 */
export async function getWorkspaceNames(
  tenantId: string
): Promise<WorkspaceName[]> {
  const workspacesRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('workspaces');

  const snapshot = await workspacesRef.get();

  const workspaces: WorkspaceName[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    workspaces.push({
      id: doc.id,
      name: data.name || 'Unnamed Workspace',
    });
  });

  return workspaces;
}
