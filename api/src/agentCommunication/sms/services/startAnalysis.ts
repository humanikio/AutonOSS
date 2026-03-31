/**
 * Service for triggering analysis cycles for training sessions
 * Makes direct service calls to the analysis cycle service
 */

import { analysisCycleService } from '../../../agentTraining/services/analysisCycle';

export interface StartAnalysisRequest {
  sessionId: string;
  tenantId: string;
  agentId: string;
  messageCount?: number; // Current message count for analysis timing
}

export interface StartAnalysisResult {
  success: boolean;
  cycleId?: string;
  cycleNumber?: number;
  analysis?: string;
  suggestions?: any;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
}

export class StartAnalysisService {
  constructor() {
    // Service now makes direct calls to analysis cycle service
  }

  /**
   * Trigger an analysis cycle for a training session
   */
  async triggerAnalysisCycle(request: StartAnalysisRequest): Promise<StartAnalysisResult> {
    try {
      const { sessionId, tenantId, agentId, messageCount } = request;
      
      console.log(`= Triggering analysis cycle for training session: ${sessionId}`);
      console.log(`  - Agent ID: ${agentId}`);
      console.log(`  - Message count: ${messageCount || 'Unknown'}`);

      // Step 1: Check if analysis should be triggered based on message count
      const shouldAnalyze = this.shouldTriggerAnalysis(messageCount || 0);
      
      if (!shouldAnalyze.trigger) {
        console.log(`⏭️ Skipping analysis: ${shouldAnalyze.reason}`);
        return {
          success: true,
          skipped: true,
          skipReason: shouldAnalyze.reason
        };
      }

      console.log(`✅ Analysis criteria met: ${shouldAnalyze.reason}`);

      // Step 2: Call analysis cycle service directly
      console.log('=📡 Making direct service call to analysis cycle...');
      
      const analysisResult = await analysisCycleService.runAnalysisCycle({
        sessionId,
        tenantId,
        agentId
      });

      if (!analysisResult.success) {
        console.error(`❌ Analysis cycle failed: ${analysisResult.error}`);
        
        return {
          success: false,
          error: analysisResult.error || 'Analysis cycle failed'
        };
      }

      console.log(`✅ Analysis cycle completed successfully`);
      console.log(`  - Cycle ID: ${analysisResult.cycleId}`);
      console.log(`  - Cycle Number: ${analysisResult.cycleNumber}`);
      console.log(`  - Has suggestions: ${analysisResult.suggestions ? 'Yes' : 'No'}`);

      return {
        success: true,
        cycleId: analysisResult.cycleId,
        cycleNumber: analysisResult.cycleNumber,
        analysis: analysisResult.analysis,
        suggestions: analysisResult.suggestions
      };

    } catch (error) {
      console.error('❌ Error triggering analysis cycle:', error);
      
      return {
        success: false,
        error: `Failed to trigger analysis cycle: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Determine if analysis should be triggered based on conversation state
   */
  private shouldTriggerAnalysis(messageCount: number): { trigger: boolean; reason: string } {
    // Always trigger analysis for immediate feedback
    return {
      trigger: true,
      reason: `Analyzing after message ${messageCount}`
    };
    
    // Previous logic kept for reference (can be re-enabled if needed)
    /*
    // Analysis triggering logic based on message patterns
    
    // Don't analyze on the first few messages - let conversation develop
    if (messageCount < 4) {
      return {
        trigger: false,
        reason: `Too few messages (${messageCount}/4 minimum)`
      };
    }

    // Trigger analysis every 8-10 messages to avoid over-analyzing
    if (messageCount % 8 === 0) {
      return {
        trigger: true,
        reason: `Message threshold reached (${messageCount} messages, analyzing every 8)`
      };
    }

    // Also trigger after certain key message counts for thorough analysis
    const keyThresholds = [6, 12, 20, 30, 50];
    if (keyThresholds.includes(messageCount)) {
      return {
        trigger: true,
        reason: `Key conversation milestone (${messageCount} messages)`
      };
    }

    return {
      trigger: false,
      reason: `Analysis not needed yet (${messageCount} messages)`
    };
    */
  }

  /**
   * Trigger immediate analysis (bypass normal triggering logic)
   */
  async forceAnalysisCycle(request: StartAnalysisRequest): Promise<StartAnalysisResult> {
    console.log(`=🔄 Force-triggering analysis cycle for session: ${request.sessionId}`);
    
    try {
      console.log('=📡 Making direct service call to analysis cycle (force)...');
      
      const analysisResult = await analysisCycleService.runAnalysisCycle({
        sessionId: request.sessionId,
        tenantId: request.tenantId,
        agentId: request.agentId
      });
      
      return {
        success: analysisResult.success,
        cycleId: analysisResult.cycleId,
        cycleNumber: analysisResult.cycleNumber,
        analysis: analysisResult.analysis,
        suggestions: analysisResult.suggestions,
        error: analysisResult.error
      };

    } catch (error) {
      console.error('❌ Error force-triggering analysis:', error);
      
      return {
        success: false,
        error: `Force analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get analysis configuration and timing settings
   */
  getAnalysisConfig(): {
    messageThresholds: number[];
    intervalTrigger: number;
    minimumMessages: number;
    alwaysAnalyze: boolean;
  } {
    return {
      messageThresholds: [6, 12, 20, 30, 50], // Legacy: Specific message counts that trigger analysis
      intervalTrigger: 8, // Legacy: Analyze every N messages after minimum
      minimumMessages: 0, // Always analyze - no minimum required
      alwaysAnalyze: true // New: Always trigger analysis for immediate feedback
    };
  }
}

export const startAnalysisService = new StartAnalysisService();