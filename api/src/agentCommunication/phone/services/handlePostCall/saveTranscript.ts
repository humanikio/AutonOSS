import admin from 'firebase-admin';

interface SaveTranscriptParams {
  tenantId: string;
  contactId?: string;
  conversationId: string; // ElevenLabs conversationId for mapping/transcript collection
  localConversationId?: string; // Local conversationId for phone record updates
  transcript: any[];
  analysis?: any;
  metadata?: any;
}

export const saveTranscript = async (params: SaveTranscriptParams): Promise<void> => {
  const { tenantId, contactId, conversationId, localConversationId, transcript, analysis, metadata } = params;

  try {
    const db = admin.firestore();
    const transcriptData = {
      transcript: transcript,
      analysis: analysis || null,
      metadata: metadata || null,
      transcriptSavedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log(`Saving transcript for conversation: ${conversationId} (local: ${localConversationId})`);

    // Update in the contact's phoneRecords subcollection if contactId exists
    // Use localConversationId for phone record path (NOT ElevenLabs conversationId)
    if (contactId && localConversationId) {
      const phoneRecordRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('phoneRecords')
        .doc(localConversationId); // Use local ID for phone record

      await phoneRecordRef.update({
        ...transcriptData,
        status: 'transcribed', // Update status to show transcript is available
        callSummaryTitle: analysis?.call_summary_title || null,
        transcriptSummary: analysis?.transcript_summary || null,
        duration: metadata?.call_duration_secs || null,
        direction: metadata?.phone_call?.direction || 'outbound', // Default to outbound for agent calls
        // Store agent name if available
        agentName: metadata?.agent_name || null
      });

      console.log(`✅ Updated phone record ${localConversationId} with transcript for contact: ${contactId}`);
    }

    // Always update the mapping document (for all records)
    const mappingRef = db
      .collection('phoneRecordIdMapping')
      .doc(conversationId);

    await mappingRef.update({
      ...transcriptData,
      hasTranscript: true
    });

    // Also create a separate transcript document for easier querying
    const transcriptDocRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('callTranscripts')
      .doc(conversationId);

    await transcriptDocRef.set({
      conversationId,
      tenantId,
      contactId: contactId || null,
      transcript,
      analysis: analysis || null,
      metadata: metadata || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully saved transcript for conversation ${conversationId}`);

  } catch (error) {
    console.error('Error saving transcript:', error);
    throw new Error(`Failed to save transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};