import { firestore } from '../config/firebase';
import crypto from 'crypto';

export interface CallLog {
  id: string;
  tenantId: string;
  agentId: string;
  conversationId: string;
  status: string;
  userId?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  cost: number; // in cents
  transcript: TranscriptTurn[];
  analysis: CallAnalysis;
  metadata: CallMetadata;
  audioUrl?: string; // Path to stored audio file
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptTurn {
  role: 'agent' | 'user';
  message: string;
  toolCalls?: any;
  toolResults?: any;
  feedback?: any;
  timeInCallSecs: number;
  conversationTurnMetrics?: any;
}

export interface CallAnalysis {
  evaluationCriteriaResults: Record<string, any>;
  dataCollectionResults: Record<string, any>;
  callSuccessful: 'success' | 'failure' | 'unknown';
  transcriptSummary: string;
}

export interface CallMetadata {
  startTimeUnixSecs: number;
  callDurationSecs: number;
  cost: number;
  deletionSettings: {
    deletionTimeUnixSecs: number;
    deletedLogsAtTimeUnixSecs?: number;
    deletedAudioAtTimeUnixSecs?: number;
    deletedTranscriptAtTimeUnixSecs?: number;
    deleteTranscriptAndPii: boolean;
    deleteAudio: boolean;
  };
  feedback: {
    overallScore?: number;
    likes: number;
    dislikes: number;
  };
  authorizationMethod: string;
  charging: {
    devDiscount: boolean;
  };
  terminationReason: string;
}

export interface ElevenLabsWebhookPayload {
  type: 'post_call_transcription' | 'post_call_audio';
  eventTimestamp: number;
  data: {
    agentId: string;
    conversationId: string;
    status?: string;
    userId?: string;
    transcript?: TranscriptTurn[];
    metadata?: CallMetadata;
    analysis?: CallAnalysis;
    conversationInitiationClientData?: any;
    fullAudio?: string; // base64 encoded audio for audio webhooks
  };
}

export class CallAnalyticsService {
  
  /**
   * Verify ElevenLabs webhook signature using HMAC
   */
  static verifyWebhookSignature(
    signature: string,
    body: string,
    secret: string
  ): boolean {
    try {
      const parts = signature.split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
      const hash = parts.find(p => p.startsWith('v0='))?.substring(3);
      
      if (!timestamp || !hash) {
        console.error('Invalid signature format');
        return false;
      }
      
      // Validate timestamp (within 30 minutes)
      const reqTimestamp = parseInt(timestamp) * 1000;
      const tolerance = Date.now() - 30 * 60 * 1000;
      if (reqTimestamp < tolerance) {
        console.error('Request expired');
        return false;
      }
      
      // Validate hash
      const message = `${timestamp}.${body}`;
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
      
      return hash === expectedHash;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process incoming transcription webhook from ElevenLabs
   */
  static async processTranscriptionWebhook(
    payload: ElevenLabsWebhookPayload,
    tenantId: string
  ): Promise<void> {
    try {
      console.log('<� Processing transcription webhook for conversation:', payload.data.conversationId);
      
      const { data } = payload;
      
      // Find the agent by ElevenLabs agent ID
      const agentsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callAgents')
        .where('elevenlabsAgentId', '==', data.agentId)
        .limit(1)
        .get();
      
      if (agentsSnapshot.empty) {
        console.error('Agent not found for ElevenLabs ID:', data.agentId);
        return;
      }
      
      const agent = agentsSnapshot.docs[0];
      const agentId = agent.id;
      
      // Create call log entry
      const callLog: CallLog = {
        id: data.conversationId,
        tenantId,
        agentId,
        conversationId: data.conversationId,
        status: data.status || 'completed',
        userId: data.userId,
        startTime: new Date(data.metadata!.startTimeUnixSecs * 1000),
        endTime: new Date((data.metadata!.startTimeUnixSecs + data.metadata!.callDurationSecs) * 1000),
        duration: data.metadata!.callDurationSecs,
        cost: data.metadata!.cost,
        transcript: data.transcript || [],
        analysis: data.analysis || {
          evaluationCriteriaResults: {},
          dataCollectionResults: {},
          callSuccessful: 'unknown',
          transcriptSummary: ''
        },
        metadata: data.metadata!,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store in Firestore
      await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callLogs')
        .doc(data.conversationId)
        .set(callLog);
      
      console.log(' Call log saved successfully:', data.conversationId);
      
    } catch (error) {
      console.error('Error processing transcription webhook:', error);
      throw error;
    }
  }

  /**
   * Process incoming audio webhook from ElevenLabs
   */
  static async processAudioWebhook(
    payload: ElevenLabsWebhookPayload,
    tenantId: string
  ): Promise<void> {
    try {
      console.log('<� Processing audio webhook for conversation:', payload.data.conversationId);
      
      const { data } = payload;
      
      if (!data.fullAudio) {
        console.error('No audio data in audio webhook');
        return;
      }
      
      // For now, we'll store the audio URL reference
      // In production, you might want to save the base64 audio to cloud storage
      // and store the URL instead
      
      // Update existing call log with audio information
      const callLogRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callLogs')
        .doc(data.conversationId);
      
      const callLogDoc = await callLogRef.get();
      if (callLogDoc.exists) {
        await callLogRef.update({
          audioUrl: `data:audio/mp3;base64,${data.fullAudio}`, // Store as data URL for now
          updatedAt: new Date()
        });
        console.log(' Audio data added to call log:', data.conversationId);
      } else {
        console.warn('Call log not found for audio webhook:', data.conversationId);
      }
      
    } catch (error) {
      console.error('Error processing audio webhook:', error);
      throw error;
    }
  }

  /**
   * Get call logs for a tenant with pagination
   */
  static async getCallLogs(
    tenantId: string,
    options: {
      agentId?: string;
      limit?: number;
      startAfter?: string;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<{ callLogs: CallLog[]; hasMore: boolean }> {
    try {
      let query: any = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callLogs')
        .orderBy('startTime', 'desc');
      
      // Filter by agent if specified
      if (options.agentId) {
        query = query.where('agentId', '==', options.agentId);
      }
      
      // Filter by date range if specified
      if (options.dateRange) {
        query = query
          .where('startTime', '>=', options.dateRange.start)
          .where('startTime', '<=', options.dateRange.end);
      }
      
      // Pagination
      if (options.startAfter) {
        const startAfterDoc = await firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('callLogs')
          .doc(options.startAfter)
          .get();
        
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }
      
      const limit = options.limit || 50;
      query = query.limit(limit + 1); // Get one extra to check if there are more
      
      const snapshot = await query.get();
      const callLogs = snapshot.docs
        .slice(0, limit)
        .map((doc: any) => ({ ...doc.data(), id: doc.id } as CallLog));
      
      const hasMore = snapshot.docs.length > limit;
      
      return { callLogs, hasMore };
      
    } catch (error) {
      console.error('Error getting call logs:', error);
      throw error;
    }
  }

  /**
   * Get call analytics summary for a tenant
   */
  static async getCallAnalyticsSummary(
    tenantId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalCalls: number;
    totalDuration: number;
    totalCost: number;
    successfulCalls: number;
    averageCallDuration: number;
    callsByAgent: Record<string, number>;
  }> {
    try {
      let query: any = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callLogs');
      
      if (dateRange) {
        query = query
          .where('startTime', '>=', dateRange.start)
          .where('startTime', '<=', dateRange.end);
      }
      
      const snapshot = await query.get();
      const callLogs = snapshot.docs.map((doc: any) => doc.data() as CallLog);
      
      const summary = {
        totalCalls: callLogs.length,
        totalDuration: callLogs.reduce((sum: number, call: CallLog) => sum + call.duration, 0),
        totalCost: callLogs.reduce((sum: number, call: CallLog) => sum + call.cost, 0),
        successfulCalls: callLogs.filter((call: CallLog) => call.analysis.callSuccessful === 'success').length,
        averageCallDuration: callLogs.length > 0 
          ? callLogs.reduce((sum: number, call: CallLog) => sum + call.duration, 0) / callLogs.length 
          : 0,
        callsByAgent: callLogs.reduce((acc: Record<string, number>, call: CallLog) => {
          acc[call.agentId] = (acc[call.agentId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      return summary;
      
    } catch (error) {
      console.error('Error getting call analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get a specific call log
   */
  static async getCallLog(
    tenantId: string,
    conversationId: string
  ): Promise<CallLog | null> {
    try {
      const doc = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('callLogs')
        .doc(conversationId)
        .get();
      
      return doc.exists ? ({ ...doc.data(), id: doc.id } as CallLog) : null;
      
    } catch (error) {
      console.error('Error getting call log:', error);
      throw error;
    }
  }
}