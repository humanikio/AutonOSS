import { firestore } from '../../../config/firebase';
import { KBDocument } from '../../services/manageDocument';

export interface DocumentContext {
  document: KBDocument | null;
  contextPrompt: string;
}

export class DocumentContextManager {
  /**
   * Load document from Firestore and build context
   */
  async loadDocumentContext(tenantId: string, docId: string): Promise<DocumentContext> {
    try {
      // Load document from Firestore
      const docRef = firestore.collection('tenants').doc(tenantId).collection('kbDocs').doc(docId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        return {
          document: null,
          contextPrompt: 'No document found. The user may be creating a new document.'
        };
      }

      const data = docSnapshot.data();
      const document: KBDocument = {
        id: docSnapshot.id,
        title: data?.title || '',
        description: data?.description || '',
        content: data?.content || '',
        type: data?.type || 'guide',
        tags: data?.tags || [],
        author: data?.author || 'Unknown',
        createdAt: data?.createdAt || new Date().toISOString(),
        updatedAt: data?.updatedAt || new Date().toISOString(),
        createdBy: data?.createdBy,
        updatedBy: data?.updatedBy,
        tenantId: tenantId
      };

      // Build context prompt
      const contextPrompt = this.buildContextPrompt(document);

      return {
        document,
        contextPrompt
      };
    } catch (error) {
      console.error('Error loading document context:', error);
      return {
        document: null,
        contextPrompt: 'Error loading document context.'
      };
    }
  }

  /**
   * Build a context prompt from the document
   */
  private buildContextPrompt(document: KBDocument): string {
    const contentPreview = document.content.length > 500 
      ? document.content.substring(0, 500) + '...' 
      : document.content;

    return `You are helping the user edit the following knowledge base document:

Document Information:
- Title: ${document.title}
- Type: ${document.type}
- Description: ${document.description || 'No description provided'}
- Tags: ${document.tags.length > 0 ? document.tags.join(', ') : 'No tags'}
- Last Updated: ${new Date(document.updatedAt).toLocaleDateString()}

Current Content Preview:
${contentPreview || '[Document is currently empty]'}

Document Guidelines:
- This is a ${document.type} document
- It should be clear, comprehensive, and well-structured
- Content should be suitable for training AI agents
- Maintain consistency with the existing style and tone

Please provide assistance specific to this document's content and purpose.`;
  }

  /**
   * Get document type-specific guidance
   */
  getDocumentTypeGuidance(type: string): string {
    const typeGuidance: Record<string, string> = {
      policy: 'Focus on clear rules, conditions, and procedures. Use definitive language.',
      procedure: 'Provide step-by-step instructions. Be specific and actionable.',
      guide: 'Offer comprehensive explanations and examples. Balance detail with clarity.',
      script: 'Create conversational, natural language. Include variations and edge cases.',
      reference: 'Organize information for quick lookup. Use clear categories and formatting.'
    };

    return typeGuidance[type] || 'Provide clear, well-structured content.';
  }
}

export const documentContextManager = new DocumentContextManager();