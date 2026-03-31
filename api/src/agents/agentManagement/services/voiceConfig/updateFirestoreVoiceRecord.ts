import admin from 'firebase-admin';

interface VoiceRecord {
  voiceId: string;
  voiceName: string;
  voiceDescription: string;
  voiceCategory: string;
  voiceLabels: { [key: string]: string };
  voicePreviewUrl: string;
  voiceSettings: {
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  };
  elevenLabsAgentId: string;
  elevenLabsResponse?: any;
  selectedAt: string;
  updatedAt: string;
}

export async function updateFirestoreVoiceRecord(
  tenantId: string,
  agentId: string,
  voiceData: {
    voiceId: string;
    voiceName: string;
    voiceDescription: string;
    voiceCategory: string;
    voiceLabels: { [key: string]: string };
    voicePreviewUrl: string;
    voiceSettings: {
      stability?: number;
      speed?: number;
      similarity_boost?: number;
    };
    elevenLabsAgentId: string;
    elevenLabsResponse?: any;
  }
): Promise<void> {
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    // Prepare voice record for Firestore
    const voiceRecord: VoiceRecord = {
      voiceId: voiceData.voiceId,
      voiceName: voiceData.voiceName,
      voiceDescription: voiceData.voiceDescription,
      voiceCategory: voiceData.voiceCategory,
      voiceLabels: voiceData.voiceLabels,
      voicePreviewUrl: voiceData.voicePreviewUrl,
      voiceSettings: voiceData.voiceSettings,
      elevenLabsAgentId: voiceData.elevenLabsAgentId,
      elevenLabsResponse: voiceData.elevenLabsResponse,
      selectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Update agent document with voice information
    await agentRef.update({
      // Current selected voice
      selectedVoiceId: voiceData.voiceId,
      selectedVoiceName: voiceData.voiceName,
      selectedVoiceDescription: voiceData.voiceDescription,
      selectedVoiceCategory: voiceData.voiceCategory,
      selectedVoiceLabels: voiceData.voiceLabels,
      selectedVoicePreviewUrl: voiceData.voicePreviewUrl,
      
      // Voice settings
      voiceSettings: voiceData.voiceSettings,
      
      // Complete voice record for detailed display
      voiceRecord: voiceRecord,
      
      // 11Labs integration data
      elevenLabsAgentId: voiceData.elevenLabsAgentId,
      elevenLabsVoiceResponse: voiceData.elevenLabsResponse,
      
      // Timestamps
      voiceSelectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully updated Firestore voice record for agent ${agentId}:`, {
      voiceId: voiceData.voiceId,
      voiceName: voiceData.voiceName,
      category: voiceData.voiceCategory
    });
    
  } catch (error) {
    console.error('Error updating Firestore voice record:', error);
    throw new Error(`Failed to update Firestore voice record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}