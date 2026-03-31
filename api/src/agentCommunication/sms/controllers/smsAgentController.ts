import { Request, Response } from 'express';
import { smsAnalysisService } from '../services/analyzeSms';
import { generateCaseNumberService } from '../services/generateCaseNumber';
import { buildResponseService } from '../services/buildResponse';
import { sendAgentSmsService } from '../services/sendSms';
import { useDestinationKeyService } from '../services/useDestinationKey';
import { conversationManager } from '../services/conversationManager';
import { getPayloadDetailsService } from '../services/sendSms/getPayloadDetails';
import { getChatHistory } from '../utilities/getChatHistory';
import { trainingHandlerService } from '../services/trainingHandler';
import { startAnalysisService } from '../services/startAnalysis';
import { resolveContactService } from '../services/resolveContact';

// Interface for inbound SMS payload
interface InboundAgentSmsPayload {
  messageContent: string;      // The inbound SMS message content
  tenantId: string;           // Tenant identifier
  contactId: string;          // Contact who sent the message
  agentId: string;            // Agent to process the message
  action: string;             // Action type for routing
  actionId?: string;          // NEW: Optional action ID for specific behavior
  destinationKey?: string;    // NEW: Optional destination webhook key for routing
  messageId?: string;         // Message identifier (e.g., Twilio MessageSid)
  from?: string;              // Sender phone number
  to?: string;                // Recipient phone number (agent's number)
  conversationId?: string;    // Existing conversation ID
  messagingServiceId?: string; // Twilio messaging service ID
  timestamp?: string;         // When message was received
  mediaUrls?: string[];       // Media attachments
  mediaTypes?: string[];      // Media content types
  messageStatus?: string;     // Message status
  agentPhoneNumber?: string;  // Agent's phone number (required for sending responses)
  agentPhoneNumberSid?: string; // Twilio SID for agent's number
  agentSettings?: {           // Agent configuration
    language?: string;
    processingMode?: string;
    responseDelay?: number;
  };
  // Training mode fields
  isTraining?: boolean;       // Flag to indicate training mode
  trainingSessionId?: string; // Training session ID for saving messages
}

// Interface for outbound SMS payload
interface OutboundAgentSmsPayload {
  tenantId: string;           // Tenant identifier
  agentId: string;            // Agent initiating the message
  contactId?: string;         // Target contact ID (if known)
  targetPhoneNumber?: string; // Target phone number (if contactId unknown)
  action: string;             // Action type triggering the outbound message
  actionId?: string;          // Specific action ID for context
  destinationKey?: string;    // NEW: Optional destination webhook key for routing
  messageContent?: string;    // Optional custom message content
  conversationId?: string;    // Existing conversation ID
  agentSettings?: {           // Agent configuration
    language?: string;
    processingMode?: string;
    responseDelay?: number;
  };
  // Contact creation fields (for auto-creation if needed)
  full_name?: string;         // Full name for contact creation
  first_name?: string;        // First name for contact creation
  last_name?: string;         // Last name for contact creation
  email?: string;             // Email for contact creation
  customData?: any;           // Additional context data
  // Training mode fields
  isTraining?: boolean;       // Flag to indicate training mode
  trainingSessionId?: string; // Training session ID for saving messages
}

export class SmsAgentController {
  /**
   * Handle inbound SMS messages for agent processing
   */
  async handleInboundAgentSms(req: Request, res: Response) {
    try {
      // Get tenantId from middleware (injected from API key)
      const tenantId = (req as any).tenantId;
      const smsData: InboundAgentSmsPayload = {
        ...req.body,
        tenantId, // Inject tenantId from API key auth
      };
      
      console.log('> SMS Agent Controller: Processing inbound SMS for agent');
      console.log('=� Message Details:');
      console.log(`  - Tenant ID: ${smsData.tenantId}`);
      console.log(`  - Contact ID: ${smsData.contactId}`);
      console.log(`  - Agent ID: ${smsData.agentId}`);
      console.log(`  - Action: ${smsData.action}`);
      console.log(`  - Action ID: ${smsData.actionId || 'None'}`);
      console.log(`  - Destination Key: ${smsData.destinationKey || 'None (will use traditional SMS)'}`);
      console.log(`  - Message: "${smsData.messageContent}"`);
      console.log(`  - Training Mode: ${smsData.isTraining ? 'Yes' : 'No'}`);
      
      if (smsData.isTraining && smsData.trainingSessionId) {
        console.log(`  - Training Session ID: ${smsData.trainingSessionId}`);
      }
      
      if (smsData.from && smsData.to) {
        console.log(`  - From: ${smsData.from}`);
        console.log(`  - To: ${smsData.to}`);
      }
      
      if (smsData.conversationId) {
        console.log(`  - Conversation ID: ${smsData.conversationId}`);
      }
      
      if (smsData.mediaUrls && smsData.mediaUrls.length > 0) {
        console.log(`  - Media Attachments: ${smsData.mediaUrls.length}`);
      }
      
      if (smsData.agentSettings) {
        console.log('  - Agent Settings:', JSON.stringify(smsData.agentSettings, null, 2));
      }
      
      console.log('=====================================');

      // NOTE: We now save the user message AFTER fetching conversation history
      // to prevent the current message from contaminating the conversation context
      
      // Step 1: Resolve contact ID first (critical for proper conversation/history handling)
      console.log('🔍 Resolving contact ID...');
      const contactResolution = await resolveContactService.resolveContact({
        tenantId: smsData.tenantId,
        contactIdentifier: smsData.contactId,
        contactCreationData: {
          full_name: req.body.full_name,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          phone: smsData.from
        }
      });

      if (!contactResolution.success) {
        console.error('❌ Failed to resolve contact:', contactResolution.error);
        res.status(500).json({
          success: false,
          error: 'Contact resolution failed',
          message: contactResolution.error || 'Unable to resolve or create contact'
        });
        return;
      }

      const resolvedContactId = contactResolution.contactId!;
      console.log(`✅ Contact resolved: ${resolvedContactId} ${contactResolution.wasCreated ? '(created)' : '(existing)'}`);
      
      // Step 2: Generate case number
      console.log('🆔 Generating case number...');
      
      const caseInfo = await generateCaseNumberService.generateCase({
        tenantId: smsData.tenantId,
        agentId: smsData.agentId,
        contactId: resolvedContactId,
        messageContent: smsData.messageContent,
        messageId: smsData.messageId,
        conversationId: smsData.conversationId,
        from: smsData.from,
        to: smsData.to
      });

      console.log(`= Case created: ${caseInfo.caseNumber} (${caseInfo.caseId})`);
      
      // Step 3: Get or create conversation ID (different logic for training vs production)
      let conversationId = smsData.conversationId;
      if (!conversationId) {
        if (smsData.isTraining && smsData.trainingSessionId) {
          // Training mode: Use session ID as conversation ID for isolated memory
          conversationId = smsData.trainingSessionId;
          console.log(`Training mode: Using session ID as conversation ID: ${conversationId}`);
        } else {
          // Production mode: Find or create persistent conversation
          console.log('Production mode: Finding or creating conversation...');
          conversationId = await conversationManager.findOrCreateConversation(smsData.tenantId, resolvedContactId);
          console.log(`Using conversation ID: ${conversationId}`);
        }
      }

      // Step 3.5: Ensure contact has phone address record (required for frontend display)
      if (smsData.from) {
        const { ensureContactAddress } = await import('../../../contacts/utilities/ensureContactAddress');
        await ensureContactAddress(smsData.tenantId, resolvedContactId, 'SMS', smsData.from);
      }

      // Step 4: Fetch conversation history for context (BEFORE saving current message)
      console.log('📚 Fetching conversation history for context...');
      const chatHistoryResult = await getChatHistory.getChatHistory({
        tenantId: smsData.tenantId,
        contactId: resolvedContactId,
        conversationId: conversationId,
        messageLimit: 15,
        isTraining: smsData.isTraining,
        trainingSessionId: smsData.trainingSessionId,
        excludeCurrentMessage: true, // NEW: Exclude current message from history
        currentMessageId: smsData.messageId // NEW: Identify current message to exclude
      });

      // Step 3.5: NOW Save user message to training session (after fetching history)
      if (smsData.isTraining && smsData.trainingSessionId) {
        console.log('📚 Training Mode: Saving user message to session...');
        const userMessageResult = await trainingHandlerService.saveUserMessage(
          smsData.tenantId,
          smsData.trainingSessionId,
          smsData.messageContent,
          {
            contactId: smsData.contactId,
            agentId: smsData.agentId,
            messageId: smsData.messageId,
            timestamp: new Date().toISOString()
          }
        );

        if (!userMessageResult.success) {
          console.error('Failed to save user training message:', userMessageResult.error);
          // Don't fail the whole process, but log the error
        } else {
          console.log(`✅ User training message saved: ${userMessageResult.messageId}`);
        }
      }

      if (!chatHistoryResult.success) {
        console.warn('⚠️ Failed to fetch conversation history (non-blocking):', chatHistoryResult.error);
      } else {
        const historyInfo = chatHistoryResult.conversationHistory;
        console.log(`📊 Conversation context loaded:`);
        console.log(`  - Messages: ${historyInfo?.messages.length || 0}`);
        console.log(`  - Total conversation messages: ${historyInfo?.totalMessages || 0}`);
        console.log(`  - Has summary: ${!!historyInfo?.summary}`);
        console.log(`  - Context length: ${historyInfo?.conversationalContext.length || 0} chars`);
      }

      // Step 4: Run SMS analysis pipeline with conversation context
      console.log('🚀 Starting SMS analysis pipeline with conversation history...');
      
      const analysisResult = await smsAnalysisService.analyzeInboundSms({
        messageContent: smsData.messageContent,
        tenantId: smsData.tenantId,
        contactId: resolvedContactId,
        agentId: smsData.agentId,
        conversationId: conversationId,
        messageId: smsData.messageId,
        from: smsData.from,
        to: smsData.to,
        caseId: caseInfo.caseId,
        conversationHistory: chatHistoryResult.conversationHistory, // Add conversation context
        isTraining: smsData.isTraining,
        trainingSessionId: smsData.trainingSessionId,
        actionId: smsData.actionId // NEW: Pass action ID for context
      });

      console.log('✅ SMS analysis pipeline completed');
      console.log('📊 Analysis Summary:', {
        analysisId: analysisResult.id,
        ragUsed: analysisResult.ragNeeded,
        documentsUsed: analysisResult.documentContexts?.length || 0
      });

      // Step 5: Save contact overview (conversation history + contact profile) to case for future reference
      if (chatHistoryResult.success && chatHistoryResult.conversationHistory) {
        console.log('💾 Saving contact overview (history + profile) to case...');
        // Clean messages to remove functions and non-serializable data
        const cleanMessages = chatHistoryResult.conversationHistory.messages.map(msg => {
          // Handle timestamp conversion safely
          let timestampMillis: number;
          try {
            if (typeof msg.timestamp?.toMillis === 'function') {
              timestampMillis = msg.timestamp.toMillis();
            } else if ((msg.timestamp as any)?.toMillis && typeof (msg.timestamp as any).toMillis === 'function') {
              timestampMillis = (msg.timestamp as any).toMillis();
            } else {
              timestampMillis = Date.now();
            }
          } catch (error) {
            console.warn('Error converting timestamp, using current time:', error);
            timestampMillis = Date.now();
          }

          return {
            id: msg.id,
            direction: msg.direction,
            body: msg.body,
            timestampMillis,
            isFromAgent: msg.isFromAgent,
            agentId: msg.agentId,
            fromPhone: msg.fromPhone,
            toPhone: msg.toPhone
          };
        });

        // Clean contact profile to remove non-serializable data
        let cleanContactProfile = undefined;
        if (chatHistoryResult.contactProfile) {
          const profile = chatHistoryResult.contactProfile;
          cleanContactProfile = {
            profileId: profile.profileId,
            profileText: profile.profileText,
            isEmpty: profile.isEmpty,
            lastUpdatedMillis: typeof profile.lastUpdated?.toMillis === 'function'
              ? profile.lastUpdated.toMillis()
              : Date.now()
          };
        }

        await generateCaseNumberService.updateCaseAnalysis(
          smsData.tenantId,
          smsData.agentId,
          caseInfo.caseId,
          {
            conversationHistory: {
              messages: cleanMessages,
              summary: chatHistoryResult.conversationHistory.summary,
              totalMessages: chatHistoryResult.conversationHistory.totalMessages,
              hasMoreHistory: chatHistoryResult.conversationHistory.hasMoreHistory,
              contextLength: chatHistoryResult.conversationHistory.conversationalContext.length
            },
            contactProfile: cleanContactProfile, // NEW: Save contact profile
            promptContext: chatHistoryResult.promptContext // NEW: Save pre-formatted prompt sections
          }
        );
        console.log('✅ Contact overview saved to case');
        console.log(`  - Profile: ${cleanContactProfile ? 'Included' : 'Not available'}`);
      }
      
      // Step 6: Build SMS response using analysis data and conversation context
      console.log('💬 Building SMS response with conversation context...');
      
      const responseResult = await buildResponseService.buildSmsResponse({
        tenantId: smsData.tenantId,
        agentId: smsData.agentId,
        caseId: caseInfo.caseId,
        isTraining: smsData.isTraining,
        trainingSessionId: smsData.trainingSessionId,
        actionId: smsData.actionId, // NEW: Pass action ID for response building
        options: {
          enableRetry: true,
          maxRetries: 2
        }
      });

      if (!responseResult.success) {
        console.error('Failed to build SMS response:', responseResult.error);
        
        res.status(500).json({
          success: false,
          error: 'Failed to build SMS response',
          message: responseResult.error,
          data: {
            caseId: caseInfo.caseId,
            caseNumber: caseInfo.caseNumber,
            analysisId: analysisResult.id
          }
        });
        return;
      }

      console.log('✅ SMS response generated successfully');
      console.log(`📱 Response: "${responseResult.message}"`);
      
      // Step 7: Handle response sending (SMS or Training)
      let finalResult: any;

      if (smsData.isTraining && smsData.trainingSessionId) {
        // Training mode - save to session instead of sending SMS
        console.log('📚 Training Mode: Saving agent response to session...');
        
        const trainingResult = await trainingHandlerService.handleTrainingResponse({
          tenantId: smsData.tenantId,
          agentId: smsData.agentId,
          contactId: smsData.contactId,
          trainingSessionId: smsData.trainingSessionId,
          conversationId: conversationId,
          message: responseResult.message!,
          caseId: caseInfo.caseId,
          analysisId: analysisResult.id,
          ragNeeded: analysisResult.ragNeeded,
          documentContexts: analysisResult.documentContexts,
          processingTime: responseResult.metadata?.processingTime
        });

        if (!trainingResult.success) {
          console.error('Failed to save training response:', trainingResult.error);
          
          res.status(500).json({
            success: false,
            error: 'Failed to save training response',
            message: trainingResult.error,
            data: {
              caseId: caseInfo.caseId,
              caseNumber: caseInfo.caseNumber,
              analysisId: analysisResult.id,
              generatedResponse: responseResult.message
            }
          });
          return;
        }

        console.log('✅ Training response saved successfully');
        console.log(`💾 Message ID: ${trainingResult.messageId}`);
        finalResult = trainingResult;

        // Step 7.5: Trigger analysis cycle for training session (non-blocking)
        console.log('\n🔍 Step 7.5: Checking if analysis cycle should be triggered...');
        try {
          // Get current message count from training session
          const currentMessageCount = await this.getTrainingSessionMessageCount(
            smsData.tenantId, 
            smsData.trainingSessionId
          );

          const analysisResult = await startAnalysisService.triggerAnalysisCycle({
            sessionId: smsData.trainingSessionId,
            tenantId: smsData.tenantId,
            agentId: smsData.agentId,
            messageCount: currentMessageCount
          });

          if (analysisResult.skipped) {
            console.log(`⏭️ Analysis skipped: ${analysisResult.skipReason}`);
          } else if (analysisResult.success) {
            console.log('✅ Analysis cycle triggered successfully');
            console.log(`  - Cycle ID: ${analysisResult.cycleId}`);
            console.log(`  - Cycle Number: ${analysisResult.cycleNumber}`);
            console.log(`  - Has suggestions: ${analysisResult.suggestions ? 'Yes' : 'No'}`);
          } else {
            console.warn('⚠️ Analysis cycle failed (non-blocking):', analysisResult.error);
          }
        } catch (analysisError) {
          // Don't fail the main request if analysis fails
          console.warn('⚠️ Analysis cycle trigger failed (non-blocking):', analysisError);
        }

      } else {
        // Production mode - send actual SMS
        console.log('📞 Getting contact and agent phone numbers...');
        // Use the resolved contact ID instead of the original identifier
        const payloadDetails = await getPayloadDetailsService.getPayloadDetails(
          smsData.tenantId,
          resolvedContactId, // Use the properly resolved contact ID
          smsData.agentId,
          // Contact creation data (though contact should already exist from resolution step)
          {
            full_name: req.body.full_name,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            phone: smsData.from // Use the actual phone number from the payload
          }
        );

        if (!payloadDetails.contactPhoneNumber) {
          console.error('❌ No phone number found for contact');
          res.status(400).json({
            success: false,
            error: 'Contact phone number not found',
            message: 'Unable to find phone number for contact in database'
          });
          return;
        }

        if (!payloadDetails.agentPhoneNumber && !smsData.destinationKey) {
          console.error('❌ No phone number found for agent');
          res.status(400).json({
            success: false,
            error: 'Agent phone number not found',
            message: 'Unable to find phone number for agent configuration'
          });
          return;
        }

        // Send the generated SMS response (with destination key routing)
        console.log('📤 Sending SMS response...');
        console.log(`📞 From agent: ${payloadDetails.agentPhoneNumber}`);
        console.log(`📞 To contact: ${payloadDetails.contactPhoneNumber}`);

        const smsResult = await useDestinationKeyService.processMessage({
          destinationKey: smsData.destinationKey,
          tenantId: smsData.tenantId,
          agentId: smsData.agentId,
          messageData: {
            message: responseResult.message!,
            contactId: resolvedContactId,
            conversationId: conversationId,
            messageId: smsData.messageId,
            caseId: caseInfo.caseId,
            fromPhone: payloadDetails.agentPhoneNumber || undefined,
            toPhone: payloadDetails.contactPhoneNumber,
            timestamp: new Date().toISOString(),
            to: payloadDetails.contactPhoneNumber,
            from: payloadDetails.agentPhoneNumber || undefined
          },
          fallbackSmsRequest: {
            tenantId: smsData.tenantId,
            agentId: smsData.agentId,
            contactId: resolvedContactId,
            conversationId: conversationId,
            message: responseResult.message!,
            to: payloadDetails.contactPhoneNumber,
            from: payloadDetails.agentPhoneNumber || undefined,
            caseId: caseInfo.caseId
          }
        });

        if (!smsResult.success) {
          console.error(`❌ Failed to send SMS via ${smsResult.method}:`, smsResult.error);
          
          res.status(500).json({
            success: false,
            error: 'Failed to send SMS response',
            message: smsResult.error,
            data: {
              caseId: caseInfo.caseId,
              caseNumber: caseInfo.caseNumber,
              analysisId: analysisResult.id,
              generatedResponse: responseResult.message,
              sendMethod: smsResult.method,
              destinationKey: smsResult.destinationKey
            }
          });
          return;
        }

        console.log(`✅ SMS sent successfully via ${smsResult.method}`);
        console.log(`📨 Message ID: ${smsResult.messageId}`);
        if (smsResult.destinationKey) {
          console.log(`🎯 Destination Key: ${smsResult.destinationKey}`);
        }
        finalResult = smsResult;
      }
      
      // TODO: Additional logging and monitoring
      // 1. Log interaction for reporting
      // 2. Update analytics metrics
      // 3. Trigger any post-send workflows
      
      res.status(200).json({
        success: true,
        message: smsData.isTraining ? 'Training message processed and saved successfully' : 'Inbound SMS processed and response sent successfully',
        data: {
          messageId: smsData.messageId || `debug-${Date.now()}`,
          agentId: smsData.agentId,
          contactId: resolvedContactId,
          caseId: caseInfo.caseId,
          caseNumber: caseInfo.caseNumber,
          analysisId: analysisResult.id,
          generatedResponse: responseResult.message,
          sentMessageId: finalResult.messageId,
          processingStatus: smsData.isTraining ? 'completed_and_saved' : 'completed_and_sent',
          sendMethod: finalResult.method || 'traditional_sms',
          destinationKey: smsData.destinationKey,
          isTraining: smsData.isTraining || false,
          trainingSessionId: smsData.trainingSessionId,
          ragNeeded: analysisResult.ragNeeded,
          documentsUsed: analysisResult.documentContexts?.length || 0,
          responseMetadata: responseResult.metadata,
          smsStatus: finalResult.status,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('L SMS Agent Controller: Error processing inbound SMS:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to process inbound SMS for agent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get the current message count for a training session
   * Used to determine if analysis should be triggered
   */
  private async getTrainingSessionMessageCount(
    tenantId: string, 
    trainingSessionId: string
  ): Promise<number> {
    try {
      // Import the getTrainingChatService to get message count
      const { getTrainingChatService } = await import('../../trainingChatManager/services/getTrainingChat');
      
      const sessionResult = await getTrainingChatService.getSessionMessages({
        tenantId,
        sessionId: trainingSessionId,
        limit: 1000 // Get all messages to count them
      });

      if (!sessionResult.success || !sessionResult.messages) {
        console.warn(`⚠️ Could not get message count for session ${trainingSessionId}, defaulting to 0`);
        return 0;
      }

      const messageCount = sessionResult.messages.length;
      console.log(`📊 Training session ${trainingSessionId} has ${messageCount} messages`);
      
      return messageCount;

    } catch (error) {
      console.warn('⚠️ Error getting training session message count:', error);
      return 0; // Default to 0 if we can't get the count
    }
  }

  /**
   * Handle outbound SMS messages initiated by agents
   */
  async handleOutboundAgentSms(req: Request, res: Response) {
    try {
      // Get tenantId from middleware (injected from API key)
      const tenantId = (req as any).tenantId;
      const smsData: OutboundAgentSmsPayload = {
        ...req.body,
        tenantId, // Inject tenantId from API key auth
      };
      
      console.log('> SMS Agent Controller: Processing outbound SMS for agent');
      console.log('=📤 Outbound Message Details:');
      console.log(`  - Tenant ID: ${smsData.tenantId}`);
      console.log(`  - Agent ID: ${smsData.agentId}`);
      console.log(`  - Contact ID: ${smsData.contactId || 'None (will use targetPhoneNumber)'}`);
      console.log(`  - Target Phone: ${smsData.targetPhoneNumber || 'None (will use contactId)'}`);
      console.log(`  - Action: ${smsData.action}`);
      console.log(`  - Action ID: ${smsData.actionId || 'None'}`);
      console.log(`  - Destination Key: ${smsData.destinationKey || 'None (will use traditional SMS)'}`);
      console.log(`  - Custom Message: ${smsData.messageContent ? '"' + smsData.messageContent + '"' : 'None (will generate)'}`);
      console.log(`  - Training Mode: ${smsData.isTraining ? 'Yes' : 'No'}`);
      console.log('=====================================');

      // Step 1: Determine contact identifier (use contactId or targetPhoneNumber)
      const contactIdentifier = smsData.contactId || smsData.targetPhoneNumber;
      
      if (!contactIdentifier) {
        console.error('❌ No contact identifier provided (need contactId or targetPhoneNumber)');
        res.status(400).json({
          success: false,
          error: 'Contact identifier required',
          message: 'Must provide either contactId or targetPhoneNumber'
        });
        return;
      }

      console.log(`📋 Using contact identifier: ${contactIdentifier}`);

      // Step 1.5: Resolve contact ID first (critical for proper conversation/history handling)
      console.log('🔍 Resolving contact ID for outbound...');
      const contactResolution = await resolveContactService.resolveContact({
        tenantId: smsData.tenantId,
        contactIdentifier: contactIdentifier,
        contactCreationData: {
          full_name: smsData.full_name,
          first_name: smsData.first_name,
          last_name: smsData.last_name,
          email: smsData.email,
          phone: smsData.targetPhoneNumber
        }
      });

      if (!contactResolution.success) {
        console.error('❌ Failed to resolve contact:', contactResolution.error);
        res.status(500).json({
          success: false,
          error: 'Contact resolution failed',
          message: contactResolution.error || 'Unable to resolve or create contact'
        });
        return;
      }

      const resolvedContactId = contactResolution.contactId!;
      console.log(`✅ Contact resolved: ${resolvedContactId} ${contactResolution.wasCreated ? '(created)' : '(existing)'}`);
      
      // Update contactIdentifier to use resolved contact ID for all subsequent operations
      const finalContactId = resolvedContactId;

      // Step 2: Get or create conversation ID
      console.log('🔗 Getting or creating conversation...');
      const conversationId = smsData.conversationId ||
        await conversationManager.findOrCreateConversation(smsData.tenantId, finalContactId);

      console.log(`✅ Conversation ID: ${conversationId}`);

      // Step 2.5: Ensure contact has phone address record (required for frontend display)
      if (smsData.targetPhoneNumber) {
        const { ensureContactAddress } = await import('../../../contacts/utilities/ensureContactAddress');
        await ensureContactAddress(smsData.tenantId, finalContactId, 'SMS', smsData.targetPhoneNumber);
      }

      // Step 3: Fetch conversation history for context (IMPORTANT for outbound)
      console.log('📚 Fetching conversation history for outbound context...');
      const chatHistoryResult = await getChatHistory.getChatHistory({
        tenantId: smsData.tenantId,
        contactId: finalContactId,
        conversationId: conversationId,
        messageLimit: 15,
        isTraining: smsData.isTraining,
        trainingSessionId: smsData.trainingSessionId,
        excludeCurrentMessage: false // No current message to exclude for outbound
      });

      if (chatHistoryResult.success && chatHistoryResult.conversationHistory) {
        console.log(`📊 Found ${chatHistoryResult.conversationHistory.messages?.length || 0} messages in conversation history`);
        console.log(`  - Context length: ${chatHistoryResult.conversationHistory?.conversationalContext.length || 0} chars`);
      }

      // Step 4: Generate case number for tracking
      console.log('🆔 Generating case number for outbound message...');
      const caseInfo = await generateCaseNumberService.generateCase({
        tenantId: smsData.tenantId,
        agentId: smsData.agentId,
        contactId: finalContactId,
        messageContent: smsData.messageContent || `Outbound SMS initiated via action: ${smsData.action}`,
        conversationId: conversationId,
        isOutbound: true, // Mark as outbound case
        actionId: smsData.actionId
      });

      console.log(`✅ Case generated: ${caseInfo.caseNumber} (${caseInfo.caseId})`);

      // Step 5: SKIP ANALYSIS - Go directly to response building for outbound
      console.log('🚀 Skipping analysis for outbound - building response directly...');
      
      // Create minimal analysis data for outbound (no customer message to analyze)
      const analysisData = {
        analysis: `Outbound message initiated via action: ${smsData.action}`,
        ragNeeded: false,
        ragAnalysis: undefined,
        documentContexts: [],
        kbDocumentIds: []
      };

      // Update case with analysis and contact overview
      // Clean contact profile to remove non-serializable data (same as inbound)
      let cleanContactProfile = undefined;
      if (chatHistoryResult.contactProfile) {
        const profile = chatHistoryResult.contactProfile;
        cleanContactProfile = {
          profileId: profile.profileId,
          profileText: profile.profileText,
          isEmpty: profile.isEmpty,
          lastUpdatedMillis: typeof profile.lastUpdated?.toMillis === 'function'
            ? profile.lastUpdated.toMillis()
            : Date.now()
        };
      }

      await generateCaseNumberService.updateCaseAnalysis(
        smsData.tenantId,
        smsData.agentId,
        caseInfo.caseId,
        {
          analysis: analysisData.analysis,
          ragNeeded: analysisData.ragNeeded,
          conversationHistory: chatHistoryResult.conversationHistory,
          contactProfile: cleanContactProfile, // NEW: Save contact profile for outbound too
          promptContext: chatHistoryResult.promptContext // NEW: Save pre-formatted prompt sections
        }
      );

      // Step 6: Build response with outbound context
      console.log('🏗️ Building outbound SMS response...');
      const responseResult = await buildResponseService.buildSmsResponse({
        tenantId: smsData.tenantId,
        agentId: smsData.agentId,
        caseId: caseInfo.caseId,
        isTraining: smsData.isTraining,
        trainingSessionId: smsData.trainingSessionId,
        actionId: smsData.actionId,
        options: {
          enableRetry: true,
          maxRetries: 2
        }
      });

      if (!responseResult.success) {
        console.error('❌ Response building failed:', responseResult.error);
        res.status(500).json({
          success: false,
          error: 'Response generation failed',
          message: responseResult.error || 'Failed to generate outbound SMS response'
        });
        return;
      }

      console.log(`✅ Response generated: "${responseResult.message}"`);

      // Step 7: Get contact and agent phone numbers (contact should already be resolved)
      console.log('📞 Getting contact and agent phone numbers...');
      const payloadDetails = await getPayloadDetailsService.getPayloadDetails(
        smsData.tenantId,
        finalContactId, // Use resolved contact ID
        smsData.agentId,
        // Contact creation data (though contact should already exist from resolution step)
        {
          full_name: smsData.full_name,
          first_name: smsData.first_name,
          last_name: smsData.last_name,
          email: smsData.email,
          phone: smsData.targetPhoneNumber
        }
      );

      if (!payloadDetails.contactPhoneNumber) {
        console.error('❌ No phone number found for contact');
        res.status(400).json({
          success: false,
          error: 'Contact phone number not found',
          message: 'Unable to find phone number for contact in database'
        });
        return;
      }

      if (!payloadDetails.agentPhoneNumber && !smsData.destinationKey) {
        console.error('❌ No phone number found for agent');
        res.status(400).json({
          success: false,
          error: 'Agent phone number not found',
          message: 'Unable to find phone number for agent in database'
        });
        return;
      }

      console.log(`📱 Contact phone: ${payloadDetails.contactPhoneNumber}`);
      console.log(`📱 Agent phone: ${payloadDetails.agentPhoneNumber}`);

      // Step 8: Send the outbound SMS
      let finalResult;
      
      if (smsData.isTraining && smsData.trainingSessionId) {
        console.log('🧪 Training Mode: Saving outbound message to session instead of sending...');
        
        // Save agent message to training session
        const trainingResult = await trainingHandlerService.saveAgentMessage(
          smsData.tenantId,
          smsData.trainingSessionId,
          responseResult.message!,
          {
            agentId: smsData.agentId,
            contactId: finalContactId,
            messageId: `outbound_${caseInfo.caseId}`,
            caseId: caseInfo.caseId,
            caseNumber: caseInfo.caseNumber,
            conversationId: conversationId,
            isOutbound: true,
            actionId: smsData.actionId
          }
        );

        if (!trainingResult.success) {
          console.error('❌ Failed to save outbound message to training session:', trainingResult.error);
          res.status(500).json({
            success: false,
            error: 'Training message save failed',
            message: trainingResult.error || 'Failed to save outbound message to training session'
          });
          return;
        }

        finalResult = {
          success: true,
          messageId: `training_outbound_${caseInfo.caseId}`,
          status: 'saved_to_training'
        };

        console.log('✅ Outbound message saved to training session');

      } else {
        // Production mode - send actual SMS
        console.log('📤 Production Mode: Sending outbound SMS...');
        
        if (!payloadDetails.contactId) {
          console.error('❌ No contact ID available for SMS sending');
          res.status(500).json({
            success: false,
            error: 'Contact ID not found',
            message: 'Unable to determine contact ID for SMS sending'
          });
          return;
        }
        
        finalResult = await useDestinationKeyService.processMessage({
          destinationKey: smsData.destinationKey,
          tenantId: smsData.tenantId,
          agentId: smsData.agentId,
          messageData: {
            message: responseResult.message!,
            contactId: finalContactId,
            conversationId: conversationId,
            caseId: caseInfo.caseId,
            fromPhone: payloadDetails.agentPhoneNumber || undefined,
            toPhone: payloadDetails.contactPhoneNumber,
            timestamp: new Date().toISOString(),
            to: payloadDetails.contactPhoneNumber,
            from: payloadDetails.agentPhoneNumber || undefined
          },
          fallbackSmsRequest: {
            tenantId: smsData.tenantId,
            agentId: smsData.agentId,
            contactId: finalContactId,
            conversationId: conversationId,
            message: responseResult.message!,
            to: payloadDetails.contactPhoneNumber,
            from: payloadDetails.agentPhoneNumber || undefined,
            caseId: caseInfo.caseId
          }
        });

        if (!finalResult.success) {
          console.error(`❌ Outbound SMS failed via ${finalResult.method}:`, finalResult.error);
          res.status(500).json({
            success: false,
            error: 'SMS sending failed',
            message: finalResult.error || 'Failed to send outbound SMS',
            sendMethod: finalResult.method,
            destinationKey: finalResult.destinationKey
          });
          return;
        }

        console.log(`✅ Outbound SMS sent successfully via ${finalResult.method} - Message ID: ${finalResult.messageId}`);
        if (finalResult.destinationKey) {
          console.log(`🎯 Destination Key: ${finalResult.destinationKey}`);
        }
      }

      // Step 9: Return success response
      res.status(200).json({
        success: true,
        message: smsData.isTraining ? 'Outbound training message processed and saved successfully' : 'Outbound SMS processed and sent successfully',
        data: {
          messageId: finalResult.messageId,
          agentId: smsData.agentId,
          contactId: finalContactId,
          targetPhoneNumber: payloadDetails.contactPhoneNumber,
          caseId: caseInfo.caseId,
          caseNumber: caseInfo.caseNumber,
          generatedResponse: responseResult.message,
          sentMessageId: finalResult.messageId,
          processingStatus: smsData.isTraining ? 'completed_and_saved' : 'completed_and_sent',
          sendMethod: finalResult.method || 'traditional_sms',
          destinationKey: smsData.destinationKey,
          isTraining: smsData.isTraining || false,
          trainingSessionId: smsData.trainingSessionId,
          isOutbound: true,
          actionId: smsData.actionId,
          responseMetadata: responseResult.metadata,
          smsStatus: finalResult.status,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ SMS Agent Controller: Error processing outbound SMS:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to process outbound SMS for agent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const smsAgentController = new SmsAgentController();