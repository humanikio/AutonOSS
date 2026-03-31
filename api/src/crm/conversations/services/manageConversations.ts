import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';

export interface ManageConversationRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  updates: {
    isStarred?: boolean;
    status?: 'open' | 'closed';
    assigned_user_id?: string;
    unread_count?: number;
    last_read_at?: FirebaseFirestore.Timestamp;
  };
}


export class ManageConversationsService {
  async updateConversation(request: ManageConversationRequest): Promise<void> {
    const { tenantId, contactId, conversationId, updates } = request;
    
    console.log(`🌟 Updating conversation ${conversationId} for contact ${contactId} in tenant ${tenantId}`, updates);
    
    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);
      
      // Check if conversation exists
      const conversationDoc = await conversationRef.get();
      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }
      
      // Update the conversation with timestamp
      const updateData = {
        ...updates,
        last_updated_at: admin.firestore.Timestamp.now()
      };
      
      await conversationRef.update(updateData);
      
      console.log(`✅ Successfully updated conversation ${conversationId}`);
    } catch (error) {
      console.error(`❌ Error updating conversation:`, error);
      throw error;
    }
  }
  
  async toggleStar(tenantId: string, contactId: string, conversationId: string): Promise<boolean> {
    console.log(`⭐ Toggling star for conversation ${conversationId}`);
    
    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);
      
      // Get current starred status
      const conversationDoc = await conversationRef.get();
      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }
      
      const currentData = conversationDoc.data();
      const currentStarred = currentData?.isStarred || false;
      const newStarred = !currentStarred;
      
      // Update with new starred status
      await conversationRef.update({
        isStarred: newStarred,
        last_updated_at: admin.firestore.Timestamp.now()
      });
      
      console.log(`✅ Conversation ${conversationId} ${newStarred ? 'starred' : 'unstarred'}`);
      return newStarred;
    } catch (error) {
      console.error(`❌ Error toggling star:`, error);
      throw error;
    }
  }
  
  async getConversation(tenantId: string, contactId: string, conversationId: string) {
    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);
      
      const conversationDoc = await conversationRef.get();
      
      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }
      
      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      };
    } catch (error) {
      console.error(`❌ Error getting conversation:`, error);
      throw error;
    }
  }


}

export const manageConversationsService = new ManageConversationsService();