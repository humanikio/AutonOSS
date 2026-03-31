import { baselineDocumentService } from './baselineDocumentService';
import { manageDocumentService } from '../../../KnowledgeBaseDocuments/services/manageDocument';
import { ActionData } from './actionPromptService';
import { ChatHistoryResult } from '../utilities/getChatHistory';
import { claude4 } from '../../../llmModels/claude4';

export interface IntelligentRAGRequest {
  userMessage: string;
  tenantId: string;
  agentId: string;
  conversationHistory?: ChatHistoryResult['conversationHistory'];
  actionContext?: ActionData;
  availableDocumentIds: string[];
}

export interface EnhancedDocumentContext {
  documentId: string;
  documentTitle: string;
  relevantContent: string;
  relevanceScore: number;
  selectionReason: string;
  tier: 'baseline' | 'action-relevant' | 'query-specific';
}

export class IntelligentRAG {
  /**
   * Select most relevant documents using multi-tier analysis
   * This is the core intelligence upgrade over simple RAG
   */
  async selectRelevantDocuments(request: IntelligentRAGRequest): Promise<EnhancedDocumentContext[]> {
    console.log('🧠 Intelligent RAG: Starting smart document selection...');
    
    const contexts: EnhancedDocumentContext[] = [];
    
    // TIER 1: ALWAYS - Baseline company information (MANDATORY)
    console.log('📋 Tier 1: Loading baseline document...');
    const baselineContext = await this.getBaselineContext(request.tenantId);
    contexts.push(baselineContext);
    
    // TIER 2: ACTION-RELEVANT - Documents relevant to action type (IF ACTION PROVIDED)
    if (request.actionContext) {
      console.log(`🎯 Tier 2: Loading action-relevant documents for ${request.actionContext.type}...`);
      const actionDocs = await this.getActionRelevantDocuments(request);
      contexts.push(...actionDocs);
    }
    
    // TIER 3: QUERY-SPECIFIC - Documents matching user's specific question
    console.log('🔍 Tier 3: Loading query-specific documents...');
    const queryDocs = await this.getQuerySpecificDocuments(request);
    contexts.push(...queryDocs);
    
    // Remove duplicates and rank by relevance
    const deduplicatedContexts = this.deduplicateAndRank(contexts);
    
    console.log(`✅ Intelligent RAG: Selected ${deduplicatedContexts.length} documents across ${new Set(deduplicatedContexts.map(d => d.tier)).size} tiers`);
    console.log(`📊 Document breakdown: Baseline: 1, Action: ${deduplicatedContexts.filter(d => d.tier === 'action-relevant').length}, Query: ${deduplicatedContexts.filter(d => d.tier === 'query-specific').length}`);
    
    return deduplicatedContexts;
  }
  
  /**
   * TIER 1: Always include company baseline - this is now MANDATORY
   */
  private async getBaselineContext(tenantId: string): Promise<EnhancedDocumentContext> {
    const baselineContent = await baselineDocumentService.getFormattedBaseline(tenantId);
    
    return {
      documentId: 'baseline',
      documentTitle: 'Company Foundation Knowledge',
      relevantContent: baselineContent,
      relevanceScore: 1.0, // Always maximum relevance
      selectionReason: 'Company baseline - always included for consistent brand representation',
      tier: 'baseline'
    };
  }
  
  /**
   * TIER 2: Documents relevant to specific action type
   */
  private async getActionRelevantDocuments(request: IntelligentRAGRequest): Promise<EnhancedDocumentContext[]> {
    const actionType = request.actionContext!.type;
    
    // Load all available documents to analyze
    const allDocs = await this.loadAllDocuments(request.tenantId, request.availableDocumentIds);
    
    if (allDocs.length === 0) {
      console.log('⚠️ No documents available for action relevance analysis');
      return [];
    }
    
    // Use Claude to identify action-relevant documents
    const relevantDocs = await this.analyzeActionDocumentRelevance(
      request.actionContext!,
      allDocs,
      request.userMessage
    );
    
    return relevantDocs.map((doc, index) => ({
      documentId: doc.id,
      documentTitle: doc.title,
      relevantContent: this.formatDocumentContent(doc),
      relevanceScore: 0.8 - (index * 0.1), // High relevance for action-matched docs, decreasing by selection order
      selectionReason: `Relevant to ${actionType} action: ${request.actionContext!.name}`,
      tier: 'action-relevant'
    }));
  }
  
  /**
   * TIER 3: Documents matching specific user query
   */
  private async getQuerySpecificDocuments(request: IntelligentRAGRequest): Promise<EnhancedDocumentContext[]> {
    // Load remaining documents
    const allDocs = await this.loadAllDocuments(request.tenantId, request.availableDocumentIds);
    
    if (allDocs.length === 0) {
      console.log('⚠️ No documents available for query relevance analysis');
      return [];
    }
    
    // Use Claude to find query-specific matches
    const matchedDocs = await this.analyzeQueryDocumentRelevance(
      request.userMessage,
      request.conversationHistory,
      allDocs
    );
    
    return matchedDocs.map((doc, index) => ({
      documentId: doc.id,
      documentTitle: doc.title,
      relevantContent: this.formatDocumentContent(doc),
      relevanceScore: 0.6 - (index * 0.1), // Medium relevance for query matches, decreasing by selection order
      selectionReason: `Query-specific match for: "${request.userMessage.substring(0, 50)}${request.userMessage.length > 50 ? '...' : ''}"`,
      tier: 'query-specific'
    }));
  }
  
  /**
   * Use Claude to analyze which documents are most relevant for a specific action
   */
  private async analyzeActionDocumentRelevance(
    actionContext: ActionData,
    documents: any[],
    userMessage: string
  ): Promise<any[]> {
    if (documents.length === 0) return [];
    
    try {
      const analysisPrompt = `You are analyzing which documents are most relevant for a specific customer service action.

Action Context:
- Name: ${actionContext.name}
- Type: ${actionContext.type}
- Description: ${actionContext.description}
- Specialized Guidance: ${actionContext.prompt.substring(0, 300)}...

Customer Message: "${userMessage}"

Available Documents:
${documents.map((doc, i) => `${i+1}. [${doc.type}] "${doc.title}" - ${doc.summary || doc.description}`).join('\n')}

Task: Select the 2-3 most relevant documents that would help execute this specific action effectively.

Consider:
- Does the document type align with the action type?
- Does the document content support the action's specialized guidance?
- Would this document help provide better service for this specific action?

Respond with only the document numbers separated by commas (e.g., "1,3,5"). If no documents are particularly relevant, respond with "none".`;
      
      const response = await claude4.processText(analysisPrompt);
      
      if (response.toLowerCase().trim() === 'none') {
        return [];
      }
      
      const selectedIndices = response.split(',').map(n => parseInt(n.trim()) - 1);
      
      return selectedIndices
        .filter(i => i >= 0 && i < documents.length)
        .map(i => documents[i])
        .slice(0, 3); // Max 3 action-relevant docs
        
    } catch (error) {
      console.error('❌ Error in action document relevance analysis:', error);
      return [];
    }
  }
  
  /**
   * Use Claude to analyze which documents are most relevant to the user's query
   */
  private async analyzeQueryDocumentRelevance(
    userMessage: string,
    conversationHistory: any,
    documents: any[]
  ): Promise<any[]> {
    if (documents.length === 0) return [];
    
    try {
      const analysisPrompt = `Analyze which documents are most relevant to answer this customer's specific question.

Customer's Current Message: "${userMessage}"

${conversationHistory?.conversationalContext ? `Conversation Context: ${conversationHistory.conversationalContext.substring(0, 500)}...` : 'This is the start of the conversation.'}

Available Documents:
${documents.map((doc, i) => `${i+1}. [${doc.type}] "${doc.title}" - ${doc.summary || doc.description}`).join('\n')}

Task: Select the 1-2 most relevant documents for answering this specific customer question.

Consider:
- Does the document directly address the customer's question?
- Does it contain information that would help resolve their concern?
- Is it relevant to the conversation context?

Respond with only the document numbers separated by commas (e.g., "2,4"). If no documents are particularly relevant, respond with "none".`;
      
      const response = await claude4.processText(analysisPrompt);
      
      if (response.toLowerCase().trim() === 'none') {
        return [];
      }
      
      const selectedIndices = response.split(',').map(n => parseInt(n.trim()) - 1);
      
      return selectedIndices
        .filter(i => i >= 0 && i < documents.length)
        .map(i => documents[i])
        .slice(0, 2); // Max 2 query-specific docs
        
    } catch (error) {
      console.error('❌ Error in query document relevance analysis:', error);
      return [];
    }
  }
  
  /**
   * Load all available documents for analysis
   */
  private async loadAllDocuments(tenantId: string, documentIds: string[]): Promise<any[]> {
    const docs: any[] = [];
    const validIds = documentIds.filter(id => id && id !== 'undefined' && id.trim() !== '');
    
    console.log(`📚 Loading documents: ${validIds.length} valid IDs from ${documentIds.length} provided`);
    
    if (validIds.length === 0) {
      console.log('⚠️ No valid document IDs provided for loading');
      return docs;
    }
    
    for (const id of validIds) {
      try {
        console.log(`📖 Attempting to load document: ${id}`);
        const doc = await manageDocumentService.loadDocument(tenantId, id);
        if (doc) {
          docs.push(doc);
          console.log(`✅ Successfully loaded document: ${doc.title} (${id})`);
        } else {
          console.log(`❌ Document ${id} not found for tenant ${tenantId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not load document ${id}:`, error);
      }
    }
    console.log(`📚 Final result: Loaded ${docs.length} documents for intelligent analysis`);
    return docs;
  }
  
  /**
   * Format document for optimal context inclusion (full content, no truncation)
   */
  private formatDocumentContent(document: any): string {
    let formattedContent = `Title: ${document.title}\nType: ${document.type}\nDescription: ${document.description}`;
    
    // Add summary if available
    if (document.summary) {
      formattedContent += `\n\nSummary: ${document.summary}`;
    }
    
    // Add key points if available
    if (document.keyPoints && document.keyPoints.length > 0) {
      formattedContent += `\n\nKey Points: ${document.keyPoints.join('; ')}`;
    }
    
    // Add tags if available
    if (document.tags && document.tags.length > 0) {
      formattedContent += `\n\nTags: ${document.tags.join(', ')}`;
    }
    
    // Include full content (no truncation) - maximizing context window
    formattedContent += `\n\nFull Content:\n${document.content}`;
    
    return formattedContent;
  }
  
  /**
   * Remove duplicates and rank contexts by tier priority and relevance score
   */
  private deduplicateAndRank(contexts: EnhancedDocumentContext[]): EnhancedDocumentContext[] {
    // Remove duplicates by documentId
    const seen = new Set<string>();
    const unique = contexts.filter(ctx => {
      if (seen.has(ctx.documentId)) {
        console.log(`📋 Removed duplicate document: ${ctx.documentTitle}`);
        return false;
      }
      seen.add(ctx.documentId);
      return true;
    });
    
    // Sort by tier priority then relevance score
    const tierPriority = { 'baseline': 3, 'action-relevant': 2, 'query-specific': 1 };
    
    const ranked = unique.sort((a, b) => {
      const tierDiff = tierPriority[b.tier] - tierPriority[a.tier];
      if (tierDiff !== 0) return tierDiff;
      return b.relevanceScore - a.relevanceScore;
    });
    
    // Log final selection for debugging
    ranked.forEach((ctx, index) => {
      console.log(`${index + 1}. [${ctx.tier.toUpperCase()}] ${ctx.documentTitle} (score: ${ctx.relevanceScore})`);
      console.log(`   Reason: ${ctx.selectionReason}`);
    });
    
    return ranked;
  }
}

export const intelligentRAG = new IntelligentRAG();