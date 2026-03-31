import { firestore } from '../../config/firebase';

interface GetPreviousSessionsParams {
  agentId: string;
  tenantId: string;
  limit?: number;
}

interface TrainingSessionSummary {
  sessionId: string;
  agentId: string;
  mode: 'chat' | 'call';
  status: string;
  createdAt: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  duration: number;
  totalInteractions: number;
}

interface GetPreviousSessionsResult {
  success: boolean;
  sessions?: TrainingSessionSummary[];
  error?: string;
}

export const getPreviousSessions = async ({
  agentId,
  tenantId,
  limit = 20
}: GetPreviousSessionsParams): Promise<GetPreviousSessionsResult> => {
  try {
    console.log(`Fetching previous sessions - agentId: ${agentId}, tenantId: ${tenantId}, limit: ${limit}`);
    
    // First, try to get all sessions for this tenant and filter in memory
    // This avoids the need for a composite index
    const sessionsRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('trainingSessions')
      .orderBy('createdAt', 'desc')
      .limit(limit * 2); // Get more to account for filtering

    const snapshot = await sessionsRef.get();

    if (snapshot.empty) {
      return {
        success: true,
        sessions: []
      };
    }

    const sessions: TrainingSessionSummary[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Filter by agentId in memory
      if (data.agentId !== agentId) {
        return; // Skip sessions for other agents
      }
      
      // Calculate session duration if ended
      let duration = 0;
      if (data.endedAt && data.startedAt) {
        const start = new Date(data.startedAt).getTime();
        const end = new Date(data.endedAt).getTime();
        duration = Math.round((end - start) / 1000 / 60); // Duration in minutes
      } else if (data.stats?.duration) {
        duration = Math.round(data.stats.duration / 60); // Convert seconds to minutes
      }

      sessions.push({
        sessionId: data.sessionId || doc.id,
        agentId: data.agentId,
        mode: data.mode || 'chat',
        status: data.status || 'unknown',
        createdAt: data.createdAt,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        messageCount: data.stats?.messageCount || (data.messages?.length || 0),
        duration,
        totalInteractions: data.stats?.totalInteractions || 0
      });
    });
    
    // Apply the limit after filtering
    const limitedSessions = sessions.slice(0, limit);

    console.log(`Retrieved ${limitedSessions.length} previous sessions for agent: ${agentId} (from ${sessions.length} total)`);

    return {
      success: true,
      sessions: limitedSessions
    };

  } catch (error: any) {
    console.error('Error fetching previous training sessions:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Check for Firestore index error
    if (error.code === 9 || error.message?.includes('index')) {
      return {
        success: false,
        error: 'Database index required. Please check server logs for the index creation link.'
      };
    }
    
    return {
      success: false,
      error: `Failed to fetch previous sessions: ${error.message}`
    };
  }
};