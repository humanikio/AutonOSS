import { getFirestore } from 'firebase-admin/firestore';

/**
 * Validates that a workflow exists and is public
 * A workflow is considered public if:
 * 1. The workflow document exists
 * 2. The workflow has isPublic flag set to true OR has an n8n/config subcollection
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID to validate
 * @returns Object with isValid boolean and optional error message
 */
export const validateWorkflowId = async (
  tenantId: string,
  workflowId: string
): Promise<{ isValid: boolean; error?: string }> => {
  const db = getFirestore();

  try {
    // Check if workflow document exists
    const workflowRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId);

    const workflowDoc = await workflowRef.get();

    if (!workflowDoc.exists) {
      return {
        isValid: false,
        error: `Workflow ${workflowId} not found`
      };
    }

    const workflowData = workflowDoc.data();

    // Check if workflow is explicitly marked as public
    if (workflowData?.isPublic === true) {
      return { isValid: true };
    }

    // Check if workflow has n8n config (telltale sign of being published/public)
    const n8nConfigRef = workflowRef.collection('n8n').doc('config');
    const n8nConfigDoc = await n8nConfigRef.get();

    if (n8nConfigDoc.exists) {
      return { isValid: true };
    }

    // Workflow exists but is not public
    return {
      isValid: false,
      error: `Workflow ${workflowId} is not public. Only public workflows can be used as agent tools.`
    };

  } catch (error) {
    console.error('Error validating workflow:', error);
    return {
      isValid: false,
      error: `Failed to validate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
