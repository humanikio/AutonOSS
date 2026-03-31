import { firestore } from '../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unified conversation interface
 * NO channel property - all channels (SMS, PHONE, EMAIL, WHATSAPP) share the same conversation
 */
export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  status: 'open' | 'closed';
  assigned_user_id?: string;
  last_message_at: FirebaseFirestore.Timestamp;
  created_at: FirebaseFirestore.Timestamp;
  unread_count: number;
  last_read_at?: FirebaseFirestore.Timestamp;
}

/**
 * Find or create a unified conversation for a contact
 *
 * This is the SINGLE SOURCE OF TRUTH for conversation resolution across ALL channels.
 *
 * Pattern (matches SMS inbound exactly):
 * 1. Query for ANY open conversation (no channel filter)
 * 2. If found, return existing conversation ID
 * 3. If not found, create new conversation with clean UUID
 *
 * This ensures:
 * - All channels (SMS, PHONE, EMAIL, WHATSAPP) share the same conversation
 * - No duplicate conversations per contact
 * - Clean UUID conversation IDs (not phone-specific or channel-specific IDs)
 * - Frontend can query without channel filters
 *
 * @param tenantId - The tenant ID
 * @param contactId - The contact ID
 * @returns Promise<string> - The conversation ID (existing or newly created)
 */
export async function findOrCreateConversation(
  tenantId: string,
  contactId: string
): Promise<string> {
  console.log(`🔍 Finding or creating UNIFIED conversation for tenant ${tenantId}, contact ${contactId}`);

  try {
    // Look for existing open conversation (NO channel filter - unified for all channels)
    const conversationQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .doc(contactId)
      .collection('conversations')
      .where('status', '==', 'open')
      .orderBy('last_message_at', 'desc')
      .limit(1)
      .get();

    if (!conversationQuery.empty) {
      const existingConversationId = conversationQuery.docs[0].id;
      console.log(`✅ Found existing UNIFIED conversation: ${existingConversationId}`);

      // Ensure contact document has conversationId field set
      const contactRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId);

      const contactDoc = await contactRef.get();
      if (contactDoc.exists && contactDoc.data()?.conversationId !== existingConversationId) {
        console.log(`📝 Updating contact with conversationId: ${existingConversationId}`);
        await contactRef.update({
          conversationId: existingConversationId,
          updated_at: admin.firestore.Timestamp.now()
        });
      }

      return existingConversationId;
    }

    // Create new conversation with clean UUID
    const newConversationId = uuidv4();
    const conversationRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .doc(contactId)
      .collection('conversations')
      .doc(newConversationId);

    const conversationData: Conversation = {
      id: newConversationId,
      tenant_id: tenantId,
      contact_id: contactId,
      // NO channel property - unified conversation for all channels
      status: 'open',
      last_message_at: admin.firestore.Timestamp.now(),
      created_at: admin.firestore.Timestamp.now(),
      unread_count: 0,
      last_read_at: admin.firestore.Timestamp.now()
    };

    await conversationRef.set(conversationData);
    console.log(`✅ Created new UNIFIED conversation: ${newConversationId}`);

    // Update contact document with conversationId
    const contactRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .doc(contactId);

    await contactRef.update({
      conversationId: newConversationId,
      updated_at: admin.firestore.Timestamp.now()
    });
    console.log(`📝 Updated contact with conversationId: ${newConversationId}`);

    return newConversationId;

  } catch (error) {
    console.error(`❌ Error finding or creating unified conversation:`, error);
    throw new Error(`Failed to find or create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
