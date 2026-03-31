import twilio from 'twilio';
import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';

interface CreateMessagingServiceRequest {
  tenantId: string;
  phoneNumberSid: string;
  phoneNumber: string;
  friendlyName?: string;
}

interface CreateMessagingServiceResponse {
  messagingServiceId: string;
  twilioServiceSid: string;
}

class CreateNewMessagingService {
  private twilioClient: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid) {
      throw new Error('TWILIO_ACCOUNT_SID environment variable is required');
    }

    // Use API Key if available, otherwise fall back to Auth Token
    if (apiKeySid && apiKeySecret) {
      this.twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
    } else if (authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    } else {
      throw new Error('Either TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN must be provided');
    }
  }

  async create(request: CreateMessagingServiceRequest): Promise<CreateMessagingServiceResponse> {
    try {
      console.log(`Creating new messaging service for tenant: ${request.tenantId}`);

      // Get the production backend URL for webhook
      const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:8000';
      const smsWebhookUrl = `${backendUrl}/api/inbound-sms/webhook`;

      // Create Twilio Messaging Service
      const service = await this.twilioClient.messaging.v1.services.create({
        friendlyName: request.friendlyName ? `${request.friendlyName} (MS)` : `Tenant ${request.tenantId} (MS)`,
        inboundRequestUrl: smsWebhookUrl,
        inboundMethod: 'POST',
        useInboundWebhookOnNumber: false, // Use service-level webhook
      });

      console.log(`Created Twilio messaging service: ${service.sid}`);

      // Add the phone number to the messaging service
      await this.twilioClient.messaging.v1.services(service.sid)
        .phoneNumbers
        .create({ phoneNumberSid: request.phoneNumberSid });

      console.log(`Added phone number ${request.phoneNumber} to messaging service ${service.sid}`);

      // Ensure tenant document exists first
      await this.createTenantDocumentIfNotExists(request.tenantId);

      // Create Firestore documents in a transaction
      await firestore.runTransaction(async (transaction) => {
        // Create messaging group document
        const messagingGroupRef = firestore.doc(`messagingGroups/${service.sid}`);
        const messagingGroupData = {
          tenantId: request.tenantId,
          friendlyName: service.friendlyName,
          createdAt: admin.firestore.Timestamp.now(),
          phoneNumbers: [request.phoneNumberSid],
          twilioServiceSid: service.sid,
        };
        transaction.set(messagingGroupRef, messagingGroupData);

        // Update tenant document with messaging service ID
        const tenantRef = firestore.doc(`tenants/${request.tenantId}`);
        transaction.update(tenantRef, {
          messagingServiceId: service.sid,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`Created Firestore documents for messaging service: ${service.sid}`);
      });

      return {
        messagingServiceId: service.sid,
        twilioServiceSid: service.sid,
      };
    } catch (error) {
      console.error('Error creating new messaging service:', error);
      throw new Error(`Failed to create messaging service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTenantDocumentIfNotExists(tenantId: string): Promise<void> {
    try {
      const tenantRef = firestore.doc(`tenants/${tenantId}`);
      const tenantDoc = await tenantRef.get();

      if (!tenantDoc.exists) {
        await tenantRef.set({
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          phoneNumberCount: 0,
        });
        console.log(`Created tenant document for: ${tenantId}`);
      }
    } catch (error) {
      console.error('Error creating tenant document:', error);
      throw new Error(`Failed to create tenant document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const createNewMessagingService = new CreateNewMessagingService();