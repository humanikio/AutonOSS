import admin from 'firebase-admin';
import { phoneConversationManager } from '../phoneConversationManager';

interface SaveCallRecordParams {
  tenantId: string;
  agentId: string;
  contactId?: string;
  phoneNumber: string;
  conversationId: string;
  callSid: string;
  direction?: 'inbound' | 'outbound';
}

interface PhoneRecord {
  id: string;
  tenantId: string;
  agentId: string;
  contactId?: string;
  phoneNumber: string;
  conversationId: string;
  callSid: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'completed' | 'failed' | 'transcribed';
  duration?: number;
  callSummaryTitle?: string;
  transcriptSummary?: string;
  audioUrl?: string;
  audioStoragePath?: string;
  transcript?: any[];
  analysis?: any;
  metadata?: any;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface PhoneRecordMapping {
  phoneRecordId: string;
  tenantId: string;
  agentId: string;
  contactId?: string;
  phoneNumber: string;
  actualConversationId?: string; // The real unified conversation ID for writing messages
  createdAt: FirebaseFirestore.Timestamp;
}

export const saveCallRecordFirestore = async (params: SaveCallRecordParams): Promise<void> => {
  const { tenantId, agentId, contactId, phoneNumber, conversationId, callSid, direction = 'outbound' } = params;

  try {
    const db = admin.firestore();
    const phoneRecordId = conversationId; // Use conversationId as phoneRecordId

    // Create phone record document
    const phoneRecord: PhoneRecord = {
      id: phoneRecordId,
      tenantId,
      agentId,
      contactId,
      phoneNumber,
      conversationId,
      callSid,
      direction,
      status: 'initiated',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Create mapping document
    const mappingRecord: PhoneRecordMapping = {
      phoneRecordId,
      tenantId,
      agentId,
      contactId,
      phoneNumber,
      createdAt: admin.firestore.Timestamp.now()
    };

    // Use batch to ensure both documents are created atomically
    const batch = db.batch();

    // Save phone record under tenant's contact
    if (contactId) {
      const phoneRecordRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('phoneRecords')
        .doc(phoneRecordId);

      batch.set(phoneRecordRef, phoneRecord);
    }

    // Save mapping document (always create this for post-call lookup)
    const mappingRef = db
      .collection('phoneRecordIdMapping')
      .doc(phoneRecordId);

    batch.set(mappingRef, mappingRecord);

    await batch.commit();

    console.log(`Successfully saved call record for conversation ${conversationId}:`, {
      phoneRecordId,
      tenantId,
      agentId,
      contactId,
      phoneNumber
    });

    // Step 2: Create conversation and call initiated message for UI tracking
    if (contactId) {
      console.log(`📞 Creating conversation and call initiated message for ${direction} call...`);

      // This returns the ACTUAL unified conversation ID (clean UUID)
      const actualConversationId = await phoneConversationManager.createCallInitiatedMessage({
        tenantId,
        contactId,
        agentId,
        phoneNumber,
        direction: direction as 'inbound' | 'outbound',
        callSid
      });

      console.log(`📞 Call tracking created for ${direction} call`);
      console.log(`   - Phone Record ID: ${phoneRecordId}`);
      console.log(`   - Actual Conversation ID: ${actualConversationId}`);

      // Step 3: Update mapping with actualConversationId for post-call webhook resolution
      await mappingRef.update({
        actualConversationId: actualConversationId,
        updatedAt: admin.firestore.Timestamp.now()
      });

      console.log(`✅ Mapping updated with actualConversationId for post-call resolution`);
    }

  } catch (error) {
    console.error('Error saving call record to Firestore:', error);
    throw new Error(`Failed to save call record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};