import { firestore } from '../../../../config/firebase';
import { SavedAnalysis } from '../analyzeSms';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';
import { generateCaseNumberService } from '../generateCaseNumber';

interface SaveAnalysisRequest {
  analysis: string;
  ragNeeded: boolean;
  kbDocumentIds?: string[];
  ragAnalysis?: string;
  documentContexts?: Array<{
    documentId: string;
    documentTitle: string;
    relevantContent: string;
  }>;
  agentId: string;
  tenantId: string;
  contactId: string;
  conversationId?: string;
  messageId?: string;
  messageContent: string;
  from?: string;
  to?: string;
  caseId?: string;
}

export class SaveAnalysis {
  /**
   * Save analysis results to Firestore
   */
  async save(request: SaveAnalysisRequest): Promise<SavedAnalysis> {
    try {
      const analysisId = uuidv4();
      const timestamp = new Date().toISOString();

      // Prepare the analysis data for Firestore
      const analysisData = {
        id: analysisId,
        timestamp: admin.firestore.Timestamp.now(),
        timestampIso: timestamp,
        
        // Message details
        messageId: request.messageId,
        messageContent: request.messageContent,
        from: request.from,
        to: request.to,
        
        // Analysis results
        analysis: request.analysis,
        ragNeeded: request.ragNeeded,
        kbDocumentIds: request.kbDocumentIds || [],
        ragAnalysis: request.ragAnalysis,
        
        // Document contexts (truncated for storage)
        documentContexts: request.documentContexts?.map(doc => ({
          documentId: doc.documentId,
          documentTitle: doc.documentTitle,
          contentLength: doc.relevantContent.length,
          contentPreview: doc.relevantContent.substring(0, 300) + (doc.relevantContent.length > 300 ? '...' : '')
        })) || [],
        
        // References
        agentId: request.agentId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        tenantId: request.tenantId,
        
        // Metadata
        createdAt: admin.firestore.Timestamp.now(),
        version: '1.0'
      };

      // Save to case in Firestore instead of separate analyses collection
      if (request.caseId) {
        await generateCaseNumberService.updateCaseAnalysis(
          request.tenantId,
          request.agentId,
          request.caseId,
          {
            analysis: request.analysis,
            ragNeeded: request.ragNeeded,
            kbDocumentIds: request.kbDocumentIds,
            ragAnalysis: request.ragAnalysis,
            documentContexts: analysisData.documentContexts
          }
        );

        console.log('=� Analysis saved to case:', {
          caseId: request.caseId,
          agentId: request.agentId,
          ragNeeded: request.ragNeeded,
          documentsUsed: request.documentContexts?.length || 0
        });
      } else {
        // Fallback to old method if no caseId provided
        const analysisRef = firestore
          .collection('tenants').doc(request.tenantId)
          .collection('agents').doc(request.agentId)
          .collection('analyses').doc(analysisId);

        await analysisRef.set(analysisData);

        console.log('=� Analysis saved to Firestore (legacy):', {
          analysisId,
          agentId: request.agentId,
          ragNeeded: request.ragNeeded,
          documentsUsed: request.documentContexts?.length || 0
        });
      }

      // Also save a reference in the contact's conversation if available
      // Skip for training sessions as they don't have real contact documents
      if (request.conversationId && !request.contactId.startsWith('training_')) {
        await this.saveConversationReference(
          request.tenantId,
          request.contactId,
          request.conversationId,
          analysisId,
          request.messageId
        );
      } else if (request.contactId.startsWith('training_')) {
        console.log('📚 Skipping conversation reference for training session');
      }

      // Return the saved analysis in the expected format
      return {
        id: analysisId,
        timestamp,
        analysis: request.analysis,
        ragNeeded: request.ragNeeded,
        kbDocumentIds: request.kbDocumentIds,
        ragAnalysis: request.ragAnalysis,
        documentContexts: request.documentContexts,
        agentId: request.agentId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        messageId: request.messageId,
        caseId: request.caseId
      };

    } catch (error) {
      console.error('Error saving analysis to Firestore:', error);
      throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save a reference to this analysis in the conversation
   */
  private async saveConversationReference(
    tenantId: string,
    contactId: string,
    conversationId: string,
    analysisId: string,
    messageId?: string
  ): Promise<void> {
    try {
      const conversationRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('contacts').doc(contactId)
        .collection('conversations').doc(conversationId);

      // Add analysis reference to the conversation metadata
      await conversationRef.update({
        lastAnalysisId: analysisId,
        lastAnalysisAt: admin.firestore.Timestamp.now(),
        analysisHistory: admin.firestore.FieldValue.arrayUnion({
          analysisId,
          messageId,
          timestamp: admin.firestore.Timestamp.now()
        })
      });

      console.log('= Conversation reference saved:', {
        conversationId,
        analysisId
      });

    } catch (error) {
      // Don't fail the entire operation if conversation reference fails
      console.warn('Warning: Could not save conversation reference:', error);
    }
  }

  /**
   * Retrieve analysis by ID
   */
  async getAnalysis(
    tenantId: string,
    agentId: string,
    analysisId: string
  ): Promise<SavedAnalysis | null> {
    try {
      const analysisRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('analyses').doc(analysisId);

      const analysisSnapshot = await analysisRef.get();

      if (!analysisSnapshot.exists) {
        return null;
      }

      const data = analysisSnapshot.data();
      if (!data) {
        return null;
      }

      return {
        id: data.id,
        timestamp: data.timestampIso,
        analysis: data.analysis,
        ragNeeded: data.ragNeeded,
        kbDocumentIds: data.kbDocumentIds,
        ragAnalysis: data.ragAnalysis,
        documentContexts: data.documentContexts?.map((doc: any) => ({
          documentId: doc.documentId,
          documentTitle: doc.documentTitle,
          relevantContent: doc.contentPreview // Return preview for retrieval
        })),
        agentId: data.agentId,
        contactId: data.contactId,
        conversationId: data.conversationId,
        messageId: data.messageId
      };

    } catch (error) {
      console.error('Error retrieving analysis:', error);
      return null;
    }
  }
}

export const saveAnalysis = new SaveAnalysis();