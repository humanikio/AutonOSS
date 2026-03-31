import { firestore } from '../../../config/firebase';
import { KBDocument } from '../manageDocument';

export const listDocuments = async (tenantId: string): Promise<KBDocument[]> => {
  try {
    // Get all documents for the tenant
    const collectionRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs');
    const querySnapshot = await collectionRef.orderBy('updatedAt', 'desc').get();

    const documents: KBDocument[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const document: KBDocument = {
        id: doc.id,
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
      documents.push(document);
    });

    console.log(`Successfully retrieved ${documents.length} documents for tenant ${tenantId}`);
    return documents;

  } catch (error) {
    console.error(`Error listing documents for tenant ${tenantId}:`, error);
    throw new Error(`Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};