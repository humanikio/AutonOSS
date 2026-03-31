import { tenantResolver } from './newRequestHandler/findTenant';
import { contactFinder } from '../../../contacts/utilities/findContact';
import { conversationManager } from './newRequestHandler/manageConversation';
import { executeTrigger } from '../../../workflows/triggerSubscriptions/services/triggerExecutions';

interface TwilioSmsWebhook {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaUrl1?: string;
  MediaUrl2?: string;
  MediaUrl3?: string;
  MediaUrl4?: string;
  MediaUrl5?: string;
  MediaUrl6?: string;
  MediaUrl7?: string;
  MediaUrl8?: string;
  MediaUrl9?: string;
  MediaContentType0?: string;
  MediaContentType1?: string;
  MediaContentType2?: string;
  MediaContentType3?: string;
  MediaContentType4?: string;
  MediaContentType5?: string;
  MediaContentType6?: string;
  MediaContentType7?: string;
  MediaContentType8?: string;
  MediaContentType9?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
  SmsMessageSid?: string;
  SmsStatus?: string;
  NumSegments?: string;
  ReferralNumMedia?: string;
  OptOutType?: string;
  ApiVersion?: string;
}

interface ProcessedSmsData {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  mediaUrls: string[];
  mediaTypes: string[];
  tenantId?: string;
  messagingServiceId?: string;
  metadata: {
    fromCity?: string;
    fromState?: string;
    fromCountry?: string;
    numSegments?: number;
    timestamp: string;
  };
}

export class NewRequestHandler {
  async processIncomingSms(smsData: TwilioSmsWebhook): Promise<ProcessedSmsData> {
    console.log('= Processing new SMS request...');
    console.log('=� Raw payload structure:', JSON.stringify(smsData, null, 2));

    const mediaUrls: string[] = [];
    const mediaTypes: string[] = [];
    
    if (smsData.NumMedia && parseInt(smsData.NumMedia) > 0) {
      const numMedia = parseInt(smsData.NumMedia);
      console.log(`=� Found ${numMedia} media attachments`);
      
      for (let i = 0; i < numMedia && i < 10; i++) {
        const urlKey = `MediaUrl${i}` as keyof TwilioSmsWebhook;
        const typeKey = `MediaContentType${i}` as keyof TwilioSmsWebhook;
        
        if (smsData[urlKey]) {
          mediaUrls.push(smsData[urlKey] as string);
          console.log(`=� Media ${i}: ${smsData[urlKey]}`);
        }
        if (smsData[typeKey]) {
          mediaTypes.push(smsData[typeKey] as string);
          console.log(`=� Type ${i}: ${smsData[typeKey]}`);
        }
      }
    }

    // Resolve tenant from MessagingServiceSid
    let tenantId: string | undefined;
    if (smsData.MessagingServiceSid) {
      try {
        console.log(`=🔍 Resolving tenant for MessagingServiceSid: ${smsData.MessagingServiceSid}`);
        tenantId = await tenantResolver.findTenantFromMessagingService(smsData.MessagingServiceSid) || undefined;
        if (tenantId) {
          console.log(`=✅ Tenant resolved: ${tenantId}`);
        } else {
          console.log(`=⚠️ No tenant found for MessagingServiceSid: ${smsData.MessagingServiceSid}`);
        }
      } catch (error) {
        console.error(`=❌ Error resolving tenant from MessagingServiceSid:`, error);
      }
    } else {
      console.log(`=⚠️ No MessagingServiceSid provided in webhook - falling back to phone number lookup`);
      // TODO: Fallback to phone number lookup for older numbers not in messaging services
    }

    const processedData: ProcessedSmsData = {
      messageSid: smsData.MessageSid,
      from: smsData.From,
      to: smsData.To,
      body: smsData.Body,
      mediaUrls,
      mediaTypes,
      tenantId,
      messagingServiceId: smsData.MessagingServiceSid,
      metadata: {
        fromCity: smsData.FromCity,
        fromState: smsData.FromState,
        fromCountry: smsData.FromCountry,
        numSegments: smsData.NumSegments ? parseInt(smsData.NumSegments) : undefined,
        timestamp: new Date().toISOString()
      }
    };

    console.log(' Processed SMS data:', {
      messageSid: processedData.messageSid,
      from: processedData.from,
      to: processedData.to,
      bodyLength: processedData.body?.length || 0,
      mediaCount: processedData.mediaUrls.length,
      tenantId: processedData.tenantId,
      messagingServiceId: processedData.messagingServiceId,
      location: `${processedData.metadata.fromCity || 'Unknown'}, ${processedData.metadata.fromState || 'Unknown'}`
    });

    return processedData;
  }

  async mapSmsData(smsData: TwilioSmsWebhook): Promise<void> {
    console.log('=�  Mapping SMS data structure...');
    
    const mapping = {
      'Message ID': smsData.MessageSid,
      'SMS ID': smsData.SmsSid,
      'Account ID': smsData.AccountSid,
      'Messaging Service ID': smsData.MessagingServiceSid || 'None',
      'From Number': smsData.From,
      'To Number': smsData.To,
      'Message Body': smsData.Body,
      'Media Count': smsData.NumMedia || '0',
      'Location': {
        city: smsData.FromCity,
        state: smsData.FromState,
        zip: smsData.FromZip,
        country: smsData.FromCountry
      },
      'Destination': {
        city: smsData.ToCity,
        state: smsData.ToState,
        zip: smsData.ToZip,
        country: smsData.ToCountry
      },
      'Technical': {
        numSegments: smsData.NumSegments,
        smsStatus: smsData.SmsStatus,
        apiVersion: smsData.ApiVersion
      }
    };

    console.log('=📊 Data mapping complete:', JSON.stringify(mapping, null, 2));
  }

  /**
   * Trigger workflow subscriptions for SMS received event
   * This runs async and does not block the main SMS processing flow
   */
  private async triggerWorkflowSubscriptions(
    processedData: ProcessedSmsData,
    contactId: string
  ): Promise<void> {
    try {
      console.log('📡 Triggering workflow subscriptions for sms.received.v1...');

      // Organize payload according to sms.received.v1 schema
      const payload = {
        // Core identifiers (required)
        tenantId: processedData.tenantId!,
        contactId: contactId,
        messageId: processedData.messageSid,
        from: processedData.from,
        to: processedData.to,
        body: processedData.body,
        timestamp: processedData.metadata.timestamp,

        // Optional fields
        messagingServiceId: processedData.messagingServiceId,
        mediaUrls: processedData.mediaUrls,
        mediaTypes: processedData.mediaTypes,
        mediaCount: processedData.mediaUrls.length,
        fromCity: processedData.metadata.fromCity,
        fromState: processedData.metadata.fromState,
        fromCountry: processedData.metadata.fromCountry,
        numSegments: processedData.metadata.numSegments
      };

      // Execute trigger subscriptions (async, non-blocking)
      const result = await executeTrigger({
        tenantId: processedData.tenantId!,
        triggerType: 'sms.received.v1',
        payload
      });

      console.log(`📡 Trigger execution completed: ${result.subscriptionsFound} subscription(s) found, ${result.summary.completed} executed, ${result.summary.failed} failed`);

    } catch (error) {
      // Log error but don't throw - we don't want to block the main SMS flow
      console.error('❌ Error triggering workflow subscriptions:', error);
    }
  }

  async handleCompleteSmsFlow(smsData: TwilioSmsWebhook): Promise<void> {
    console.log('🚀 Starting complete SMS processing flow...');

    try {
      // Step 1: Process the incoming SMS data
      const processedData = await this.processIncomingSms(smsData);

      // Step 2: Ensure we have a tenant ID
      if (!processedData.tenantId) {
        throw new Error('No tenant ID found - cannot process SMS without tenant context');
      }

      // Step 3: Find or create contact
      console.log('📞 Finding or creating contact...');
      const contactId = await contactFinder.findOrCreateContact({
        tenantId: processedData.tenantId,
        channel: 'SMS',
        address: processedData.from,
        contactInfo: {
          notes: `First contact via SMS from ${processedData.metadata.fromCity || 'Unknown'}, ${processedData.metadata.fromState || 'Unknown'}`
        }
      });

      // Step 3.5: Trigger workflow subscriptions (async, non-blocking)
      // Fire-and-forget - don't await, runs in background
      this.triggerWorkflowSubscriptions(processedData, contactId).catch(err => {
        console.error('❌ Background trigger execution failed:', err);
      });

      // Step 4: Add message to conversation
      console.log('💬 Adding message to conversation...');
      await conversationManager.addMessageToConversation({
        tenantId: processedData.tenantId,
        contactId: contactId,
        messageData: {
          messageId: processedData.messageSid,
          from: processedData.from,
          to: processedData.to,
          body: processedData.body,
          mediaUrls: processedData.mediaUrls,
          mediaTypes: processedData.mediaTypes,
          timestamp: processedData.metadata.timestamp
        }
      });

      console.log('✅ Successfully processed SMS and stored in conversation system');

    } catch (error) {
      console.error('❌ Error in complete SMS flow:', error);
      throw error;
    }
  }
}

export const newRequestHandler = new NewRequestHandler();