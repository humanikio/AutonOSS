import twilio from 'twilio';
import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';

interface AddNumberRequest {
  messagingServiceId: string;
  phoneNumberSid: string;
  phoneNumber: string;
  tenantId: string;
}

class AddNumbersExistingMessagingService {
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

  async addNumber(request: AddNumberRequest): Promise<void> {
    try {
      console.log(`Adding phone number ${request.phoneNumber} to existing messaging service: ${request.messagingServiceId}`);

      // Verify the messaging service exists and belongs to the tenant
      await this.verifyMessagingServiceOwnership(request.messagingServiceId, request.tenantId);

      // Add the phone number to the Twilio messaging service
      await this.twilioClient.messaging.v1.services(request.messagingServiceId)
        .phoneNumbers
        .create({ phoneNumberSid: request.phoneNumberSid });

      console.log(`Added phone number ${request.phoneNumber} to Twilio messaging service`);

      // Update Firestore messaging group document
      await this.updateMessagingGroupDocument(request.messagingServiceId, request.phoneNumberSid);

      console.log(`Updated messaging group document for service: ${request.messagingServiceId}`);
    } catch (error) {
      console.error('Error adding number to existing messaging service:', error);
      throw new Error(`Failed to add number to messaging service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async verifyMessagingServiceOwnership(messagingServiceId: string, tenantId: string): Promise<void> {
    try {
      const messagingGroupDoc = await firestore.doc(`messagingGroups/${messagingServiceId}`).get();
      
      if (!messagingGroupDoc.exists) {
        throw new Error(`Messaging group ${messagingServiceId} not found in Firestore`);
      }

      const messagingGroupData = messagingGroupDoc.data();
      if (messagingGroupData?.tenantId !== tenantId) {
        throw new Error(`Messaging service ${messagingServiceId} does not belong to tenant ${tenantId}`);
      }

      console.log(`Verified messaging service ${messagingServiceId} belongs to tenant ${tenantId}`);
    } catch (error) {
      console.error('Error verifying messaging service ownership:', error);
      throw error;
    }
  }

  private async updateMessagingGroupDocument(messagingServiceId: string, phoneNumberSid: string): Promise<void> {
    try {
      const messagingGroupRef = firestore.doc(`messagingGroups/${messagingServiceId}`);
      
      await firestore.runTransaction(async (transaction) => {
        const messagingGroupDoc = await transaction.get(messagingGroupRef);
        
        if (!messagingGroupDoc.exists) {
          throw new Error(`Messaging group document ${messagingServiceId} not found`);
        }

        const messagingGroupData = messagingGroupDoc.data();
        const currentPhoneNumbers = messagingGroupData?.phoneNumbers || [];
        
        // Add the new phone number if it's not already in the array
        if (!currentPhoneNumbers.includes(phoneNumberSid)) {
          const updatedPhoneNumbers = [...currentPhoneNumbers, phoneNumberSid];
          
          transaction.update(messagingGroupRef, {
            phoneNumbers: updatedPhoneNumbers,
            updatedAt: admin.firestore.Timestamp.now(),
          });
          
          console.log(`Added phone number ${phoneNumberSid} to messaging group ${messagingServiceId}`);
        } else {
          console.log(`Phone number ${phoneNumberSid} already exists in messaging group ${messagingServiceId}`);
        }
      });
    } catch (error) {
      console.error('Error updating messaging group document:', error);
      throw error;
    }
  }

  async removeNumber(messagingServiceId: string, phoneNumberSid: string, tenantId: string): Promise<void> {
    try {
      console.log(`Removing phone number ${phoneNumberSid} from messaging service: ${messagingServiceId}`);

      // Verify ownership
      await this.verifyMessagingServiceOwnership(messagingServiceId, tenantId);

      // Remove from Twilio messaging service
      await this.twilioClient.messaging.v1.services(messagingServiceId)
        .phoneNumbers(phoneNumberSid)
        .remove();

      console.log(`Removed phone number ${phoneNumberSid} from Twilio messaging service`);

      // Update Firestore document
      const messagingGroupRef = firestore.doc(`messagingGroups/${messagingServiceId}`);
      
      await firestore.runTransaction(async (transaction) => {
        const messagingGroupDoc = await transaction.get(messagingGroupRef);
        
        if (messagingGroupDoc.exists) {
          const messagingGroupData = messagingGroupDoc.data();
          const currentPhoneNumbers = messagingGroupData?.phoneNumbers || [];
          const updatedPhoneNumbers = currentPhoneNumbers.filter((sid: string) => sid !== phoneNumberSid);
          
          transaction.update(messagingGroupRef, {
            phoneNumbers: updatedPhoneNumbers,
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }
      });

      console.log(`Removed phone number ${phoneNumberSid} from messaging group document`);
    } catch (error) {
      console.error('Error removing number from messaging service:', error);
      throw new Error(`Failed to remove number from messaging service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const addNumbersExistingMessagingService = new AddNumbersExistingMessagingService();