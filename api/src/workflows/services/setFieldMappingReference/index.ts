import { getTestPayloadFirestore } from './getTestPayloadFirestore';
import { defineFieldsFromJson, FieldDefinition } from './defineFieldsFromJson';
import { setMainMapping } from './setMainMapping';

export interface SetFieldMappingResult {
  success: boolean;
  testId: string;
  fieldsCount: number;
  availableFields: FieldDefinition[];
}

/**
 * Orchestrates the field mapping reference process
 *
 * Flow:
 * 1. Fetch the selected test payload from Firestore
 * 2. Extract and define all fields from the payload
 * 3. Write the mapping to the main document
 *
 * @param tenantId - The tenant ID
 * @param workflowId - The workflow ID
 * @param testId - The UUID of the selected test event
 * @returns Result with success status and available fields
 */
export async function setFieldMappingReference(
  tenantId: string,
  workflowId: string,
  testId: string
): Promise<SetFieldMappingResult> {
  try {
    // Step 1: Get the test payload from Firestore
    console.log(`Fetching test payload ${testId} for workflow ${workflowId}`);
    const testPayloadData = await getTestPayloadFirestore(tenantId, workflowId, testId);

    // Step 2: Define fields from the JSON payload
    console.log('Extracting field definitions from payload');
    const availableFields = defineFieldsFromJson(testPayloadData.payload);

    console.log(`Extracted ${availableFields.length} fields from payload`);

    // Step 3: Set the mapping in the main document
    console.log('Writing field mapping to main document');
    await setMainMapping(
      tenantId,
      workflowId,
      testId,
      testPayloadData.payload,
      availableFields
    );

    return {
      success: true,
      testId,
      fieldsCount: availableFields.length,
      availableFields,
    };
  } catch (error) {
    console.error('Error setting field mapping reference:', error);
    throw error;
  }
}

// Export sub-modules for testing
export { getTestPayloadFirestore } from './getTestPayloadFirestore';
export { defineFieldsFromJson, FieldDefinition } from './defineFieldsFromJson';
export { setMainMapping } from './setMainMapping';
