import admin from 'firebase-admin';

interface CallMapping {
  tenantId: string;
  agentId: string;
  contactId?: string;
  phoneNumber: string;
  localConversationId?: string; // The phone record ID (for phone record updates)
  actualConversationId?: string; // The REAL unified conversation ID (for writing messages)
}

interface WebhookFallbackData {
  agent_id?: string;
  conversation_initiation_client_data?: {
    dynamic_variables?: {
      localConversationId?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  metadata?: any;
}

export const findContactByPhoneRecord = async (
  conversationId: string,
  webhookFallbackData?: WebhookFallbackData,
  retryAttempt: number = 0
): Promise<CallMapping> => {
  try {
    const db = admin.firestore();
    const maxRetries = 3;
    const retryDelayMs = 1000 * Math.pow(2, retryAttempt); // Exponential backoff: 1s, 2s, 4s

    // Step 1: Try to get the mapping document using conversationId as phoneRecordId
    let mappingDoc = await db.collection('phoneRecordIdMapping').doc(conversationId).get();

    if (!mappingDoc.exists) {
      console.log(`No mapping found for conversation ID: ${conversationId}`);

      // Step 2: Check for localConversationId in dynamic variables (NEW LOGIC)
      const localConversationId = webhookFallbackData?.conversation_initiation_client_data?.dynamic_variables?.localConversationId;

      if (localConversationId) {
        console.log(`🔍 Checking for mapping using localConversationId: ${localConversationId}`);

        mappingDoc = await db.collection('phoneRecordIdMapping').doc(localConversationId).get();

        if (mappingDoc.exists) {
          console.log(`✅ Found mapping using localConversationId: ${localConversationId}`);

          // Create additional mapping for ElevenLabs conversationId so future webhooks can find it
          console.log(`🔗 Creating additional mapping for ElevenLabs conversationId: ${conversationId}`);
          const mappingData = mappingDoc.data()!;

          try {
            await db.collection('phoneRecordIdMapping').doc(conversationId).set({
              ...mappingData,
              phoneRecordId: conversationId,
              originalLocalConversationId: localConversationId,
              createdAt: admin.firestore.Timestamp.now(),
              createdVia: 'post_call_dual_mapping'
            });

            console.log(`✅ Created dual mapping: ${conversationId} → same contact data`);

            // DO NOT create duplicate phone record - use localConversationId for all phone record operations
            // The mapping is sufficient for resolving ElevenLabs conversationId to local data
          } catch (dualMappingError) {
            console.warn(`⚠️ Failed to create dual mapping/record, but continuing with original mapping:`, dualMappingError);
          }
        } else {
          console.log(`❌ No mapping found for localConversationId: ${localConversationId}`);
          throw new Error(`No mapping found for conversation ID: ${conversationId} or local conversation ID: ${localConversationId}`);
        }
      } else {
        // Step 3: No localConversationId available - implement retry logic for race condition
        if (retryAttempt < maxRetries) {
          console.log(`⏳ Retry ${retryAttempt + 1}/${maxRetries}: Waiting ${retryDelayMs}ms for dual mapping to be created by other webhook...`);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));

          // Recursive retry
          return findContactByPhoneRecord(conversationId, webhookFallbackData, retryAttempt + 1);
        } else {
          console.log(`❌ No localConversationId found in dynamic variables after ${maxRetries} retries`);
          throw new Error(`No mapping found for conversation ID: ${conversationId} and no localConversationId in dynamic variables (retried ${maxRetries} times)`);
        }
      }
    }
    
    const mappingData = mappingDoc.data();
    if (!mappingData) {
      throw new Error(`Invalid mapping data for conversation ID: ${conversationId}`);
    }

    // Extract IDs from mapping data
    // phoneRecordId: ID of the phone record document (for transcript/audio updates)
    // actualConversationId: The REAL unified conversation ID (for writing messages)
    // originalLocalConversationId: For dual mappings, this is the original phone record ID
    const phoneRecordId = mappingData.originalLocalConversationId || mappingData.phoneRecordId;
    const actualConversationId = mappingData.actualConversationId;

    console.log('Found phone record mapping:', {
      tenantId: mappingData.tenantId,
      agentId: mappingData.agentId,
      contactId: mappingData.contactId,
      phoneNumber: mappingData.phoneNumber,
      phoneRecordId: phoneRecordId,
      actualConversationId: actualConversationId
    });

    return {
      tenantId: mappingData.tenantId,
      agentId: mappingData.agentId,
      contactId: mappingData.contactId,
      phoneNumber: mappingData.phoneNumber,
      localConversationId: phoneRecordId, // Phone record ID for phone record updates
      actualConversationId: actualConversationId // Unified conversation ID for messages
    };
    
  } catch (error) {
    console.error('Error finding contact by phone record:', error);
    throw new Error(`Failed to find contact by phone record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};