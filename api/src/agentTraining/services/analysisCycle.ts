import { retrieveSessionHistoryService } from './analysisCycle/retrieveSessionHistory';
import { retrieveAgentConfigsService } from './analysisCycle/retrieveAgentConfigs';
import { analyzeContextService } from './analysisCycle/analyzeContext';
import { generateSuggestionsService } from './analysisCycle/generateSuggestions';
import { updateAnalysisReportService } from './analysisCycle/updateAnalysisReport';

/**
 * Main orchestrator for the analysis cycle
 * Coordinates the complete pipeline: retrieve history � get configs � analyze � generate suggestions � save report
 */

export interface AnalysisCycleRequest {
  sessionId: string;
  tenantId: string;
  agentId: string;
}

export interface AnalysisCycleResult {
  success: boolean;
  cycleId?: string;
  cycleNumber?: number;
  analysis?: string;
  suggestions?: {
    promptChanges?: string;
    settingChanges?: any;
    knowledgeBaseChanges?: any;
    reasoning?: string;
  };
  error?: string;
}

export class AnalysisCycleService {
  /**
   * Run complete analysis cycle for a training session
   */
  async runAnalysisCycle(request: AnalysisCycleRequest): Promise<AnalysisCycleResult> {
    try {
      const { sessionId, tenantId, agentId } = request;
      
      console.log(`= Starting analysis cycle for session: ${sessionId}`);
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Agent ID: ${agentId}`);
      console.log('=====================================');

      // Step 1: Retrieve session history
      console.log('=� Step 1: Retrieving training session history...');
      const historyResult = await retrieveSessionHistoryService.getSessionHistory({
        sessionId,
        tenantId,
        messageLimit: 50 // Get comprehensive history for analysis
      });

      if (!historyResult.success) {
        console.error('L Failed to retrieve session history:', historyResult.error);
        return {
          success: false,
          error: `Failed to retrieve session history: ${historyResult.error}`
        };
      }

      console.log(` Retrieved session history with ${historyResult.messages?.length || 0} messages`);
      console.log(`  - Conversation context: ${historyResult.conversationalContext?.length || 0} chars`);
      console.log(`  - Summary available: ${historyResult.summary ? 'Yes' : 'No'}`);

      // Step 2: Retrieve agent configurations
      console.log('\n� Step 2: Retrieving agent configurations...');
      const configResult = await retrieveAgentConfigsService.getAgentConfigs({
        tenantId,
        agentId,
        sessionId // Pass sessionId for training mode test agent config lookup
      });

      if (!configResult.success) {
        console.error('L Failed to retrieve agent configs:', configResult.error);
        return {
          success: false,
          error: `Failed to retrieve agent configs: ${configResult.error}`
        };
      }

      console.log(` Retrieved agent configurations`);
      console.log(`  - Training mode: ${sessionId ? 'Yes (using test agent if available)' : 'No (using live agent)'}`);
      console.log(`  - System prompt: ${configResult.configs?.systemPrompt ? 'Available' : 'Not set'}`);
      console.log(`  - LLM Model: ${configResult.configs?.llmModel || 'Default'}`);
      console.log(`  - Knowledge base docs: ${configResult.configs?.knowledgeBase?.length || 0}`);

      // Step 3: Analyze context using LLM
      console.log('\n>� Step 3: Analyzing conversation context...');
      const analysisResult = await analyzeContextService.analyzeConversation({
        sessionHistory: historyResult,
        agentConfigs: configResult.configs!
      });

      if (!analysisResult.success) {
        console.error('L Failed to analyze context:', analysisResult.error);
        return {
          success: false,
          error: `Failed to analyze context: ${analysisResult.error}`
        };
      }

      console.log(` Context analysis completed`);
      console.log(`  - Analysis generated: ${analysisResult.analysis ? 'Yes' : 'No'}`);
      console.log(`  - Suggestions needed: ${analysisResult.suggestionsNeeded ? 'Yes' : 'No'}`);

      let suggestions = undefined;

      // Step 4: Generate suggestions if needed
      if (analysisResult.suggestionsNeeded) {
        console.log('\n=� Step 4: Generating improvement suggestions...');
        const suggestionsResult = await generateSuggestionsService.generateSuggestions({
          analysis: analysisResult.analysis!,
          agentConfigs: configResult.configs!
        });

        if (!suggestionsResult.success) {
          console.warn('� Failed to generate suggestions (non-blocking):', suggestionsResult.error);
          // Don't fail the entire cycle, just log the warning
        } else {
          suggestions = suggestionsResult.suggestions;
          console.log(` Generated suggestions`);
          console.log(`  - Prompt changes: ${suggestions?.promptChanges ? 'Yes' : 'No'}`);
          console.log(`  - Setting changes: ${suggestions?.settingChanges ? 'Yes' : 'No'}`);
        }
      } else {
        console.log('\n=� Step 4: No suggestions needed - skipping generation');
      }

      // Step 5: Update analysis report
      console.log('\n=� Step 5: Updating analysis report...');
      const reportResult = await updateAnalysisReportService.saveAnalysisCycle({
        sessionId,
        tenantId,
        analysis: analysisResult.analysis!,
        suggestions,
        conversationContext: {
          messageCount: historyResult.messages?.length || 0,
          userMessages: historyResult.messages?.filter(m => m.sender === 'user').length || 0,
          agentMessages: historyResult.messages?.filter(m => m.sender === 'agent').length || 0,
          ragUsage: historyResult.messages?.filter(m => m.metadata?.ragNeeded).length || 0,
          documentsUsed: historyResult.messages?.reduce((total, m) => total + (m.metadata?.documentsUsed || 0), 0) || 0,
          hasSummary: !!historyResult.summary
        }
      });

      if (!reportResult.success) {
        console.error('L Failed to save analysis report:', reportResult.error);
        return {
          success: false,
          error: `Failed to save analysis report: ${reportResult.error}`
        };
      }

      console.log(` Analysis report saved`);
      console.log(`  - Cycle ID: ${reportResult.cycleId}`);
      console.log(`  - Cycle Number: ${reportResult.cycleNumber}`);

      console.log('\n<� Analysis cycle completed successfully!');
      console.log('=====================================');

      return {
        success: true,
        cycleId: reportResult.cycleId,
        cycleNumber: reportResult.cycleNumber,
        analysis: analysisResult.analysis,
        suggestions
      };

    } catch (error) {
      console.error('L Error in analysis cycle:', error);
      
      return {
        success: false,
        error: `Analysis cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const analysisCycleService = new AnalysisCycleService();