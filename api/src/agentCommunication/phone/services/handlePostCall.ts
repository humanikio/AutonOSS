import { findContactByPhoneRecord } from './handlePostCall/findContact';
import { saveCallMp3 } from './handlePostCall/saveCallmp3';
import { saveTranscript } from './handlePostCall/saveTranscript';
import { phoneConversationManager } from './phoneConversationManager';
import { summarizeHistoryService } from '../../../universalContactMemory/conversationHistory/services/summarizeHistory';
import { executeTrigger } from '../../../workflows/triggerSubscriptions/services/triggerExecutions';

interface HandlePostCallParams {
  conversationId: string;
  transcript: string;
  audioBase64: string;
  webhookType: 'transcription' | 'audio';
  fullData: any;
}

/**
 * Trigger workflow subscriptions for phone call completed event
 * This runs async and does not block the main call processing flow
 */
async function triggerWorkflowSubscriptions(params: {
  tenantId: string;
  contactId: string;
  agentId: string;
  conversationId: string;
  localConversationId?: string;
  actualConversationId: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  duration?: number;
  callSummary?: string;
  transcript: any[];
  analysis: any;
  audioUrl?: string;
  metadata: any;
}): Promise<void> {
  try {
    console.log('📡 Triggering workflow subscriptions for phone.call.completed.v1...');

    // Organize payload according to phone.call.completed.v1 schema
    const payload = {
      // Core identifiers (required)
      tenantId: params.tenantId,
      contactId: params.contactId,
      agentId: params.agentId,
      conversationId: params.conversationId,
      actualConversationId: params.actualConversationId,
      phoneNumber: params.phoneNumber,
      direction: params.direction,
      transcript: params.transcript,

      // Optional fields
      localConversationId: params.localConversationId,
      duration: params.duration,
      callSummary: params.callSummary,
      analysis: params.analysis,
      audioUrl: params.audioUrl,
      metadata: params.metadata
    };

    // Execute trigger subscriptions (async, non-blocking)
    const result = await executeTrigger({
      tenantId: params.tenantId,
      triggerType: 'phone.call.completed.v1',
      payload
    });

    console.log(`📡 Trigger execution completed: ${result.subscriptionsFound} subscription(s) found, ${result.summary.completed} executed, ${result.summary.failed} failed`);

  } catch (error) {
    // Log error but don't throw - we don't want to block the main call flow
    console.error('❌ Error triggering workflow subscriptions:', error);
  }
}

export const handlePostCallService = async (params: HandlePostCallParams): Promise<void> => {
  const { conversationId, transcript, audioBase64, webhookType, fullData } = params;

  try {
    console.log(`Processing ${webhookType} webhook for conversation: ${conversationId}`);

    // Step 1: Find the contact and tenant information using the conversationId
    const callMapping = await findContactByPhoneRecord(conversationId, {
      agent_id: fullData.agent_id,
      conversation_initiation_client_data: fullData.conversation_initiation_client_data,
      metadata: fullData.metadata
    });
    
    console.log('Retrieved call mapping:', {
      tenantId: callMapping.tenantId,
      agentId: callMapping.agentId,
      contactId: callMapping.contactId,
      phoneNumber: callMapping.phoneNumber,
      localConversationId: callMapping.localConversationId
    });

    // ID explanations:
    // conversationId: ElevenLabs conversation ID (from webhook)
    // callMapping.localConversationId: Phone record ID (for transcript/audio updates)
    // callMapping.actualConversationId: The REAL unified conversation ID (for writing messages)

    console.log('ID mapping:', {
      elevenLabsConversationId: conversationId,
      phoneRecordId: callMapping.localConversationId,
      actualConversationId: callMapping.actualConversationId
    });

    let audioUrl: string | undefined;
    let transcriptArray: any[] | undefined;
    let callSummary: string | undefined;
    let duration: number | undefined;

    // Handle based on webhook type
    if (webhookType === 'transcription') {
      console.log('Processing transcript data...');
      console.log('Transcript length:', transcript.length);
      console.log('Analysis available:', !!fullData.analysis);
      
      // Save transcript to Firestore
      transcriptArray = JSON.parse(transcript);
      // Only save transcript if we have both contactId and transcript data
      if (callMapping.contactId && transcriptArray) {
        await saveTranscript({
          tenantId: callMapping.tenantId,
          contactId: callMapping.contactId,
          conversationId, // ElevenLabs conversationId for mapping/transcript collection
          localConversationId: callMapping.localConversationId, // Local ID for phone record updates
          transcript: transcriptArray,
          analysis: fullData.analysis,
          metadata: fullData.metadata
        });
      } else {
        console.warn('Skipping transcript save - missing contactId or transcript data');
      }
      
      // Extract call summary and duration for conversation message
      callSummary = fullData.analysis?.transcript_summary || fullData.analysis?.call_summary_title;
      duration = fullData.metadata?.call_duration_secs;
      
      console.log('Transcript saved successfully');
    } else if (webhookType === 'audio') {
      console.log('Processing audio data...');
      console.log('Audio base64 length:', audioBase64.length);
      
      // Save audio to Firebase Storage
      if (audioBase64 && callMapping.contactId) {
        const audioResult = await saveCallMp3({
          tenantId: callMapping.tenantId,
          contactId: callMapping.contactId,
          conversationId, // ElevenLabs conversationId for storage path
          localConversationId: callMapping.localConversationId, // Local ID for phone record updates
          audioBase64
        });
        
        audioUrl = audioResult.audioUrl;
        
        console.log('Audio saved successfully:', {
          audioUrl: audioResult.audioUrl,
          storagePath: audioResult.storagePath
        });
      } else if (audioBase64 && !callMapping.contactId) {
        console.warn('No contactId available, skipping audio save to contact record');
        // Could still save to a general location if needed
      }
    }

    // Step 2: Create call completion message in conversation for UI tracking
    if (callMapping.contactId) {
      console.log('📞 Creating call completion message...');

      // Determine call direction from metadata or default to inbound since this is post-call
      const direction = fullData.metadata?.phone_call?.direction || 'inbound';

      try {
        // createCallCompletedMessage will find/create the unified conversation itself
        // It uses actualConversationId internally for writing messages
        await phoneConversationManager.createCallCompletedMessage({
          tenantId: callMapping.tenantId,
          contactId: callMapping.contactId,
          agentId: callMapping.agentId,
          phoneNumber: callMapping.phoneNumber,
          direction: direction as 'inbound' | 'outbound',
          callSid: conversationId, // Using ElevenLabs conversationId as callSid
          duration: duration,
          callSummary: callSummary,
          transcript: transcriptArray,
          audioUrl: audioUrl
        });

        console.log('📞 Call completion message created successfully');
      } catch (messageError) {
        console.error('❌ Failed to create call completion message (non-blocking):', messageError);
        console.warn('⚠️ Continuing with post-call processing despite message creation failure');
      }
    } else {
      console.warn('📞 Skipping call completion message - no contactId available');
    }

    // Step 2.5: Trigger workflow subscriptions (async, non-blocking)
    // Fire-and-forget - don't await, runs in background
    if (callMapping.contactId && callMapping.actualConversationId && transcriptArray && transcriptArray.length > 0) {
      triggerWorkflowSubscriptions({
        tenantId: callMapping.tenantId,
        contactId: callMapping.contactId,
        agentId: callMapping.agentId,
        conversationId: conversationId,
        localConversationId: callMapping.localConversationId,
        actualConversationId: callMapping.actualConversationId,
        phoneNumber: callMapping.phoneNumber,
        direction: (fullData.metadata?.phone_call?.direction || 'inbound') as 'inbound' | 'outbound',
        duration: duration,
        callSummary: callSummary,
        transcript: transcriptArray,
        analysis: fullData.analysis,
        audioUrl: audioUrl,
        metadata: fullData.metadata
      }).catch(err => {
        console.error('❌ Background trigger execution failed:', err);
      });
    }

    // Step 3: Trigger conversation summarization and contact profile analysis
    // This happens after we have both transcript and audio data
    if (callMapping.contactId && callMapping.actualConversationId && transcriptArray && transcriptArray.length > 0) {
      console.log('\n📋 Step 3: Triggering conversation summarization for phone call');
      console.log(`   Using actual conversation ID for summarization: ${callMapping.actualConversationId}`);

      // Trigger summarization in the background (fire and forget)
      summarizeHistoryService.summarizeConversation({
        tenantId: callMapping.tenantId,
        contactId: callMapping.contactId,
        conversationId: callMapping.actualConversationId, // Use the REAL unified conversation ID
        isPhone: true,
        phoneTranscriptData: {
          transcript: transcriptArray,
          analysis: fullData.analysis,
          metadata: fullData.metadata,
          duration: duration,
          direction: (fullData.metadata?.phone_call?.direction || 'inbound') as 'inbound' | 'outbound'
        }
      }).then(result => {
        if (result.success) {
          console.log('✅ Phone call summarization completed successfully');
          console.log(`   Summary length: ${result.summaryLength} characters`);
        } else {
          console.error('❌ Phone call summarization failed (non-blocking):', result.error);
        }
      }).catch(error => {
        console.error('❌ Phone call summarization error (non-blocking):', error);
      });

      console.log('📋 Conversation summarization triggered in background');
    } else {
      console.log('📋 Skipping conversation summarization - missing contactId, actualConversationId, or transcript');
    }

    console.log(`Successfully processed ${webhookType} webhook for conversation ${conversationId}`);

  } catch (error) {
    console.error(`Error handling ${webhookType} webhook:`, error);
    throw new Error(`Failed to handle ${webhookType} webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};