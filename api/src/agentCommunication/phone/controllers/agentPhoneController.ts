import { Request, Response } from 'express';
import { startAgentPhoneCall } from '../services/startAgentPhoneCall';
import { handlePostCallService } from '../services/handlePostCall';
import { resolvePhoneContactService } from '../services/resolvePhoneContact';
import { handleInboundInitiationService, type InboundInitiationParams } from '../services/handleInboundInitiation';

interface StartPhoneCallRequest extends Request {
  body: {
    tenantId: string;
    agentId: string;
    targetPhoneNumber?: string;
    contactId?: string;
    actionId?: string; // NEW: Optional action context for specialized behavior
    isTraining?: boolean; // NEW: Flag to indicate training mode
    sessionId?: string; // NEW: Training session ID for test environment
    // Contact creation fields
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

export const startPhoneCall = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get tenantId from middleware (injected from API key)
    const tenantId = (req as any).tenantId;
    const { agentId, targetPhoneNumber, contactId, actionId, isTraining, sessionId, full_name, first_name, last_name, email, phone } = req.body;

    // Validate required parameters
    if (!tenantId || !agentId) {
      res.status(400).json({
        error: 'Missing required parameters: tenantId and agentId are required'
      });
      return;
    }

    // Validate that either targetPhoneNumber or contactId is provided
    if (!targetPhoneNumber && !contactId) {
      res.status(400).json({
        error: 'Either targetPhoneNumber or contactId must be provided'
      });
      return;
    }

    // Validate training mode parameters
    if (isTraining && !sessionId) {
      res.status(400).json({
        error: 'Session ID is required when in training mode'
      });
      return;
    }

    // Step 1: Resolve contact ID first (critical for proper contact handling)
    console.log('🔍 Resolving contact ID for phone call...');
    const contactIdentifier = contactId || targetPhoneNumber;
    
    const contactResolution = await resolvePhoneContactService.resolvePhoneContact({
      tenantId,
      contactIdentifier: contactIdentifier!,
      contactCreationData: {
        full_name,
        first_name,
        last_name,
        email,
        phone: phone || targetPhoneNumber
      }
    });

    if (!contactResolution.success) {
      console.error('❌ Failed to resolve contact:', contactResolution.error);
      res.status(500).json({
        error: 'Contact resolution failed',
        details: contactResolution.error || 'Unable to resolve or create contact'
      });
      return;
    }

    const resolvedContactId = contactResolution.contactId!;
    console.log(`✅ Contact resolved: ${resolvedContactId} ${contactResolution.wasCreated ? '(created)' : '(existing)'}`);

    // Step 2: Call the service to start the phone call
    const result = await startAgentPhoneCall({
      tenantId,
      agentId,
      targetPhoneNumber: contactResolution.phoneNumber || targetPhoneNumber,
      contactId: resolvedContactId, // Use resolved contact ID
      actionId,
      isTraining,
      sessionId,
      full_name,
      first_name,
      last_name,
      email,
      phone
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error starting phone call:', error);
    res.status(500).json({
      error: 'Failed to start phone call',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

interface PostCallRequest extends Request {
  body: {
    type: 'post_call_transcription' | 'post_call_audio';
    event_timestamp: number;
    data: {
      agent_id: string;
      conversation_id: string;
      status?: string;
      user_id?: string | null;
      transcript?: any[];
      metadata?: any;
      analysis?: any;
      conversation_initiation_client_data?: any;
      full_audio?: string;
    };
  };
  headers: {
    'elevenlabs-signature'?: string;
  };
}

export const handlePostCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as PostCallRequest['body'];
    
    console.log('Post-call webhook received:', {
      type: body.type,
      conversationId: body.data?.conversation_id
    });

    const { type, data } = body;

    // Validate required parameters
    if (!data || !data.conversation_id) {
      res.status(400).json({
        error: 'Missing required parameters: conversation_id is required'
      });
      return;
    }

    // Handle different webhook types
    if (type === 'post_call_transcription') {
      await handlePostCallService({
        conversationId: data.conversation_id,
        transcript: JSON.stringify(data.transcript || []),
        audioBase64: '', // Audio comes in separate webhook
        webhookType: 'transcription',
        fullData: data
      });
    } else if (type === 'post_call_audio') {
      await handlePostCallService({
        conversationId: data.conversation_id,
        transcript: '', // Transcript comes in separate webhook
        audioBase64: data.full_audio || '',
        webhookType: 'audio',
        fullData: data
      });
    } else {
      res.status(400).json({
        error: `Unknown webhook type: ${type}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `${type} processed successfully`
    });

  } catch (error) {
    console.error('Error handling post-call:', error);
    res.status(500).json({
      error: 'Failed to process post-call data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

interface CallInitiationRequest extends Request {
  body: {
    caller_id: string;      // Phone number of the caller
    agent_id: string;       // ElevenLabs agent ID receiving the call  
    called_number: string;  // Twilio number that was called
    call_sid: string;       // Unique identifier for the Twilio call
  };
}

export const handleCallInitiation = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CallInitiationRequest['body'];
    
    console.log('📨 Call initiation webhook received:', {
      caller_id: body.caller_id,
      agent_id: body.agent_id,
      called_number: body.called_number,
      call_sid: body.call_sid
    });

    const { caller_id, agent_id, called_number, call_sid } = body;

    // Validate required parameters
    if (!caller_id || !agent_id || !called_number || !call_sid) {
      res.status(400).json({
        error: 'Missing required parameters',
        required: ['caller_id', 'agent_id', 'called_number', 'call_sid'],
        received: { caller_id, agent_id, called_number, call_sid }
      });
      return;
    }

    // Process the inbound call initiation
    const response = await handleInboundInitiationService({
      caller_id,
      agent_id, 
      called_number,
      call_sid
    });

    // Return ElevenLabs-compatible response
    res.status(200).json(response);

  } catch (error) {
    console.error('Error handling call initiation:', error);
    
    // Return minimal response to not block the call
    res.status(200).json({
      type: 'conversation_initiation_client_data',
      dynamic_variables: {
        callType: 'inbound',
        contactStatus: 'error_fallback'
      }
    });
  }
};