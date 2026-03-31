import { firestore } from '../../../config/firebase';

export interface ActionDraftUpdate {
  proposedPrompt: string;
  understanding: {
    summary: string;
    behavior: string;
    tone: string;
    keyPoints: string[];
    confidence: number;
  };
  clarifyingQuestion?: string;
  suggestions?: string[];
}

export interface ActionResponse {
  message: string;
  draftUpdate?: ActionDraftUpdate;
  needsClarification: boolean;
  confidence: number;
}

export class ActionResponseHandler {
  private tenantId: string;
  private agentId: string;
  private actionId: string;

  constructor(tenantId: string, agentId: string, actionId: string) {
    this.tenantId = tenantId;
    this.agentId = agentId;
    // Handle "new" actions by generating a proper ID
    this.actionId = actionId === 'new' ? `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : actionId;
  }

  /**
   * Process AI response and handle any tool calls
   */
  async processResponse(aiResponse: any): Promise<ActionResponse> {
    try {
      let message = '';
      let draftUpdate: ActionDraftUpdate | undefined;
      let needsClarification = false;
      let confidence = 50;

      console.log('🔍 Processing AI Response:', JSON.stringify(aiResponse, null, 2));

      // aiResponse is now an array of content blocks from Claude
      if (Array.isArray(aiResponse)) {
        for (const block of aiResponse) {
          if (block.type === 'text') {
            // Text content
            message = block.text;
          } else if (block.type === 'tool_use') {
            // Tool use - check if it's our actionDraftUpdate tool
            if (block.name === 'actionDraftUpdate') {
              draftUpdate = await this.handleActionDraftUpdate(block.input);
              confidence = draftUpdate.understanding.confidence;
              needsClarification = !!draftUpdate.clarifyingQuestion;
            }
          }
        }
      } else {
        // Fallback for other formats
        if (typeof aiResponse === 'string') {
          message = aiResponse;
        } else if (aiResponse.text) {
          message = aiResponse.text;
        } else if (aiResponse.content) {
          message = aiResponse.content;
        }
      }

      // If no explicit message but we have draft update, create a message
      if (!message && draftUpdate) {
        message = this.generateResponseMessage(draftUpdate);
      }

      // Fallback if we still don't have a message
      if (!message) {
        message = 'I received your message and I\'m working on understanding your request.';
      }

      console.log('📝 Processed response - Message:', message);
      console.log('📋 Draft Update:', draftUpdate ? 'Present' : 'None');

      return {
        message,
        draftUpdate,
        needsClarification,
        confidence
      };
    } catch (error) {
      console.error('Error processing AI response:', error);
      throw new Error(`Failed to process response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle actionDraftUpdate tool call
   */
  private async handleActionDraftUpdate(toolArguments: any): Promise<ActionDraftUpdate> {
    try {
      let parsedArgs;
      
      // Parse arguments if they're a string
      if (typeof toolArguments === 'string') {
        parsedArgs = JSON.parse(toolArguments);
      } else {
        parsedArgs = toolArguments;
      }

      const draftUpdate: ActionDraftUpdate = {
        proposedPrompt: parsedArgs.proposedPrompt || '',
        understanding: {
          summary: parsedArgs.understanding?.summary || '',
          behavior: parsedArgs.understanding?.behavior || '',
          tone: parsedArgs.understanding?.tone || '',
          keyPoints: parsedArgs.understanding?.keyPoints || [],
          confidence: parsedArgs.understanding?.confidence || 0
        },
        clarifyingQuestion: parsedArgs.clarifyingQuestion,
        suggestions: parsedArgs.suggestions
      };

      // Note: Draft updates are now saved to session only, not main action document
      // Main action document will only be updated when user publishes/finalizes the action

      console.log(`💡 Action draft updated for ${this.actionId} with confidence ${draftUpdate.understanding.confidence}%`);
      return draftUpdate;
    } catch (error) {
      console.error('Error handling actionDraftUpdate:', error);
      throw new Error(`Failed to handle draft update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Draft updates are now only saved to sessions, not the main action document
  // Main action document will be updated only when user publishes the action

  /**
   * Generate a response message based on draft update
   */
  private generateResponseMessage(draftUpdate: ActionDraftUpdate): string {
    let message = `I've analyzed your request and generated a proposed prompt.\n\n`;
    
    message += `**Understanding Summary:** ${draftUpdate.understanding.summary}\n\n`;
    
    if (draftUpdate.understanding.confidence < 70 && draftUpdate.clarifyingQuestion) {
      message += `I have some questions to better understand your needs:\n`;
      message += `${draftUpdate.clarifyingQuestion}\n\n`;
    }

    if (draftUpdate.suggestions && draftUpdate.suggestions.length > 0) {
      message += `**Suggestions for improvement:**\n`;
      draftUpdate.suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
      message += `\n`;
    }

    message += `You can review the proposed prompt in the understanding area and make any adjustments needed.`;

    return message;
  }

  /**
   * Update action prompt with history tracking
   */
  async updateActionPrompt(newPrompt: string, userId: string): Promise<void> {
    try {
      const actionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId);

      // Get current action
      const actionDoc = await actionRef.get();
      if (!actionDoc.exists) {
        throw new Error('Action not found');
      }

      const currentData = actionDoc.data();
      const currentVersion = currentData?.promptVersion || 1;
      const timestamp = new Date().toISOString();

      // Save current prompt to history if it exists
      if (currentData?.prompt) {
        await this.savePromptHistory(currentData.prompt, currentVersion, userId);
      }

      // Update main action with new prompt
      await actionRef.update({
        prompt: newPrompt,
        promptVersion: currentVersion + 1,
        updatedAt: timestamp,
        lastPromptUpdate: timestamp,
        isDraft: false
      });

      console.log(`✅ Action prompt updated for ${this.actionId}, version ${currentVersion + 1}`);
    } catch (error) {
      console.error('Error updating action prompt:', error);
      throw new Error(`Failed to update prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save prompt to history (keep last 4 versions)
   */
  private async savePromptHistory(prompt: string, version: number, userId: string): Promise<void> {
    try {
      const historyRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('promptHistory')
        .doc(`v${version}`);

      await historyRef.set({
        version,
        prompt,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      });

      // Clean up old versions (keep only last 4)
      await this.cleanupOldPromptHistory();
    } catch (error) {
      console.error('Error saving prompt history:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Clean up old prompt history (keep only last 4 versions)
   */
  private async cleanupOldPromptHistory(): Promise<void> {
    try {
      const historyRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
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

  /**
   * Publish action from session understanding to main document
   */
  async publishActionFromSession(understanding: any, userId: string): Promise<void> {
    try {
      const actionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId);

      // Get current action
      const actionDoc = await actionRef.get();
      const currentData = actionDoc.exists ? actionDoc.data() : {};
      const currentVersion = currentData?.promptVersion || 0;
      const timestamp = new Date().toISOString();

      // Save current prompt to history if it exists
      if (currentData?.prompt) {
        await this.savePromptHistory(currentData.prompt, currentVersion, userId);
      }

      // Update main action document with session data
      const updateData: any = {
        prompt: understanding.proposedPrompt,
        promptVersion: currentVersion + 1,
        updatedAt: timestamp,
        lastPromptUpdate: timestamp,
        isDraft: false,
        isActive: true,
        publishedAt: timestamp,
        publishedBy: userId
      };

      // Add understanding data if available
      if (understanding.understanding) {
        updateData.understanding = {
          summary: understanding.understanding.summary || '',
          behavior: understanding.understanding.behavior || '',
          tone: understanding.understanding.tone || '',
          keyPoints: understanding.understanding.keyPoints || [],
          confidence: understanding.understanding.confidence || 0
        };
      }

      // If this is a new action, add initial data
      if (!actionDoc.exists) {
        updateData.createdAt = timestamp;
        updateData.createdBy = userId;
        updateData.agentId = this.agentId;
        updateData.tenantId = this.tenantId;
      }

      await actionRef.set(updateData, { merge: true });

      console.log(`🚀 Action published successfully: ${this.actionId}, version ${currentVersion + 1}`);
    } catch (error) {
      console.error('Error publishing action from session:', error);
      throw new Error(`Failed to publish action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update action status (active/inactive, draft/live)
   */
  async updateActionStatus(isActive: boolean, isDraft: boolean = false, userId: string): Promise<void> {
    try {
      const actionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId);

      // Get current action
      const actionDoc = await actionRef.get();
      if (!actionDoc.exists) {
        throw new Error('Action not found');
      }

      const timestamp = new Date().toISOString();

      // Update action status
      await actionRef.update({
        isActive,
        isDraft,
        updatedAt: timestamp,
        statusUpdatedBy: userId,
        statusUpdatedAt: timestamp
      });

      console.log(`🔄 Action status updated: ${this.actionId} - Active: ${isActive}, Draft: ${isDraft}`);
    } catch (error) {
      console.error('Error updating action status:', error);
      throw new Error(`Failed to update action status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete action and all associated data
   */
  async deleteAction(userId: string): Promise<void> {
    try {
      const actionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId);

      // Get current action to verify it exists
      const actionDoc = await actionRef.get();
      if (!actionDoc.exists) {
        throw new Error('Action not found');
      }

      // Use a batch to delete everything atomically
      const batch = firestore.batch();

      // Delete the main action document
      batch.delete(actionRef);

      // Delete prompt history subcollection
      const promptHistoryRef = actionRef.collection('promptHistory');
      const promptHistorySnapshot = await promptHistoryRef.get();
      promptHistorySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete chat sessions subcollection
      const chatSessionsRef = actionRef.collection('chatSessions');
      const chatSessionsSnapshot = await chatSessionsRef.get();
      chatSessionsSnapshot.docs.forEach(sessionDoc => {
        batch.delete(sessionDoc.ref);
        
        // Delete messages subcollection for each session
        // Note: Firestore batch has a 500 operation limit, so we'll handle this separately if needed
      });

      // Commit the batch
      await batch.commit();

      // Delete session messages separately if there are any (to avoid batch limit)
      for (const sessionDoc of chatSessionsSnapshot.docs) {
        const messagesRef = sessionDoc.ref.collection('messages');
        const messagesSnapshot = await messagesRef.get();
        
        if (messagesSnapshot.docs.length > 0) {
          const messageBatch = firestore.batch();
          messagesSnapshot.docs.forEach(messageDoc => {
            messageBatch.delete(messageDoc.ref);
          });
          await messageBatch.commit();
        }
      }

      console.log(`🗑️ Action deleted successfully: ${this.actionId} - All associated data removed`);
    } catch (error) {
      console.error('Error deleting action:', error);
      throw new Error(`Failed to delete action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}