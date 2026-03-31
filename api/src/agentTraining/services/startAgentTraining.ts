import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../../config/firebase';
import { createTestAgentService } from './startAgentTraining/createTestAgent';

interface StartTrainingSessionParams {
  agentId: string;
  tenantId: string;
  userId: string;
  mode: 'chat' | 'call';
}

interface TrainingSessionResult {
  sessionId: string;
  agentId: string;
  mode: 'chat' | 'call';
  status: 'active';
  createdAt: string;
  startedBy: string;
  testAgentCreated: boolean;
}

export const startAgentTraining = async ({
  agentId,
  tenantId,
  userId,
  mode
}: StartTrainingSessionParams): Promise<TrainingSessionResult> => {
  try {
    // Generate unique session ID
    const sessionId = uuidv4();
    const timestamp = new Date().toISOString();

    // Verify agent exists
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId);

    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error('Agent not found');
    }

    // Create training session document in Firestore
    const sessionData = {
      sessionId,
      agentId,
      tenantId,
      userId,
      mode,
      status: 'active',
      createdAt: timestamp,
      startedAt: timestamp,
      startedBy: userId,
      messages: [],
      events: [],
      metadata: {
        userAgent: null,
        ipAddress: null,
        platform: 'web'
      },
      stats: {
        messageCount: 0,
        duration: 0,
        totalInteractions: 0
      }
    };

    // Save session to Firestore
    const sessionRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('trainingSessions')
      .doc(sessionId);

    await sessionRef.set(sessionData);

    // Create test agent configuration copy for isolated training
    console.log(`🧪 Creating isolated test agent configuration for session: ${sessionId}`);
    const testAgentResult = await createTestAgentService.createTestAgent({
      originalAgentId: agentId,
      tenantId,
      sessionId
    });

    if (!testAgentResult.success) {
      console.error('❌ Failed to create test agent:', testAgentResult.error);
      // Don't fail the session creation - log error but continue
      console.warn('⚠️ Training session created without isolated test agent config');
    } else {
      console.log(`✅ Test agent configuration created successfully`);
    }

    // Update agent's last training session timestamp
    await agentRef.update({
      lastTrainingSession: timestamp,
      updatedAt: timestamp
    });

    // Return session info
    const result: TrainingSessionResult = {
      sessionId,
      agentId,
      mode,
      status: 'active',
      createdAt: timestamp,
      startedBy: userId,
      testAgentCreated: testAgentResult.success
    };

    console.log(`🎉 Training session created: ${sessionId} for agent: ${agentId}`);
    console.log(`  - Test agent isolated: ${testAgentResult.success ? 'Yes' : 'No'}`);
    console.log(`  - Mode: ${mode}`);
    console.log(`  - Started by: ${userId}`);
    
    return result;

  } catch (error: any) {
    console.error('Error starting agent training session:', error);
    throw new Error(`Failed to start training session: ${error.message}`);
  }
};