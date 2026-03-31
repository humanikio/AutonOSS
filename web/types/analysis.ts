export interface AnalysisCycle {
  cycleId: string;
  cycleNumber: number;
  sessionId: string;
  tenantId: string;
  timestamp: string;
  status: string;
  analysis: string;
  suggestionsGenerated: boolean;
  suggestions?: {
    promptChanges?: string;
    settingChanges?: any;
    knowledgeBaseChanges?: any;
    reasoning?: string;
  };
  conversationContext: {
    messageCount: number;
    userMessages: number;
    agentMessages: number;
    ragUsage: number;
    documentsUsed: number;
    hasSummary: boolean;
  };
  processedAt: any;
  version: string;
}

export interface ConversationContext {
  messageCount: number;
  userMessages: number;
  agentMessages: number;
  ragUsage: number;
  documentsUsed: number;
  hasSummary: boolean;
}

export interface AnalysisSuggestions {
  promptChanges?: string;
  settingChanges?: any;
  knowledgeBaseChanges?: any;
  reasoning?: string;
}