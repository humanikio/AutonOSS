import { listVoices } from './voiceConfig/listVoices';
import { getVoice } from './voiceConfig/getVoice';
import { update11LabsAgentVoice } from './voiceConfig/update11labsVoice';
import { updateFirestoreVoiceRecord } from './voiceConfig/updateFirestoreVoiceRecord';

interface VoiceConfigParams {
  action: string;
  voiceId?: string;
  search?: string;
  pageSize?: number;
  nextPageToken?: string;
  voiceType?: string;
  category?: string;
  voiceSettings?: {
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  };
}

export const voiceConfigService = async (
  tenantId: string,
  agentId: string,
  params: VoiceConfigParams
): Promise<any> => {
  const { action } = params;
  
  try {
    switch (action) {
      case 'listVoices':
        return await listVoices({
          search: params.search,
          pageSize: params.pageSize,
          nextPageToken: params.nextPageToken,
          voiceType: params.voiceType,
          category: params.category
        });
        
      case 'getVoice':
        if (!params.voiceId) {
          throw new Error('Voice ID is required for getVoice action');
        }
        return await getVoice(params.voiceId);
        
      case 'selectVoice':
        if (!params.voiceId) {
          throw new Error('Voice ID is required for selectVoice action');
        }
        
        // Get agent data from Firestore to get elevenLabsAgentId
        const admin = await import('firebase-admin');
        const db = admin.default.firestore();
        const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
        const agentDoc = await agentRef.get();
        
        if (!agentDoc.exists) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        const agentData = agentDoc.data();
        const elevenLabsAgentId = agentData?.elevenLabsAgentId;
        
        if (!elevenLabsAgentId) {
          throw new Error('ElevenLabs agent ID not found for this agent');
        }
        
        // Get detailed voice information from 11Labs
        const voiceDetails = await getVoice(params.voiceId);
        
        // Update 11Labs agent with selected voice
        const elevenLabsResult = await update11LabsAgentVoice(
          elevenLabsAgentId,
          params.voiceId,
          params.voiceSettings
        );
        
        // Update Firestore with comprehensive voice record
        await updateFirestoreVoiceRecord(tenantId, agentId, {
          voiceId: params.voiceId,
          voiceName: voiceDetails.name,
          voiceDescription: voiceDetails.description,
          voiceCategory: voiceDetails.category,
          voiceLabels: voiceDetails.labels,
          voicePreviewUrl: voiceDetails.preview_url,
          voiceSettings: params.voiceSettings || {},
          elevenLabsAgentId: elevenLabsAgentId,
          elevenLabsResponse: elevenLabsResult
        });
        
        console.log(`Successfully selected voice ${voiceDetails.name} (${params.voiceId}) for agent ${agentId}`);
        
        return {
          success: true,
          voiceDetails: voiceDetails,
          elevenLabsResult: elevenLabsResult,
          message: `Voice ${voiceDetails.name} successfully selected for agent`
        };
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error in voice config service (${action}):`, error);
    throw error;
  }
};