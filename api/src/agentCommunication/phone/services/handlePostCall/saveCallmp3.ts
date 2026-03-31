import admin from 'firebase-admin';

interface SaveCallMp3Params {
  tenantId: string;
  contactId: string;
  conversationId: string; // ElevenLabs conversationId for storage path
  localConversationId?: string; // Local conversationId for phone record updates
  audioBase64: string;
}

interface SaveCallMp3Result {
  audioUrl: string;
  storagePath: string;
}

export const saveCallMp3 = async (params: SaveCallMp3Params): Promise<SaveCallMp3Result> => {
  const { tenantId, contactId, conversationId, localConversationId, audioBase64 } = params;

  try {
    // Decode base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Define storage path
    const storagePath = `tenants/${tenantId}/contacts/${contactId}/phoneRecords/${conversationId}/recording.mp3`;
    
    console.log(`Saving audio file to Firebase Storage: ${storagePath}`);
    
    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    
    // Save the audio file
    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
        metadata: {
          tenantId,
          contactId,
          conversationId,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // Generate a signed URL for secure access (instead of making public)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year expiry
    });
    
    const publicUrl = signedUrl;
    
    console.log(`Audio file saved successfully: ${publicUrl}`);
    
    // Update the phone record in Firestore with the audio URL
    const db = admin.firestore();

    // Update in the contact's phoneRecords subcollection
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
        audioUrl: publicUrl,
        audioStoragePath: storagePath,
        audioUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed' // Mark as completed when audio is saved
      });
      
      console.log(`✅ Updated phone record ${localConversationId} with audio URL for contact: ${contactId}`);
    }
    
    // Also update the mapping document (for records without contactId)
    const mappingRef = db
      .collection('phoneRecordIdMapping')
      .doc(conversationId);
    
    await mappingRef.update({
      audioUrl: publicUrl,
      audioStoragePath: storagePath,
      audioUploadedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      audioUrl: publicUrl,
      storagePath: storagePath
    };
    
  } catch (error) {
    console.error('Error saving call MP3:', error);
    throw new Error(`Failed to save call MP3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};