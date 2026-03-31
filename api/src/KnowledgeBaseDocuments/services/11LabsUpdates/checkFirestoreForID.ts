import { firestore } from '../../../config/firebase';

export interface FirestoreDocumentCheck {
  exists: boolean;
  has11LabsId: boolean;
  hasAnyElevenLabsId: boolean;
  // Single ID (backwards compatibility)
  elevenLabsKnowledgeBaseDocId?: string;
  // Array of IDs (new versioning system)
  elevenLabsKnowledgeBaseDocIds?: string[];
  // Current active ID (first in array or single ID)
  currentElevenLabsId?: string;
  // Previous ID (second in array, used for agent migration)
  previousElevenLabsId?: string;
  documentContent: string;
  documentTitle: string;
}

/**
 * Check if a Firestore document exists and has an 11Labs Knowledge Base Document ID
 */
export async function checkFirestoreForID(
  tenantId: string,
  documentId: string
): Promise<FirestoreDocumentCheck> {
  try {
    console.log(`Checking Firestore for 11Labs ID for document ${documentId} in tenant ${tenantId}`);

    // Get document reference
    const docRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('kbDocs').doc(documentId);

    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      console.log(`Document ${documentId} not found in Firestore`);
      return {
        exists: false,
        has11LabsId: false,
        hasAnyElevenLabsId: false,
        documentContent: '',
        documentTitle: ''
      };
    }

    const data = docSnapshot.data();
    const elevenLabsId = data?.elevenLabsKnowledgeBaseDocId;
    const elevenLabsIds = data?.elevenLabsKnowledgeBaseDocIds;
    const content = data?.content || '';
    const title = data?.title || 'Untitled Document';

    // Determine current and previous IDs
    let currentId: string | undefined;
    let previousId: string | undefined;
    let hasAnyId = false;

    if (elevenLabsIds && Array.isArray(elevenLabsIds) && elevenLabsIds.length > 0) {
      // New array system
      currentId = elevenLabsIds[0];
      previousId = elevenLabsIds.length > 1 ? elevenLabsIds[1] : undefined;
      hasAnyId = true;
    } else if (elevenLabsId) {
      // Backwards compatibility with single ID
      currentId = elevenLabsId;
      hasAnyId = true;
    }

    console.log(`Document exists. 11Labs IDs:`, {
      hasArray: !!elevenLabsIds,
      arrayLength: elevenLabsIds?.length || 0,
      hasSingleId: !!elevenLabsId,
      currentId,
      previousId,
      hasAnyId
    });

    return {
      exists: true,
      has11LabsId: !!elevenLabsId, // Backwards compatibility
      hasAnyElevenLabsId: hasAnyId,
      elevenLabsKnowledgeBaseDocId: elevenLabsId,
      elevenLabsKnowledgeBaseDocIds: elevenLabsIds,
      currentElevenLabsId: currentId,
      previousElevenLabsId: previousId,
      documentContent: content,
      documentTitle: title
    };

  } catch (error) {
    console.error('Error checking Firestore for 11Labs ID:', error);
    throw new Error(`Failed to check Firestore document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update Firestore document with 11Labs Knowledge Base Document ID (single ID - backwards compatibility)
 */
export async function updateFirestoreWith11LabsId(
  tenantId: string,
  documentId: string,
  elevenLabsKnowledgeBaseDocId: string
): Promise<void> {
  try {
    console.log(`Updating Firestore document ${documentId} with 11Labs ID: ${elevenLabsKnowledgeBaseDocId}`);

    const docRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('kbDocs').doc(documentId);

    await docRef.update({
      elevenLabsKnowledgeBaseDocId: elevenLabsKnowledgeBaseDocId,
      lastElevenLabsUpdate: new Date().toISOString()
    });

    console.log(`Successfully updated Firestore with 11Labs ID`);

  } catch (error) {
    console.error('Error updating Firestore with 11Labs ID:', error);
    throw new Error(`Failed to update Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update Firestore document with 11Labs Knowledge Base Document ID array (new versioning system)
 */
export async function updateFirestoreWith11LabsIdArray(
  tenantId: string,
  documentId: string,
  elevenLabsKnowledgeBaseDocIds: string[]
): Promise<void> {
  try {
    console.log(`Updating Firestore document ${documentId} with 11Labs ID array:`, elevenLabsKnowledgeBaseDocIds);

    const docRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('kbDocs').doc(documentId);

    await docRef.update({
      elevenLabsKnowledgeBaseDocIds: elevenLabsKnowledgeBaseDocIds,
      elevenLabsKnowledgeBaseDocId: elevenLabsKnowledgeBaseDocIds[0], // Keep single field for backwards compatibility
      lastElevenLabsUpdate: new Date().toISOString()
    });

    console.log(`Successfully updated Firestore with 11Labs ID array`);

  } catch (error) {
    console.error('Error updating Firestore with 11Labs ID array:', error);
    throw new Error(`Failed to update Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}