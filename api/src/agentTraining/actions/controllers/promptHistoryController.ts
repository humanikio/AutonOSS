import { Request, Response } from 'express';
import { firestore } from '../../../config/firebase';

export const promptHistoryController = {
  // GET /api/agent-training/actions/:actionId/prompt/history
  getPromptHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId } = req.query;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const historyRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('agents')
        .doc(agentId as string)
        .collection('actions')
        .doc(actionId)
        .collection('promptHistory');

      const snapshot = await historyRef
        .orderBy('version', 'desc')
        .limit(4)
        .get();

      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        data: history,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting prompt history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prompt history',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/agent-training/actions/:actionId/prompt/rollback
  rollbackPrompt: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const { agentId, version } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!agentId || version === undefined) {
        res.status(400).json({
          success: false,
          error: 'agentId and version are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get the historical version
      const historyRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('agents')
        .doc(agentId)
        .collection('actions')
        .doc(actionId)
        .collection('promptHistory')
        .doc(`v${version}`);

      const historyDoc = await historyRef.get();
      if (!historyDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Version not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const historicalData = historyDoc.data();
      
      // Get current action to save its prompt to history before rollback
      const actionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('agents')
        .doc(agentId)
        .collection('actions')
        .doc(actionId);

      const actionDoc = await actionRef.get();
      if (!actionDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Action not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const currentAction = actionDoc.data();
      const currentVersion = currentAction?.promptVersion || 1;
      const timestamp = new Date().toISOString();

      // Save current prompt to history first
      if (currentAction?.prompt) {
        const currentHistoryRef = firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('agents')
          .doc(agentId)
          .collection('actions')
          .doc(actionId)
          .collection('promptHistory')
          .doc(`v${currentVersion}`);

        await currentHistoryRef.set({
          version: currentVersion,
          prompt: currentAction.prompt,
          understanding: currentAction.understanding || {},
          updatedBy: userId,
          updatedAt: timestamp,
          rollbackFrom: version
        });
      }

      // Update action with rolled back prompt
      await actionRef.update({
        prompt: historicalData?.prompt || '',
        understanding: historicalData?.understanding || {},
        promptVersion: currentVersion + 1,
        updatedAt: timestamp,
        lastPromptUpdate: timestamp,
        rolledBackFrom: version
      });

      // Clean up old versions (keep only last 4)
      await cleanupOldPromptHistory(tenantId, agentId, actionId);

      console.log(`✅ Action ${actionId} rolled back to version ${version}`);

      res.status(200).json({
        success: true,
        message: `Rolled back to version ${version}`,
        data: {
          newVersion: currentVersion + 1,
          rolledBackFrom: version,
          prompt: historicalData?.prompt || ''
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error rolling back prompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rollback prompt',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Helper function to clean up old prompt history
async function cleanupOldPromptHistory(tenantId: string, agentId: string, actionId: string): Promise<void> {
  try {
    const historyRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('actions')
      .doc(actionId)
      .collection('promptHistory');

    const snapshot = await historyRef.orderBy('version', 'desc').get();
    
    // Delete versions beyond the 4 most recent
    if (snapshot.docs.length > 4) {
      const batch = firestore.batch();
      const docsToDelete = snapshot.docs.slice(4);
      
      docsToDelete.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }
  } catch (error) {
    console.error('Error cleaning up prompt history:', error);
    // Don't throw - this is cleanup
  }
}