import { firestore } from '../../config/firebase';
import { update11LabsKnowledgeBase } from '../services/11LabsUpdates/update11LabsKnowledgeBase';
import { documentSummarizer } from '../services/documentSummarizer';

export interface DocumentUpdateRequest {
  tenantId: string;
  docId: string;
  content: string;
  reason?: string;
}

export interface DocumentUpdateResult {
  success: boolean;
  message: string;
  updatedAt: string;
  previousContent?: string;
}

export class AiEditDocumentTool {
  
  async updateDocument(request: DocumentUpdateRequest): Promise<DocumentUpdateResult> {
    try {
      const { tenantId, docId, content, reason } = request;

      console.log(`AI updating document ${docId} for tenant ${tenantId}`);
      console.log('Reason:', reason || 'No reason provided');

      // Get current document
      const docRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId);

      const currentDoc = await docRef.get();
      
      if (!currentDoc.exists) {
        throw new Error(`Document ${docId} not found`);
      }

      const currentData = currentDoc.data();
      const previousContent = currentData?.content || '';

      // Generate new summary for the updated content
      console.log('🔄 Generating new summary for AI-edited content...');
      let newSummary: string | undefined;
      let newKeyPoints: string[] | undefined;
      
      try {
        const summaryResult = await documentSummarizer.updateDocumentSummary(
          currentData?.title || '',
          content,
          currentData?.type,
          currentData?.description
        );
        
        newSummary = summaryResult.summary;
        newKeyPoints = summaryResult.keyPoints;
        
        console.log('✅ New summary generated for AI edit');
      } catch (error) {
        console.warn('⚠️ Failed to generate summary for AI edit:', error);
        // Continue without summary update
      }

      // Update document with new content and summary
      const updateData = {
        content: content,
        ...(newSummary && { summary: newSummary }),
        ...(newKeyPoints && { keyPoints: newKeyPoints }),
        updatedAt: new Date().toISOString(),
        updatedBy: 'AI Assistant',
        lastModifiedReason: reason || 'AI-assisted update'
      };

      await docRef.update(updateData);

      console.log(`Document ${docId} updated successfully by AI`);

      // Get document title for 11Labs update
      const updatedDoc = await docRef.get();
      const updatedData = updatedDoc.data();
      const documentTitle = updatedData?.title || 'AI Updated Document';

      // Update 11Labs knowledge base asynchronously
      console.log('AI document update completed, triggering 11Labs knowledge base update');
      
      update11LabsKnowledgeBase({
        tenantId,
        documentId: docId,
        updatedContent: content,
        documentTitle: documentTitle
      }).then((result) => {
        if (result.success) {
          console.log(`11Labs update successful for AI-edited document ${docId}:`, result.message);
        } else {
          console.error(`11Labs update failed for AI-edited document ${docId}:`, result.error);
        }
      }).catch((error) => {
        console.error(`11Labs update error for AI-edited document ${docId}:`, error);
      });

      return {
        success: true,
        message: 'Document updated successfully',
        updatedAt: updateData.updatedAt,
        previousContent
      };

    } catch (error) {
      console.error('Error updating document:', error);
      
      return {
        success: false,
        message: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Validate document content before updating
   */
  private validateContent(content: string): { valid: boolean; message?: string } {
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        message: 'Document content cannot be empty'
      };
    }

    if (content.length > 100000) { // 100KB limit
      return {
        valid: false,
        message: 'Document content exceeds maximum size limit'
      };
    }

    return { valid: true };
  }

  /**
   * Create a backup of the current document before updating
   */
  private async createBackup(tenantId: string, docId: string, content: string): Promise<void> {
    try {
      const backupRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('backups').doc();

      await backupRef.set({
        content,
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant Backup',
        type: 'pre_ai_edit'
      });

    } catch (error) {
      console.error('Error creating backup:', error);
      // Don't throw - backup failure shouldn't prevent update
    }
  }

  /**
   * Get tool information
   */
  getToolInfo() {
    return {
      id: 'aiDocEdit',
      name: 'AI Document Editor',
      description: 'Updates knowledge base document content based on AI analysis',
      version: '1.0.0',
      capabilities: [
        'Update document content',
        'Preserve document metadata',
        'Create automatic backups',
        'Validate content before updating'
      ]
    };
  }
}

export const aiEditDocumentTool = new AiEditDocumentTool();