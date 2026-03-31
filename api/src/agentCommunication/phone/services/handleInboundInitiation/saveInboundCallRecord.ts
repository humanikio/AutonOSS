import { saveCallRecordFirestore } from '../startAgentPhonecall/saveCallRecordFirestore';

export interface InboundCallRecordParams {
  tenantId: string;
  agentId: string;
  contactId: string;
  phoneNumber: string;
  conversationId: string;
  callSid: string;
}

/**
 * Saves inbound call record, creates conversation and call initiated message
 * Uses existing saveCallRecordFirestore to ensure post-call webhooks can find the mapping
 * Now also creates proper conversation and message tracking for UI display
 * 
 * @param params - Inbound call record parameters
 */
export async function saveInboundCallRecord(params: InboundCallRecordParams): Promise<void> {
  try {
    console.log(`📝 Saving inbound call record:`);
    console.log(`   - Phone Record ID (local): ${params.conversationId}`);
    console.log(`   - Call SID: ${params.callSid}`);
    console.log(`   - Contact: ${params.contactId}`);
    console.log(`   - Phone: ${params.phoneNumber}`);

    // Use existing saveCallRecordFirestore service
    // This creates:
    // 1. Phone record with phoneRecordId = params.conversationId (local generated ID)
    // 2. Mapping document with phoneRecordId
    // 3. Unified conversation (or finds existing) and returns actualConversationId
    // 4. Updates mapping with actualConversationId for post-call webhook resolution
    await saveCallRecordFirestore({
      tenantId: params.tenantId,
      agentId: params.agentId,
      contactId: params.contactId,
      phoneNumber: params.phoneNumber,
      conversationId: params.conversationId, // This is the phone record ID (local generated)
      callSid: params.callSid,
      direction: 'inbound'
    });

    console.log(`✅ Inbound call record and conversation tracking saved successfully`);
    console.log(`   - Mapping: /phoneRecordIdMapping/${params.conversationId}`);
    console.log(`   - Phone record: /tenants/${params.tenantId}/contacts/${params.contactId}/phoneRecords/${params.conversationId}`);
    console.log(`   - Mapping contains actualConversationId for webhook resolution`);

  } catch (error) {
    console.error('❌ Failed to save inbound call record:', error);
    throw new Error(`Inbound call record save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}