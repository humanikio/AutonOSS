import apiClient from './client';

export interface CallLog {
  id: string;
  tenantId: string;
  agentId: string;
  conversationId: string;
  status: string;
  userId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  cost: number;
  transcript: TranscriptTurn[];
  analysis: CallAnalysis;
  metadata: CallMetadata;
  audioUrl?: string;
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

export interface CallAnalyticsSummary {
  totalCalls: number;
  totalDuration: number;
  totalCost: number;
  successfulCalls: number;
  averageCallDuration: number;
  callsByAgent: Record<string, number>;
}

export interface GetCallLogsOptions {
  agentId?: string;
  limit?: number;
  startAfter?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetCallLogsResponse {
  success: boolean;
  data: CallLog[];
  hasMore: boolean;
  timestamp: string;
}

export interface GetAnalyticsSummaryResponse {
  success: boolean;
  data: CallAnalyticsSummary;
  timestamp: string;
}

export interface GetCallLogResponse {
  success: boolean;
  data: CallLog;
  timestamp: string;
}

export const callAnalyticsApi = {
  async getCallLogs(options: GetCallLogsOptions = {}): Promise<GetCallLogsResponse> {
    const params = new URLSearchParams();
    
    if (options.agentId) params.append('agentId', options.agentId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.startAfter) params.append('startAfter', options.startAfter);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const response = await apiClient.get(`/call-analytics/logs?${params}`);
    return response.data;
  },

  async getAnalyticsSummary(startDate?: string, endDate?: string): Promise<GetAnalyticsSummaryResponse> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/call-analytics/summary?${params}`);
    return response.data;
  },

  async getCallLog(conversationId: string): Promise<GetCallLogResponse> {
    const response = await apiClient.get(`/call-analytics/logs/${conversationId}`);
    return response.data;
  }
};