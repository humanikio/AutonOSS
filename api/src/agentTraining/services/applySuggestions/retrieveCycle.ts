import { firestore } from '../../../config/firebase';

/**
 * Service for retrieving analysis cycle data and suggestions by cycleId
 * Used when applying suggestions to test agent configurations
 */

export interface RetrieveCycleRequest {
  tenantId: string;
  sessionId: string;
  cycleId: string;
}

export interface CycleSuggestions {
  promptChanges?: string;
  settingChanges?: any;
  knowledgeBaseChanges?: any;
  reasoning?: string;
}

export interface CycleData {
  cycleId: string;
  cycleNumber: number;
  analysis: string;
  suggestions?: CycleSuggestions;
  timestamp: string;
  conversationContext?: {
    messageCount: number;
    userMessages: number;
    agentMessages: number;
    ragUsage: number;
    documentsUsed: number;
    hasSummary: boolean;
  };
}

export interface RetrieveCycleResult {
  success: boolean;
  cycleData?: CycleData;
  error?: string;
}

export class RetrieveCycleService {
  /**
   * Retrieve analysis cycle data by cycleId
   */
  async getCycle(request: RetrieveCycleRequest): Promise<RetrieveCycleResult> {
    try {
      const { tenantId, sessionId, cycleId } = request;
      
      console.log(`📋 Retrieving analysis cycle: ${cycleId}`);
      console.log(`  - Session: ${sessionId}`);
      console.log(`  - Tenant: ${tenantId}`);

      // Get the analysis cycle document
      const cycleRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('trainingSessions').doc(sessionId)
        .collection('analysisCycles').doc(cycleId);

      const cycleSnapshot = await cycleRef.get();

      if (!cycleSnapshot.exists) {
        console.error(`❌ Analysis cycle not found: ${cycleId}`);
        return {
          success: false,
          error: `Analysis cycle not found: ${cycleId}`
        };
      }

      const cycleData = cycleSnapshot.data();
      
      if (!cycleData) {
        console.error(`❌ Analysis cycle data is empty: ${cycleId}`);
        return {
          success: false,
          error: `Analysis cycle data is empty: ${cycleId}`
        };
      }

      console.log(`✅ Analysis cycle retrieved successfully`);
      console.log(`  - Cycle Number: ${cycleData.cycleNumber || 'N/A'}`);
      console.log(`  - Has Analysis: ${!!cycleData.analysis}`);
      console.log(`  - Has Suggestions: ${!!cycleData.suggestions}`);
      
      if (cycleData.suggestions) {
        console.log(`  - Suggestion Types:`, {
          promptChanges: !!cycleData.suggestions.promptChanges,
          settingChanges: !!cycleData.suggestions.settingChanges,
          knowledgeBaseChanges: !!cycleData.suggestions.knowledgeBaseChanges,
          reasoning: !!cycleData.suggestions.reasoning
        });
      }

      // Convert Firestore timestamp to ISO string if needed
      let timestamp = cycleData.timestamp;
      if (timestamp && typeof timestamp.toDate === 'function') {
        timestamp = timestamp.toDate().toISOString();
      } else if (!timestamp) {
        timestamp = new Date().toISOString();
      }

      const result: CycleData = {
        cycleId,
        cycleNumber: cycleData.cycleNumber || 0,
        analysis: cycleData.analysis || '',
        suggestions: cycleData.suggestions,
        timestamp,
        conversationContext: cycleData.conversationContext
      };

      return {
        success: true,
        cycleData: result
      };

    } catch (error) {
      console.error('❌ Error retrieving analysis cycle:', error);
      return {
        success: false,
        error: `Failed to retrieve analysis cycle: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate if cycle has applicable suggestions
   */
  validateSuggestions(cycleData: CycleData): {
    hasApplicableSuggestions: boolean;
    availableSuggestionTypes: string[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const availableSuggestionTypes: string[] = [];

    if (!cycleData.suggestions) {
      warnings.push('No suggestions found in analysis cycle');
      return {
        hasApplicableSuggestions: false,
        availableSuggestionTypes,
        warnings
      };
    }

    // Check each suggestion type
    if (cycleData.suggestions.promptChanges) {
      availableSuggestionTypes.push('promptChanges');
    }

    if (cycleData.suggestions.settingChanges) {
      availableSuggestionTypes.push('settingChanges');
    }

    if (cycleData.suggestions.knowledgeBaseChanges) {
      availableSuggestionTypes.push('knowledgeBaseChanges');
    }

    if (availableSuggestionTypes.length === 0) {
      warnings.push('Suggestions exist but are empty or invalid format');
    }

    console.log(`🔍 Suggestion validation:`, {
      hasApplicableSuggestions: availableSuggestionTypes.length > 0,
      availableSuggestionTypes,
      warningCount: warnings.length
    });

    return {
      hasApplicableSuggestions: availableSuggestionTypes.length > 0,
      availableSuggestionTypes,
      warnings
    };
  }
}

export const retrieveCycleService = new RetrieveCycleService();