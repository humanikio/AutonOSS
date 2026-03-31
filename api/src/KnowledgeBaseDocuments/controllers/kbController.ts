import { Request, Response } from 'express';
import { manageDocumentService } from '../services/manageDocument';
import { documentUploadService } from '../services/documentUploads';

interface KBDocumentRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    tenantId?: string;
    role?: string;
    permissions?: string[];
  };
  tenantId?: string;
}

export const kbController = {
  // Load a document by ID
  loadDocument: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const { docId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!docId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const document = await manageDocumentService.loadDocument(tenantId, docId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: document,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error loading document:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Create a new document
  createDocument: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId;
      const { title, content, type, description, tags } = req.body;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!title) {
        res.status(400).json({
          success: false,
          error: 'Title is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const documentData = {
        title,
        content,
        type: type || 'guide',
        description: description || '',
        tags: tags || [],
        author: req.user?.email || 'Unknown',
        createdBy: req.user?.uid
      };

      // Check if this is a baseline document creation
      const isBaseline = title === 'Company Baseline Document' && tags?.includes('baseline');
      const docId = isBaseline ? 'baseline' : undefined;

      const newDocument = await manageDocumentService.createDocument(tenantId, documentData, docId);

      res.status(201).json({
        success: true,
        data: newDocument,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error creating document:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Update a document
  updateDocument: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const { docId } = req.params;
      const tenantId = req.tenantId;
      const updateData = req.body;

      console.log('Update document request:', {
        docId,
        tenantId,
        updateData,
        contentLength: updateData.content?.length,
        contentPreview: updateData.content?.substring(0, 100)
      });

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!docId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatePayload = {
        ...updateData,
        updatedBy: req.user?.uid,
        updatedAt: new Date().toISOString()
      };

      console.log('Sending to service:', {
        docId,
        tenantId,
        payloadKeys: Object.keys(updatePayload),
        contentLength: updatePayload.content?.length
      });

      const updatedDocument = await manageDocumentService.updateDocument(tenantId, docId, updatePayload);

      if (!updatedDocument) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedDocument,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error updating document:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Delete a document
  deleteDocument: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const { docId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!docId) {
        res.status(400).json({
          success: false,
          error: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const success = await manageDocumentService.deleteDocument(tenantId, docId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // List all documents for a tenant
  listDocuments: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const documents = await manageDocumentService.listDocuments(tenantId);

      res.status(200).json({
        success: true,
        data: documents,
        count: documents.length,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error listing documents:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Analyze an uploaded document
  analyzeUploadedDocument: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId;
      const { documentId, downloadUrl, fileName, fileType, autoIntegrate, targetDocumentId } = req.body;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!documentId || !downloadUrl) {
        res.status(400).json({
          success: false,
          error: 'Document ID and download URL are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const analysisResult = await documentUploadService.analyzeDocument({
        documentId,
        downloadUrl,
        fileName,
        fileType,
        tenantId,
        autoIntegrate,
        targetDocumentId
      });

      res.status(200).json({
        success: true,
        data: analysisResult,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error analyzing uploaded document:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Clean up orphaned document references in agent indexes
  cleanupOrphanedReferences: async (req: KBDocumentRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🧹 Starting orphaned document reference cleanup for tenant: ${tenantId}`);

      // Import the cleanup service
      const { cleanupOrphanedDocumentReferences } = await import('../services/cleanupOrphanedReferences');
      
      const cleanupResult = await cleanupOrphanedDocumentReferences(tenantId);

      res.status(200).json({
        success: true,
        data: cleanupResult,
        message: `Successfully cleaned up ${cleanupResult.totalOrphanedReferences} orphaned references across ${cleanupResult.agentsUpdated} agents`,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error cleaning up orphaned references:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};