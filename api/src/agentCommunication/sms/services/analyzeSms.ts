import { agentPromptAnalysis } from './analyzeSms/agentPromptAnalysis';
import { intelligentRAG } from './intelligentRAG';
import { saveAnalysis } from './analyzeSms/saveAnalysis';
import { ChatHistoryResult } from '../utilities/getChatHistory';

export interface SmsAnalysisRequest {
  messageContent: string;
  tenantId: string;
  contactId: string;
  agentId: string;
  conversationId?: string;
  messageId?: string;
  from?: string;
  to?: string;
  caseId?: string;
  conversationHistory?: ChatHistoryResult['conversationHistory']; // Add conversation context
  isTraining?: boolean;
  trainingSessionId?: string;
  actionId?: string; // NEW: Optional action ID for context
}

export interface InitialAnalysis {
  analysis: string;
  ragNeeded: boolean;
  kbDocumentIds?: string[];
}

export interface EnhancedAnalysis extends InitialAnalysis {
  ragAnalysis?: string;
  documentContexts?: Array<{
    documentId: string;
    documentTitle: string;
    relevantContent: string;
  }>;
}

export interface SavedAnalysis extends EnhancedAnalysis {
  id: string;
  timestamp: string;
  agentId: string;
  contactId: string;
  conversationId?: string;
  messageId?: string;
  caseId?: string;
}

export class SmsAnalysisService {
  /**
   * Get action data for intelligent RAG analysis
   */
  private async getActionData(tenantId: string, agentId: string, actionId: string): Promise<any> {
    try {
      const { actionPromptService } = await import('./actionPromptService');
      return await actionPromptService.getActionData({
        actionId,
        tenantId,
        agentId
      });
    } catch (error) {
      console.error('Error loading action data for RAG:', error);
      return undefined;
    }
  }

  /**
   * Build enhanced analysis from intelligent RAG results
   */
  private buildEnhancedAnalysis(enhancedDocuments: any[]): string {
    if (enhancedDocuments.length <= 1) {
      return 'Analysis enhanced with company baseline knowledge';
    }

    const tiers = enhancedDocuments.reduce((acc, doc) => {
      acc[doc.tier] = (acc[doc.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let analysisText = 'Enhanced analysis with intelligent document selection:\n';
    
    if (tiers.baseline) {
      analysisText += `• Company baseline information included for consistent brand representation\n`;
    }
    
    if (tiers['action-relevant']) {
      analysisText += `• ${tiers['action-relevant']} action-relevant document(s) selected to support specialized guidance\n`;
    }
    
    if (tiers['query-specific']) {
      analysisText += `• ${tiers['query-specific']} query-specific document(s) selected to address customer's specific needs\n`;
    }

    analysisText += '\nThis provides comprehensive context for delivering accurate, on-brand responses that address the customer\'s specific situation.';
    
    return analysisText;
  }
  /**
   * Analyze incoming SMS message through the complete pipeline
   */
  async analyzeInboundSms(request: SmsAnalysisRequest): Promise<SavedAnalysis> {
    try {
      console.log('= Starting SMS analysis pipeline');
      console.log(`  - Agent ID: ${request.agentId}`);
      console.log(`  - Message: "${request.messageContent}"`);

      // Step 1: Initial analysis with agent prompt and conversation context
      console.log('\n= Step 1: Agent Prompt Analysis with Conversation Context');
      const initialAnalysis = await agentPromptAnalysis.analyze({
        messageContent: request.messageContent,
        agentId: request.agentId,
        tenantId: request.tenantId,
        caseId: request.caseId,
        conversationHistory: request.conversationHistory, // Pass conversation context
        isTraining: request.isTraining,
        trainingSessionId: request.trainingSessionId,
        actionId: request.actionId // NEW: Pass action ID for context
      });

      console.log('  Initial Analysis Result:', {
        ragNeeded: initialAnalysis.ragNeeded,
        documentIds: initialAnalysis.kbDocumentIds?.length || 0
      });

      // Step 2: INTELLIGENT RAG - Always runs with baseline + smart selection
      console.log('\n= Step 2: Intelligent RAG Enhancement');
      
      const enhancedDocuments = await intelligentRAG.selectRelevantDocuments({
        userMessage: request.messageContent,
        tenantId: request.tenantId,
        agentId: request.agentId,
        conversationHistory: request.conversationHistory,
        actionContext: request.actionId ? await this.getActionData(request.tenantId, request.agentId, request.actionId) : undefined,
        availableDocumentIds: initialAnalysis.kbDocumentIds || []
      });
      
      // Convert enhanced documents to expected format for backward compatibility
      const enhancedAnalysis: EnhancedAnalysis = {
        analysis: initialAnalysis.analysis,
        ragNeeded: enhancedDocuments.length > 1, // More than just baseline
        ragAnalysis: this.buildEnhancedAnalysis(enhancedDocuments),
        documentContexts: enhancedDocuments.map(doc => ({
          documentId: doc.documentId,
          documentTitle: doc.documentTitle,
          relevantContent: doc.relevantContent
        })),
        kbDocumentIds: enhancedDocuments.map(doc => doc.documentId)
      };
      
      console.log('  Intelligent RAG Complete:', {
        totalDocuments: enhancedDocuments.length,
        baselineIncluded: enhancedDocuments.some(d => d.tier === 'baseline'),
        actionRelevant: enhancedDocuments.filter(d => d.tier === 'action-relevant').length,
        querySpecific: enhancedDocuments.filter(d => d.tier === 'query-specific').length
      });

      // Step 3: Save analysis results
      console.log('\n= Step 3: Saving Analysis');
      const savedAnalysis = await saveAnalysis.save({
        ...enhancedAnalysis,
        agentId: request.agentId,
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        messageId: request.messageId,
        messageContent: request.messageContent,
        from: request.from,
        to: request.to,
        caseId: request.caseId
      });

      console.log("✅ SMS Analysis Pipeline Complete");
      console.log(`  Analysis ID: ${savedAnalysis.id}`);

      return savedAnalysis;

    } catch (error) {
      console.error('L Error in SMS analysis pipeline:', error);
      throw new Error(`SMS analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const smsAnalysisService = new SmsAnalysisService();