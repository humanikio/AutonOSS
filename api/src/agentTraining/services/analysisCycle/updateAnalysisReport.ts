import { firestore } from '../../../config/firebase';
import * as admin from 'firebase-admin';
import { ConfigSuggestions } from './generateSuggestions';

/**
 * Service for updating and saving analysis cycle reports to Firestore
 * Maintains a record of all analysis cycles for a training session
 */

export interface AnalysisReportRequest {
  sessionId: string;
  tenantId: string;
  analysis: string;
  suggestions?: ConfigSuggestions;
  conversationContext: {
    messageCount: number;
    userMessages: number;
    agentMessages: number;
    ragUsage: number;
    documentsUsed: number;
    hasSummary: boolean;
  };
}

export interface AnalysisReportResult {
  success: boolean;
  cycleId?: string;
  cycleNumber?: number;
  error?: string;
}

export class UpdateAnalysisReportService {
  /**
   * Save analysis cycle results to Firestore
   */
  async saveAnalysisCycle(request: AnalysisReportRequest): Promise<AnalysisReportResult> {
    try {
      const { sessionId, tenantId, analysis, suggestions, conversationContext } = request;
      
      console.log(`=� Saving analysis cycle for session: ${sessionId}`);

      // Step 1: Get current cycle number
      console.log('  " Step 1: Determining cycle number...');
      const cycleNumber = await this.getNextCycleNumber(tenantId, sessionId);
      
      console.log(`   This will be cycle #${cycleNumber}`);

      // Step 2: Generate cycle ID
      const cycleId = `cycle_${cycleNumber}_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Step 3: Build analysis cycle document
      console.log('  " Step 3: Building analysis cycle document...');
      const cycleDoc = {
        // Metadata
        cycleId,
        cycleNumber,
        sessionId,
        tenantId,
        timestamp,
        status: 'completed',
        
        // Analysis results
        analysis,
        suggestionsGenerated: !!suggestions,
        suggestions: suggestions || null,
        
        // Conversation context
        conversationContext,
        
        // Processing info
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '1.0'
      };

      console.log(`   Analysis cycle document built`);
      console.log(`    - Analysis length: ${analysis.length} chars`);
      console.log(`    - Has suggestions: ${!!suggestions}`);
      console.log(`    - Message count: ${conversationContext.messageCount}`);

      // Step 4: Save to Firestore
      console.log('  " Step 4: Saving to Firestore...');
      const cycleRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('analysisCycles')
        .doc(cycleId);

      await cycleRef.set(cycleDoc);
      console.log(`   Analysis cycle saved to Firestore: ${cycleRef.path}`);

      // Step 5: Update session metadata
      console.log('  " Step 5: Updating session metadata...');
      await this.updateSessionMetadata(tenantId, sessionId, cycleNumber, timestamp);
      console.log(`   Session metadata updated`);

      // Step 6: Save detailed analysis to subcollection for organization
      console.log('  " Step 6: Saving detailed analysis...');
      const detailsRef = cycleRef.collection('details').doc('analysis');
      await detailsRef.set({
        fullAnalysis: analysis,
        suggestions: suggestions || null,
        generatedAt: timestamp,
        processingMetrics: {
          analysisLength: analysis.length,
          suggestionFields: suggestions ? Object.keys(suggestions).length : 0,
          contextMessageCount: conversationContext.messageCount
        }
      });
      console.log(`   Detailed analysis saved`);

      console.log(' Analysis cycle saved successfully');

      return {
        success: true,
        cycleId,
        cycleNumber
      };

    } catch (error) {
      console.error('L Error saving analysis cycle:', error);
      
      return {
        success: false,
        error: `Failed to save analysis cycle: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get the next cycle number for a training session
   */
  private async getNextCycleNumber(tenantId: string, sessionId: string): Promise<number> {
    try {
      // Query existing cycles to determine next number
      const cyclesRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('analysisCycles');

      const snapshot = await cyclesRef.orderBy('cycleNumber', 'desc').limit(1).get();

      if (snapshot.empty) {
        return 1; // First cycle
      }

      const lastCycle = snapshot.docs[0].data();
      return (lastCycle.cycleNumber || 0) + 1;

    } catch (error) {
      console.warn('� Error determining cycle number, defaulting to 1:', error);
      return 1;
    }
  }

  /**
   * Update training session metadata with latest cycle info
   */
  private async updateSessionMetadata(
    tenantId: string, 
    sessionId: string, 
    cycleNumber: number, 
    timestamp: string
  ): Promise<void> {
    try {
      const sessionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId);

      await sessionRef.update({
        // Analysis metadata
        'analysisInfo.totalCycles': cycleNumber,
        'analysisInfo.lastAnalysisAt': timestamp,
        'analysisInfo.lastCycleNumber': cycleNumber,
        
        // Session timestamps
        lastAnalyzedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      // Non-blocking error - log but don't fail the cycle save
      console.warn('� Failed to update session metadata (non-blocking):', error);
    }
  }

  /**
   * Get all analysis cycles for a training session
   */
  async getAnalysisCycles(tenantId: string, sessionId: string): Promise<{
    success: boolean;
    cycles?: Array<{
      cycleId: string;
      cycleNumber: number;
      timestamp: string;
      analysis: string;
      suggestions?: ConfigSuggestions;
      conversationContext: any;
    }>;
    error?: string;
  }> {
    try {
      console.log(`=� Retrieving analysis cycles for session: ${sessionId}`);

      const cyclesRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('analysisCycles');

      const snapshot = await cyclesRef.orderBy('cycleNumber', 'asc').get();

      if (snapshot.empty) {
        return {
          success: true,
          cycles: []
        };
      }

      const cycles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          cycleId: data.cycleId,
          cycleNumber: data.cycleNumber,
          timestamp: data.timestamp,
          analysis: data.analysis,
          suggestions: data.suggestions || undefined,
          conversationContext: data.conversationContext
        };
      });

      console.log(` Retrieved ${cycles.length} analysis cycles`);

      return {
        success: true,
        cycles
      };

    } catch (error) {
      console.error('L Error retrieving analysis cycles:', error);
      
      return {
        success: false,
        error: `Failed to retrieve analysis cycles: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get latest analysis cycle for a training session
   */
  async getLatestAnalysisCycle(tenantId: string, sessionId: string): Promise<{
    success: boolean;
    cycle?: {
      cycleId: string;
      cycleNumber: number;
      timestamp: string;
      analysis: string;
      suggestions?: ConfigSuggestions;
    };
    error?: string;
  }> {
    try {
      console.log(`= Getting latest analysis cycle for session: ${sessionId}`);

      const cyclesRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('analysisCycles');

      const snapshot = await cyclesRef.orderBy('cycleNumber', 'desc').limit(1).get();

      if (snapshot.empty) {
        return {
          success: true,
          cycle: undefined
        };
      }

      const data = snapshot.docs[0].data();
      const cycle = {
        cycleId: data.cycleId,
        cycleNumber: data.cycleNumber,
        timestamp: data.timestamp,
        analysis: data.analysis,
        suggestions: data.suggestions || undefined
      };

      console.log(` Retrieved latest analysis cycle: #${cycle.cycleNumber}`);

      return {
        success: true,
        cycle
      };

    } catch (error) {
      console.error('L Error retrieving latest analysis cycle:', error);
      
      return {
        success: false,
        error: `Failed to retrieve latest analysis cycle: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const updateAnalysisReportService = new UpdateAnalysisReportService();