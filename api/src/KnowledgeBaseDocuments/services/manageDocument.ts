import { loadDocument } from './manageDocumentModules/loadDocument';
import { createDocument } from './manageDocumentModules/createDocument';
import { updateDocument } from './manageDocumentModules/updateDocument';

export interface KBDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
  summary?: string;      // AI-generated summary
  keyPoints?: string[];  // Key takeaways from the document
}

export interface CreateDocumentData {
  title: string;
  content: string;
  type?: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  description?: string;
  tags?: string[];
  author: string;
  createdBy?: string;
}

export interface UpdateDocumentData {
  title?: string;
  content?: string;
  type?: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  description?: string;
  tags?: string[];
  updatedBy?: string;
  updatedAt?: string;
  summary?: string;      // AI-generated summary
  keyPoints?: string[];  // Key takeaways from the document
}

export const manageDocumentService = {
  // Load a document by ID
  loadDocument: async (tenantId: string, docId: string): Promise<KBDocument | null> => {
    return await loadDocument(tenantId, docId);
  },

  // Create a new document
  createDocument: async (tenantId: string, documentData: CreateDocumentData, docId?: string): Promise<KBDocument> => {
    return await createDocument(tenantId, documentData, docId);
  },

  // Update an existing document
  updateDocument: async (tenantId: string, docId: string, updateData: UpdateDocumentData): Promise<KBDocument | null> => {
    return await updateDocument(tenantId, docId, updateData);
  },

  // Delete a document
  deleteDocument: async (tenantId: string, docId: string): Promise<boolean> => {
    try {
      // Import and use the delete module (we'll create this later)
      const { deleteDocument: deleteDocumentModule } = await import('./manageDocumentModules/deleteDocument');
      return await deleteDocumentModule(tenantId, docId);
    } catch (error) {
      console.error('Error in deleteDocument service:', error);
      return false;
    }
  },

  // List all documents for a tenant
  listDocuments: async (tenantId: string): Promise<KBDocument[]> => {
    try {
      // Import and use the list module (we'll create this later)
      const { listDocuments: listDocumentsModule } = await import('./manageDocumentModules/listDocuments');
      return await listDocumentsModule(tenantId);
    } catch (error) {
      console.error('Error in listDocuments service:', error);
      return [];
    }
  }
};