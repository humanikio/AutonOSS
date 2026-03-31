import admin from 'firebase-admin';
import { FieldDefinition } from './defineFieldsFromJson';

const db = admin.firestore();

/**
 * Writes the selected test payload mapping to the main document
 *
 * Updates workflows/{workflowId}/triggerTests/main with:
 * - selectedTestId: UUID of the selected test event
 * - selectedPayload: The original payload
 * - availableFields: Array of field definitions for mapping
 * - mappingUpdatedAt: Timestamp of when mapping was updated
 *
 * @param tenantId - The tenant ID
 * @param workflowId - The workflow ID
 * @param testId - The UUID of the selected test event
 * @param payload - The original payload from the test event
 * @param availableFields - Array of field definitions extracted from the payload
 */
export async function setMainMapping(
  tenantId: string,
  workflowId: string,
  testId: string,
  payload: any,
  availableFields: FieldDefinition[]
): Promise<void> {
  const mainDocRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .collection('triggerTests')
    .doc('main');

  await mainDocRef.set(
    {
      selectedTestId: testId,
      selectedPayload: payload,
      availableFields: availableFields,
      mappingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true } // Merge to preserve activeTestUrl and other existing fields
  );

  console.log(`Field mapping updated for workflow ${workflowId} with test ${testId}`);
}
