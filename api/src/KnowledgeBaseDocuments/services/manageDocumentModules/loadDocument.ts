import { firestore } from '../../../config/firebase';
import { KBDocument } from '../manageDocument';

export const loadDocument = async (tenantId: string, docId: string): Promise<KBDocument | null> => {
  try {
    // Query the document from Firestore using the tenant/document path structure
    const docRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs').doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      console.log(`Document ${docId} not found for tenant ${tenantId}`);
      return null;
    }

    const data = docSnapshot.data();
    if (!data) {
      console.log(`Document ${docId} has no data for tenant ${tenantId}`);
      return null;
    }

    // Transform Firestore data to KBDocument interface
    const document: KBDocument = {
      id: docSnapshot.id,
      title: data.title || '',
      description: data.description || '',
      content: data.content || '',
      type: data.type || 'guide',
      tags: data.tags || [],
      author: data.author || 'Unknown',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      tenantId: tenantId
    };

    console.log(`Successfully loaded document ${docId} for tenant ${tenantId}`);
    return document;

  } catch (error) {
    console.error(`Error loading document ${docId} for tenant ${tenantId}:`, error);
    throw new Error(`Failed to load document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};