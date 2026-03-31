import { smsAgentController } from '../../../../agentCommunication/sms/controllers/smsAgentController';
import { startPhoneCall } from '../../../../agentCommunication/phone/controllers/agentPhoneController';

interface ChannelHandlerParams {
  webhookContext: {
    tenantId: string;
    agentId: string;
    channel: 'sms' | 'email' | 'phone';
    method: 'inbound' | 'outbound';
  };
  requestBody: any;
  headers: any;
  webhookId: string;
}

interface ChannelHandlerResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  statusCode?: number;
}

export class HandleChannelDesignationService {
  /**
   * Route webhook requests to appropriate channel handlers
   */
  async handleChannelDesignation(params: ChannelHandlerParams): Promise<ChannelHandlerResult> {
    try {
      const { webhookContext, requestBody, headers, webhookId } = params;
      
      console.log('🚦 HandleChannelDesignationService: Starting channel routing');
      console.log('=📋 Routing Details:');
      console.log(`  - Channel: ${webhookContext.channel}`);
      console.log(`  - Method: ${webhookContext.method}`);
      console.log(`  - Tenant ID: ${webhookContext.tenantId}`);
      console.log(`  - Agent ID: ${webhookContext.agentId}`);
      console.log(`  - Webhook ID: ${webhookId}`);
      console.log('=====================================');

      // Route based on channel and method
      const channelMethod = `${webhookContext.channel}-${webhookContext.method}`;
      
      switch (channelMethod) {
        case 'sms-inbound':
          return await this.handleSmsInbound(webhookContext, requestBody, headers, webhookId);
        
        case 'sms-outbound':
          return await this.handleSmsOutbound(webhookContext, requestBody, headers, webhookId);
        
        case 'email-inbound':
          return await this.handleEmailInbound(webhookContext, requestBody, headers, webhookId);
        
        case 'email-outbound':
          return await this.handleEmailOutbound(webhookContext, requestBody, headers, webhookId);
        
        case 'phone-inbound':
          return await this.handlePhoneInbound(webhookContext, requestBody, headers, webhookId);
        
        case 'phone-outbound':
          return await this.handlePhoneOutbound(webhookContext, requestBody, headers, webhookId);
        
        default:
          console.error('❌ Unsupported channel-method combination:', channelMethod);
          return {
            success: false,
            error: 'Unsupported channel method',
            message: `Channel-method combination '${channelMethod}' is not supported`,
            statusCode: 400
          };
      }

    } catch (error) {
      console.error('=❌ HandleChannelDesignationService: Unexpected error:', error);
      return {
        success: false,
        error: 'Channel designation service error',
        message: error instanceof Error ? error.message : 'Unknown channel routing error',
        statusCode: 500
      };
    }
  }

  /**
   * Handle inbound SMS messages
   */
  private async handleSmsInbound(
    webhookContext: any,
    requestBody: any,
    headers: any,
    webhookId: string
  ): Promise<ChannelHandlerResult> {
    try {
      console.log('📱 Processing SMS inbound message');
      console.log('=📋 SMS Data extraction check:');
      
      // Log payload body message fields
      console.log('  PAYLOAD BODY - Message fields:');
      console.log('    - messageContent:', requestBody.messageContent);
      console.log('    - message:', requestBody.message);
      console.log('    - text:', requestBody.text);
      console.log('    - body:', requestBody.body);
      console.log('    - content:', requestBody.content);
      console.log('    - customData?.messageContent:', requestBody.customData?.messageContent);
      console.log('    - customData?.message:', requestBody.customData?.message);
      console.log('    - customData?.text:', requestBody.customData?.text);
      
      // Log header message fields
      console.log('  HEADERS - Message fields:');
      console.log('    - messagecontent:', headers.messagecontent);
      console.log('    - messageContent:', headers.messageContent);
      console.log('    - message:', headers.message);
      console.log('    - text:', headers.text);
      console.log('    - body:', headers.body);
      console.log('    - content:', headers.content);
      
      // Log payload body phone fields
      console.log('  PAYLOAD BODY - Phone fields:');
      console.log('    - from:', requestBody.from);
      console.log('    - fromAddress:', requestBody.fromAddress);
      console.log('    - phone:', requestBody.phone);
      console.log('    - phoneNumber:', requestBody.phoneNumber);
      console.log('    - fromPhone:', requestBody.fromPhone);
      console.log('    - customData?.from:', requestBody.customData?.from);
      console.log('    - customData?.phone:', requestBody.customData?.phone);
      
      // Log header phone fields
      console.log('  HEADERS - Phone fields:');
      console.log('    - from:', headers.from);
      console.log('    - fromaddress:', headers.fromaddress);
      console.log('    - fromAddress:', headers.fromAddress);
      console.log('    - phone:', headers.phone);
      console.log('    - phonenumber:', headers.phonenumber);
      console.log('    - phoneNumber:', headers.phoneNumber);
      
      // Log destination key fields
      console.log('  PAYLOAD BODY - DestinationKey fields:');
      console.log('    - destinationKey:', requestBody.destinationKey);
      console.log('    - customData?.destinationKey:', requestBody.customData?.destinationKey);
      console.log('  HEADERS - DestinationKey fields:');
      console.log('    - destinationkey:', headers.destinationkey);
      console.log('    - destinationKey:', headers.destinationKey);

      // Extract and validate required SMS fields - check both payload body and headers
      // Message content extraction (comprehensive field mapping)
      // Handle both direct string values and objects with body property (like GHL format)
      const extractMessageContent = (value: any): string | undefined => {
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value?.body) return value.body;
        return undefined;
      };

      const messageContent = extractMessageContent(requestBody.messageContent) ||    // Standard field
                             extractMessageContent(requestBody.message) ||           // Alternative field (handles GHL object format)
                             extractMessageContent(requestBody.text) ||              // Common SMS field
                             extractMessageContent(requestBody.body) ||              // Alternative body field
                             extractMessageContent(requestBody.content) ||           // Generic content field
                             extractMessageContent(requestBody.customData?.messageContent) ||  // GoHighLevel format
                             extractMessageContent(requestBody.customData?.message) ||         // GoHighLevel alternative
                             extractMessageContent(requestBody.customData?.text) ||            // GoHighLevel SMS text
                             extractMessageContent(headers.messagecontent) ||        // Headers (lowercase)
                             extractMessageContent(headers.messageContent) ||        // Headers (camelCase)
                             extractMessageContent(headers.message) ||               // Headers alternative
                             extractMessageContent(headers.text) ||                  // Headers SMS text
                             extractMessageContent(headers.body) ||                  // Headers body
                             extractMessageContent(headers.content);                 // Headers content

      // Phone number extraction (comprehensive field mapping)
      const fromPhoneNumber = requestBody.from ||             // Standard from field
                               requestBody.fromAddress ||     // Alternative from
                               requestBody.phone ||           // Direct phone field
                               requestBody.phoneNumber ||     // Alternative phone
                               requestBody.fromPhone ||       // From phone specific
                               requestBody.senderPhone ||     // Sender phone
                               requestBody.customData?.from ||        // GoHighLevel from
                               requestBody.customData?.phone ||       // GoHighLevel phone
                               requestBody.customData?.phoneNumber || // GoHighLevel phoneNumber
                               headers.from ||                // Headers from
                               headers.fromaddress ||         // Headers fromaddress (lowercase)
                               headers.fromAddress ||         // Headers fromAddress
                               headers.phone ||               // Headers phone
                               headers.phonenumber ||         // Headers phonenumber (lowercase)
                               headers.phoneNumber ||         // Headers phoneNumber
                               headers.fromphone ||           // Headers fromphone (lowercase)
                               headers.fromPhone;             // Headers fromPhone

      const toPhoneNumber = requestBody.to || 
                            requestBody.toAddress || 
                            requestBody.agentPhoneNumber ||
                            requestBody.toPhone ||
                            headers.to ||
                            headers.toaddress ||
                            headers.toAddress ||
                            headers.tophone ||
                            headers.toPhone;

      // Extract destination key (check both main body and customData)
      const destinationKey = requestBody.destinationKey || 
                            requestBody.customData?.destinationKey ||
                            headers.destinationkey ||
                            headers.destinationKey;

      console.log('📋 Extracted values:');
      console.log('  - messageContent:', messageContent);
      console.log('  - fromPhoneNumber:', fromPhoneNumber);
      console.log('  - destinationKey:', destinationKey || 'None');

      if (!messageContent) {
        console.error('❌ Missing required field: messageContent');
        return {
          success: false,
          error: 'Missing required field',
          message: 'messageContent is required for SMS inbound processing',
          statusCode: 400
        };
      }

      if (!fromPhoneNumber) {
        console.error('❌ Missing required field: from phone number');
        return {
          success: false,
          error: 'Missing required field', 
          message: 'from phone number (from/fromAddress/phone) is required for SMS inbound processing',
          statusCode: 400
        };
      }

      // Prepare payload for SMS agent communication
      // Use 'from' field as single source of truth for contact identification
      // It can contain either a phone number or our internal contact ID
      const contactIdentifier = fromPhoneNumber; // This is actually from the 'from' field, not necessarily a phone
      
      console.log('📋 Contact identifier from "from" field: ' + contactIdentifier);
      console.log('📋 Will detect if this is a phone number or contact ID in the lookup service');
      
      // Extract contact creation data for proper contact handling
      const contactCreationData = this.extractContactCreationData(requestBody);
      console.log('📋 Extracted contact creation data for SMS inbound:', {
        full_name: contactCreationData.full_name,
        first_name: contactCreationData.first_name,
        last_name: contactCreationData.last_name,
        email: contactCreationData.email,
        phone: contactCreationData.phone
      });
      
      const smsPayload = {
        messageContent,
        tenantId: webhookContext.tenantId,
        agentId: webhookContext.agentId,
        contactId: contactIdentifier,
        action: requestBody.action || 'inbound_webhook_message',
        
        // Destination key (already extracted above)
        destinationKey: destinationKey,
        
        // Phone number details
        from: fromPhoneNumber,
        to: toPhoneNumber,
        agentPhoneNumber: toPhoneNumber,
        
        // Optional fields
        messageId: requestBody.messageId || `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        conversationId: requestBody.conversationId,
        timestamp: requestBody.timestamp || new Date().toISOString(),
        
        // Media attachments (if any)
        mediaUrls: requestBody.mediaUrls,
        mediaTypes: requestBody.mediaTypes,
        
        // Twilio-specific fields (optional)
        messagingServiceId: requestBody.messagingServiceId,
        messageStatus: requestBody.messageStatus || 'received',
        agentPhoneNumberSid: requestBody.agentPhoneNumberSid,
        
        // Agent settings (optional)
        agentSettings: requestBody.agentSettings || {
          language: 'en',
          processingMode: 'standard'
        },
        
        // Training mode (optional)
        isTraining: requestBody.isTraining || false,
        trainingSessionId: requestBody.trainingSessionId,
        
        // Contact creation data (CRITICAL: Pass extracted contact info to SMS service)
        full_name: contactCreationData.full_name,
        first_name: contactCreationData.first_name,
        last_name: contactCreationData.last_name,
        email: contactCreationData.email,
        phone: contactCreationData.phone || fromPhoneNumber,
        
        // Webhook metadata
        webhookId,
        webhookSource: 'universal_webhook',
        customData: requestBody.customData
      };

      console.log('📱 Prepared SMS payload for agent communication');
      console.log('=📋 Payload keys:', Object.keys(smsPayload));

      // Call the SMS agent communication service
      console.log('📡 Calling SMS agent communication service...');
      const agentServiceResult = await this.callSmsAgentService(smsPayload);
      
      if (!agentServiceResult.success) {
        console.error('❌ SMS agent service call failed:', agentServiceResult.error);
        return {
          success: false,
          error: 'SMS agent service error',
          message: agentServiceResult.message || 'Failed to process SMS with agent service',
          statusCode: 500
        };
      }

      console.log('✅ SMS agent service call successful');
      console.log('📱 SMS webhook processed and forwarded to agent');
      
      return {
        success: true,
        data: {
          processed: true,
          channel: 'sms',
          method: 'inbound',
          messageId: smsPayload.messageId,
          agentResponse: agentServiceResult.data,
          smsPayload
        }
      };

    } catch (error) {
      console.error('Error handling SMS inbound:', error);
      return {
        success: false,
        error: 'SMS inbound processing error',
        message: error instanceof Error ? error.message : 'Unknown SMS processing error',
        statusCode: 500
      };
    }
  }

  /**
   * Handle outbound SMS messages
   */
  private async handleSmsOutbound(
    webhookContext: any,
    requestBody: any,
    headers: any,
    webhookId: string
  ): Promise<ChannelHandlerResult> {
    try {
      console.log('📱 Processing SMS outbound message request');
      console.log('=📋 SMS Outbound Data extraction check:');
      
      // Log payload body target fields
      console.log('  PAYLOAD BODY - Target fields:');
      console.log('    - to:', requestBody.to);
      console.log('    - toAddress:', requestBody.toAddress);
      console.log('    - targetPhoneNumber:', requestBody.targetPhoneNumber);
      console.log('    - phoneNumber:', requestBody.phoneNumber);
      console.log('    - phone:', requestBody.phone);
      console.log('    - toPhone:', requestBody.toPhone);
      console.log('    - contactId:', requestBody.contactId);
      console.log('    - contact_id:', requestBody.contact_id);
      console.log('    - customData?.to:', requestBody.customData?.to);
      console.log('    - customData?.phone:', requestBody.customData?.phone);
      console.log('    - customData?.contactId:', requestBody.customData?.contactId);
      
      // Log header target fields
      console.log('  HEADERS - Target fields:');
      console.log('    - to:', headers.to);
      console.log('    - toaddress:', headers.toaddress);
      console.log('    - toAddress:', headers.toAddress);
      console.log('    - phone:', headers.phone);
      console.log('    - phonenumber:', headers.phonenumber);
      console.log('    - phoneNumber:', headers.phoneNumber);
      console.log('    - contactid:', headers.contactid);
      console.log('    - contactId:', headers.contactId);
      
      // Log action fields
      console.log('  ACTION fields:');
      console.log('    - action:', requestBody.action);
      console.log('    - actionId:', requestBody.actionId);

      // Extract target phone number - comprehensive field mapping for both body and headers
      const targetPhoneNumber = requestBody.to ||                     // Standard to field
                               requestBody.toAddress ||               // Alternative to address
                               requestBody.targetPhoneNumber ||       // Explicit target phone
                               requestBody.phoneNumber ||             // Alternative phone
                               requestBody.phone ||                   // Direct phone
                               requestBody.toPhone ||                 // To phone specific
                               requestBody.customData?.to ||          // GoHighLevel to
                               requestBody.customData?.phone ||       // GoHighLevel phone
                               requestBody.customData?.phoneNumber || // GoHighLevel phoneNumber
                               headers.to ||                          // Headers to
                               headers.toaddress ||                   // Headers toaddress (lowercase)
                               headers.toAddress ||                   // Headers toAddress
                               headers.phone ||                       // Headers phone
                               headers.phonenumber ||                 // Headers phonenumber (lowercase)
                               headers.phoneNumber ||                 // Headers phoneNumber
                               headers.tophone ||                     // Headers tophone (lowercase)
                               headers.toPhone;                       // Headers toPhone
      
      const contactId = requestBody.contactId || 
                        requestBody.contact_id || 
                        requestBody.customData?.contactId ||
                        requestBody.customData?.contact_id ||
                        headers.contactid ||
                        headers.contactId;
      // Default to 'general' if no action ID is provided
      const actionId = requestBody.action || requestBody.actionId || 'general';
      
      // Extract destinationKey from customData if present
      const destinationKey = requestBody.destinationKey || 
                             requestBody.customData?.destinationKey ||
                             headers.destinationKey;

      // For SMS outbound, we need either a target phone number OR contact ID
      if (!targetPhoneNumber && !contactId) {
        console.error('❌ Missing required field: target phone number or contact ID');
        return {
          success: false,
          error: 'Missing required field',
          message: 'Either targetPhoneNumber (toAddress/targetPhoneNumber/phoneNumber/phone/to) or contactId (contactId/contact_id) is required for SMS outbound processing',
          statusCode: 400
        };
      }

      console.log('📋 SMS Outbound Contact/Phone resolution:');
      console.log(`  - Target Phone Number: ${targetPhoneNumber ? targetPhoneNumber : 'none'}`);
      console.log(`  - Contact ID: ${contactId ? contactId : 'none'}`);
      console.log(`  - Action ID: ${actionId}`);
      console.log(`  - Destination Key: ${destinationKey ? destinationKey : 'none (will use traditional SMS)'}`);
      
      // For SMS outbound, we use the 'to' field as the contact identifier (opposite of inbound)
      // This will be used to find or create the contact for the outbound message
      const contactIdentifier = targetPhoneNumber || contactId;
      
      console.log('📋 Contact identifier for outbound SMS: ' + contactIdentifier);
      console.log('📋 Will detect if this is a phone number or contact ID in the SMS service');
      
      // Extract contact creation data for proper contact handling
      const contactCreationData = this.extractContactCreationData(requestBody);
      console.log('📋 Extracted contact creation data for SMS outbound:', {
        full_name: contactCreationData.full_name,
        first_name: contactCreationData.first_name,
        last_name: contactCreationData.last_name,
        email: contactCreationData.email,
        phone: contactCreationData.phone
      });

      // Prepare payload for SMS agent communication service
      // We'll use the existing /inbound endpoint but adapt the payload for outbound use
      const smsPayload = {
        // For outbound, we create a synthetic message content based on the action
        messageContent: requestBody.messageContent || `Outbound SMS triggered via action: ${actionId}`,
        tenantId: webhookContext.tenantId,
        agentId: webhookContext.agentId,
        
        // Use target phone/contact as the contactId (the SMS service will handle lookup/creation)
        contactId: contactIdentifier,
        action: `outbound_${actionId}`,
        
        // Add destinationKey if present (for webhook routing)
        ...(destinationKey && { destinationKey }),
        
        // Phone number details - reversed for outbound
        from: undefined, // Agent will determine the 'from' number
        to: targetPhoneNumber, // Target recipient
        agentPhoneNumber: undefined, // Agent service will determine this
        
        // Optional fields
        messageId: `outbound_webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        conversationId: requestBody.conversationId,
        timestamp: new Date().toISOString(),
        
        // Outbound-specific fields
        isOutbound: true,
        originalAction: actionId,
        targetPhoneNumber: targetPhoneNumber,
        targetContactId: contactId,
        
        // Agent settings (optional)
        agentSettings: {
          language: requestBody.language || 'en',
          processingMode: 'outbound',
          isOutboundAction: true
        },
        
        // Contact creation data (CRITICAL: Pass extracted contact info to SMS service)
        full_name: contactCreationData.full_name,
        first_name: contactCreationData.first_name,
        last_name: contactCreationData.last_name,
        email: contactCreationData.email,
        phone: contactCreationData.phone || targetPhoneNumber,
        
        // Custom data for message personalization
        customData: {
          ...requestBody.customData,
          outboundTrigger: 'webhook',
          originalActionId: actionId,
          webhookSource: 'universal_webhook'
        },
        
        // Webhook metadata
        webhookId,
        webhookSource: 'universal_webhook'
      };

      console.log('📱 Prepared SMS outbound payload for agent communication');
      console.log('=📋 Payload summary:', {
        tenantId: smsPayload.tenantId,
        agentId: smsPayload.agentId,
        contactId: smsPayload.contactId,
        action: smsPayload.action,
        originalAction: smsPayload.originalAction,
        to: smsPayload.to ? '***' + smsPayload.to.slice(-4) : 'none',
        isOutbound: smsPayload.isOutbound
      });

      // Call the SMS agent communication service (will automatically route to outbound endpoint)
      console.log('📡 Calling SMS agent communication service for outbound...');
      const agentServiceResult = await this.callSmsAgentService(smsPayload);
      
      if (!agentServiceResult.success) {
        console.error('❌ SMS agent service call failed:', agentServiceResult.error);
        return {
          success: false,
          error: 'SMS agent service error',
          message: agentServiceResult.message || 'Failed to process outbound SMS with agent service',
          statusCode: 500
        };
      }

      console.log('✅ SMS agent service call successful');
      console.log('📱 SMS outbound webhook processed and message sent');
      
      return {
        success: true,
        data: {
          processed: true,
          channel: 'sms',
          method: 'outbound',
          messageSent: true,
          action: actionId,
          targetPhoneNumber: targetPhoneNumber ? '***' + targetPhoneNumber.slice(-4) : undefined,
          contactId: contactId,
          agentResponse: agentServiceResult.data,
          smsPayload: {
            ...smsPayload,
            to: smsPayload.to ? '***' + smsPayload.to.slice(-4) : undefined,
            contactId: '***' // Mask for security
          }
        }
      };

    } catch (error) {
      console.error('Error handling SMS outbound:', error);
      return {
        success: false,
        error: 'SMS outbound processing error',
        message: error instanceof Error ? error.message : 'Unknown SMS outbound processing error',
        statusCode: 500
      };
    }
  }

  /**
   * Handle inbound email messages (future implementation)
   */
  private async handleEmailInbound(
    webhookContext: any,
    requestBody: any,
    headers: any,
    webhookId: string
  ): Promise<ChannelHandlerResult> {
    console.log('📧 Email inbound processing not yet implemented');
    return {
      success: false,
      error: 'Not implemented',
      message: 'Email inbound processing is not yet implemented',
      statusCode: 501
    };
  }

  /**
   * Handle outbound email messages (future implementation)
   */
  private async handleEmailOutbound(
    webhookContext: any,
    requestBody: any,
    headers: any,
    webhookId: string
  ): Promise<ChannelHandlerResult> {
    console.log('📧 Email outbound processing not yet implemented');
    return {
      success: false,
      error: 'Not implemented',
      message: 'Email outbound processing is not yet implemented',
      statusCode: 501
    };
  }

  /**
   * Handle inbound phone calls (future implementation)
   */
  private async handlePhoneInbound(
    webhookContext: any,
    requestBody: any,
    headers: any,
    webhookId: string
  ): Promise<ChannelHandlerResult> {
    console.log('📞 Phone inbound processing not yet implemented');
    return {
      success: false,
      error: 'Not implemented',
      message: 'Phone inbound processing is not yet implemented',
      statusCode: 501
    };
  }

  /**
   * Handle outbound phone calls
   */
  private async handlePhoneOutbound(
    webhookContext: any,
    requestBody: any,
    headers: any,
    webhookId: string
  ): Promise<ChannelHandlerResult> {
    try {
      console.log('📞 Processing phone outbound call request');
      console.log('=📋 Phone Data extraction check:');
      
      // Log payload body target fields
      console.log('  PAYLOAD BODY - Target fields:');
      console.log('    - to:', requestBody.to);
      console.log('    - toAddress:', requestBody.toAddress);
      console.log('    - targetPhoneNumber:', requestBody.targetPhoneNumber);
      console.log('    - phoneNumber:', requestBody.phoneNumber);
      console.log('    - phone:', requestBody.phone);
      console.log('    - toPhone:', requestBody.toPhone);
      console.log('    - contactId:', requestBody.contactId);
      console.log('    - contact_id:', requestBody.contact_id);
      console.log('    - customData?.to:', requestBody.customData?.to);
      console.log('    - customData?.phone:', requestBody.customData?.phone);
      console.log('    - customData?.contactId:', requestBody.customData?.contactId);
      
      // Log header target fields
      console.log('  HEADERS - Target fields:');
      console.log('    - to:', headers.to);
      console.log('    - toaddress:', headers.toaddress);
      console.log('    - toAddress:', headers.toAddress);
      console.log('    - phone:', headers.phone);
      console.log('    - phonenumber:', headers.phonenumber);
      console.log('    - phoneNumber:', headers.phoneNumber);
      console.log('    - contactid:', headers.contactid);
      console.log('    - contactId:', headers.contactId);

      // Extract target phone number - comprehensive field mapping for both body and headers
      const targetPhoneNumber = requestBody.to ||                     // Standard to field
                               requestBody.toAddress ||               // Alternative to address
                               requestBody.targetPhoneNumber ||       // Explicit target phone
                               requestBody.phoneNumber ||             // Alternative phone
                               requestBody.phone ||                   // Direct phone
                               requestBody.toPhone ||                 // To phone specific
                               requestBody.customData?.to ||          // GoHighLevel to
                               requestBody.customData?.phone ||       // GoHighLevel phone
                               requestBody.customData?.phoneNumber || // GoHighLevel phoneNumber
                               headers.to ||                          // Headers to
                               headers.toaddress ||                   // Headers toaddress (lowercase)
                               headers.toAddress ||                   // Headers toAddress
                               headers.phone ||                       // Headers phone
                               headers.phonenumber ||                 // Headers phonenumber (lowercase)
                               headers.phoneNumber ||                 // Headers phoneNumber
                               headers.tophone ||                     // Headers tophone (lowercase)
                               headers.toPhone;                       // Headers toPhone
      
      const contactId = requestBody.contactId || 
                        requestBody.contact_id || 
                        requestBody.customData?.contactId ||
                        requestBody.customData?.contact_id ||
                        headers.contactid ||
                        headers.contactId;

      // Validate that we have either a phone number or contact ID
      if (!targetPhoneNumber && !contactId) {
        console.error('❌ Missing required field: target phone number or contact ID');
        return {
          success: false,
          error: 'Missing required field',
          message: 'Either targetPhoneNumber (toAddress/targetPhoneNumber/phoneNumber/phone/to) or contactId (contactId/contact_id) is required for phone outbound processing',
          statusCode: 400
        };
      }

      console.log('📋 Contact/Phone resolution:');
      console.log(`  - Target Phone Number: ${targetPhoneNumber ? targetPhoneNumber : 'none'}`);
      console.log(`  - Contact ID: ${contactId ? contactId : 'none'}`);
      
      // Extract contact creation data for potential contact auto-creation
      const contactCreationData = this.extractContactCreationData(requestBody);

      console.log('📋 Extracted contact creation data for phone outbound:', {
        full_name: contactCreationData.full_name,
        first_name: contactCreationData.first_name,
        last_name: contactCreationData.last_name,
        email: contactCreationData.email,
        phone: contactCreationData.phone,
        hasContactId: !!contactCreationData.contact_id
      });
      
      // The phone service expects either targetPhoneNumber OR contactId
      // If we have both, prioritize the explicit phone number
      // If we only have contactId, the phone service will look up the number
      // If we only have phone number, the phone service will use it directly

      // Prepare payload for phone agent communication service
      const phonePayload = {
        tenantId: webhookContext.tenantId,
        agentId: webhookContext.agentId,
        targetPhoneNumber: targetPhoneNumber,
        contactId: contactId,
        
        // Contact creation fields (for auto-creation if needed)
        full_name: contactCreationData.full_name,
        first_name: contactCreationData.first_name,
        last_name: contactCreationData.last_name,
        email: contactCreationData.email,
        phone: contactCreationData.phone || targetPhoneNumber, // Use target phone as fallback
        
        // Additional context for debugging/tracking
        webhookId,
        webhookSource: 'universal_webhook',
        customData: requestBody.customData,
        action: requestBody.action || 'outbound_webhook_call',
        timestamp: new Date().toISOString()
      };

      console.log('📞 Prepared phone payload for agent communication');
      console.log('=📋 Payload summary:', {
        tenantId: phonePayload.tenantId,
        agentId: phonePayload.agentId,
        targetPhoneNumber: phonePayload.targetPhoneNumber ? '***' + phonePayload.targetPhoneNumber.slice(-4) : 'none',
        contactId: phonePayload.contactId,
        action: phonePayload.action
      });

      // Call the phone agent communication service
      console.log('📡 Calling phone agent communication service...');
      const agentServiceResult = await this.callPhoneAgentService(phonePayload);
      
      if (!agentServiceResult.success) {
        console.error('❌ Phone agent service call failed:', agentServiceResult.error);
        return {
          success: false,
          error: 'Phone agent service error',
          message: agentServiceResult.message || 'Failed to process phone call with agent service',
          statusCode: 500
        };
      }

      console.log('✅ Phone agent service call successful');
      console.log('📞 Phone webhook processed and call initiated');
      
      return {
        success: true,
        data: {
          processed: true,
          channel: 'phone',
          method: 'outbound',
          callInitiated: true,
          conversationId: agentServiceResult.data?.conversationId,
          callSid: agentServiceResult.data?.callSid,
          targetPhoneNumber: targetPhoneNumber ? '***' + targetPhoneNumber.slice(-4) : undefined,
          agentResponse: agentServiceResult.data,
          phonePayload: {
            ...phonePayload,
            targetPhoneNumber: phonePayload.targetPhoneNumber ? '***' + phonePayload.targetPhoneNumber.slice(-4) : undefined
          }
        }
      };

    } catch (error) {
      console.error('Error handling phone outbound:', error);
      return {
        success: false,
        error: 'Phone outbound processing error',
        message: error instanceof Error ? error.message : 'Unknown phone processing error',
        statusCode: 500
      };
    }
  }

  /**
   * Call the SMS agent communication service directly (no HTTP)
   */
  private async callSmsAgentService(payload: any): Promise<{success: boolean, data?: any, error?: string, message?: string}> {
    try {
      // Determine the correct method based on whether it's outbound or inbound
      const isOutbound = payload.isOutbound || payload.action?.startsWith('outbound_') || false;

      console.log(`📡 Calling SMS agent controller directly (${isOutbound ? 'OUTBOUND' : 'INBOUND'})`);
      console.log('📋 Payload summary:', {
        messageContent: typeof payload.messageContent === 'string'
          ? payload.messageContent.substring(0, 50) + '...'
          : `[${typeof payload.messageContent}] ${JSON.stringify(payload.messageContent)}`,
        tenantId: payload.tenantId,
        agentId: payload.agentId,
        contactId: payload.contactId,
        from: payload.from,
        to: payload.to,
        messageId: payload.messageId,
        isOutbound: payload.isOutbound,
        action: payload.action
      });

      // Create a mock request/response object
      const mockReq = {
        body: payload,
        tenantId: payload.tenantId
      } as any;

      let responseData: any = null;
      let statusCode = 200;

      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        }
      } as any;

      // Call the appropriate controller method
      if (isOutbound) {
        await smsAgentController.handleOutboundAgentSms(mockReq, mockRes);
      } else {
        await smsAgentController.handleInboundAgentSms(mockReq, mockRes);
      }

      if (statusCode !== 200) {
        console.error(`❌ SMS agent controller responded with ${statusCode}:`, responseData);
        return {
          success: false,
          error: 'Agent service error',
          message: responseData?.message || `SMS agent service returned ${statusCode}`
        };
      }

      console.log('✅ SMS agent controller response:', {
        status: statusCode,
        dataKeys: Object.keys(responseData || {})
      });

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ Error calling SMS agent controller:', error);
      return {
        success: false,
        error: 'Service call error',
        message: error instanceof Error ? error.message : 'Unknown error calling SMS agent service'
      };
    }
  }

  /**
   * Extract contact creation data from request body
   */
  private extractContactCreationData(requestBody: any) {
    return {
      full_name: requestBody.full_name || 
                 requestBody.fullName || 
                 requestBody.name ||
                 requestBody.customData?.full_name ||
                 requestBody.customData?.fullName ||
                 requestBody.customData?.name,
      
      first_name: requestBody.first_name || 
                  requestBody.firstName || 
                  requestBody.customData?.first_name ||
                  requestBody.customData?.firstName,
      
      last_name: requestBody.last_name || 
                 requestBody.lastName || 
                 requestBody.customData?.last_name ||
                 requestBody.customData?.lastName,
      
      email: requestBody.email || 
             requestBody.emailAddress ||
             requestBody.customData?.email ||
             requestBody.customData?.emailAddress,
      
      phone: requestBody.phone || 
             requestBody.phoneNumber ||
             requestBody.to ||
             requestBody.targetPhoneNumber ||
             requestBody.customData?.phone ||
             requestBody.customData?.phoneNumber,

      contact_id: requestBody.contactId || 
                  requestBody.contact_id ||
                  requestBody.customData?.contactId ||
                  requestBody.customData?.contact_id
    };
  }

  /**
   * Call the phone agent controller directly (no HTTP)
   */
  private async callPhoneAgentService(payload: any): Promise<{success: boolean, data?: any, error?: string, message?: string}> {
    try {
      console.log('📡 Calling phone agent controller directly (OUTBOUND)');
      console.log('📋 Payload summary:', {
        tenantId: payload.tenantId,
        agentId: payload.agentId,
        targetPhoneNumber: payload.targetPhoneNumber ? '***' + payload.targetPhoneNumber.slice(-4) : 'none',
        contactId: payload.contactId,
        action: payload.action
      });

      // Create a mock request/response object
      const mockReq = {
        body: {
          agentId: payload.agentId,
          targetPhoneNumber: payload.targetPhoneNumber,
          contactId: payload.contactId,
          actionId: payload.actionId,
          full_name: payload.full_name,
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email,
          phone: payload.phone
        },
        tenantId: payload.tenantId
      } as any;

      let responseData: any = null;
      let statusCode = 200;

      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        }
      } as any;

      // Call the phone controller directly
      await startPhoneCall(mockReq, mockRes);

      if (statusCode !== 200 && statusCode !== 201) {
        console.error(`❌ Phone controller returned status ${statusCode}:`, responseData);
        return {
          success: false,
          error: responseData?.error || 'Phone call failed',
          message: responseData?.message || responseData?.details || `Status ${statusCode}`
        };
      }

      console.log('✅ Phone controller response:', {
        statusCode,
        success: responseData?.success,
        hasData: !!responseData?.data
      });

      return {
        success: true,
        data: responseData.data || responseData
      };

    } catch (error) {
      console.error('❌ Error calling phone agent service:', error);
      return {
        success: false,
        error: 'Service call error',
        message: error instanceof Error ? error.message : 'Unknown error calling phone agent service'
      };
    }
  }
}

export const handleChannelDesignationService = new HandleChannelDesignationService();