import { firestore } from '../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { KBDocument, CreateDocumentData } from '../manageDocument';

export const createDocument = async (tenantId: string, documentData: CreateDocumentData, docId?: string): Promise<KBDocument> => {
  try {
    // Generate a unique document ID or use provided one
    const documentId = docId || uuidv4();
    const now = new Date().toISOString();

    // Prepare the document data for Firestore
    const firestoreData = {
      title: documentData.title,
      description: documentData.description || '',
      content: documentData.content || '',
      type: documentData.type || 'guide',
      tags: documentData.tags || [],
      author: documentData.author,
      createdAt: now,
      updatedAt: now,
      createdBy: documentData.createdBy,
      tenantId: tenantId
    };

    // Create document reference in the tenant's kbDocs collection
    const docRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs').doc(documentId);
    
    // Write the document to Firestore
    await docRef.set(firestoreData);

    // Return the created document
    const createdDocument: KBDocument = {
      id: documentId,
      title: firestoreData.title,
      description: firestoreData.description,
      content: firestoreData.content,
      type: firestoreData.type,
      tags: firestoreData.tags,
      author: firestoreData.author,
      createdAt: firestoreData.createdAt,
      updatedAt: firestoreData.updatedAt,
      createdBy: firestoreData.createdBy,
      tenantId: tenantId
    };

    console.log(`Successfully created document ${documentId} for tenant ${tenantId}`);
    return createdDocument;

  } catch (error) {
    console.error(`Error creating document for tenant ${tenantId}:`, error);
    throw new Error(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};