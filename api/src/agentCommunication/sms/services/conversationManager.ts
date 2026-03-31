import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { findOrCreateConversation } from '../../../contacts/utilities/conversationUtil';

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  status: 'open' | 'closed';
  assigned_user_id?: string;
  last_message_at: FirebaseFirestore.Timestamp;
  created_at: FirebaseFirestore.Timestamp;
  isStarred?: boolean;
}

export class ConversationManagerService {
  async findOrCreateConversation(tenantId: string, contactId: string): Promise<string> {
    // Use shared utility for unified conversation resolution
    return findOrCreateConversation(tenantId, contactId);
  }

  async findMostRecentConversation(tenantId: string, contactId: string): Promise<string | null> {
    console.log(`Finding most recent conversation for tenant ${tenantId}, contact ${contactId}`);

    try {
      const conversationQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .where('channel', '==', 'SMS')
        .limit(1)
        .get();

      if (!conversationQuery.empty) {
        const conversationId = conversationQuery.docs[0].id;
        console.log(`Found most recent conversation: ${conversationId}`);
        return conversationId;
      }

      console.log(`No conversations found for contact ${contactId}`);
      return null;

    } catch (error) {
      console.error(`Error finding most recent conversation:`, error);
      throw new Error(`Failed to find most recent conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const conversationManager = new ConversationManagerService();