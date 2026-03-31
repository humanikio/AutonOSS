import twilio from 'twilio';
import { firestore } from '../../../config/firebase';

interface UpdateSingleUserRequest {
  tenantId: string;
  newSmsUrl: string;
}

interface PhoneNumberDoc {
  phoneNumber: string;
  twilioSid: string;
  status: string;
}

interface UpdateResult {
  success: boolean;
  tenantId: string;
  messagingServiceId?: string;
  updatedNumbers: string[];
  failedNumbers: { phoneNumber: string; error: string }[];
  totalProcessed: number;
  updateMethod: 'messaging_service' | 'individual_numbers';
}

export class UpdateSingleUserService {
  private twilioClient: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

    if (!accountSid) {
      throw new Error('TWILIO_ACCOUNT_SID environment variable is required');
    }

    if (apiKeySid && apiKeySecret) {
      this.twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
    } else {
      throw new Error('TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET must be provided');
    }
  }

  async updateUserSmsRoute(request: UpdateSingleUserRequest): Promise<UpdateResult> {
    const { tenantId, newSmsUrl } = request;
    const result: UpdateResult = {
      success: false,
      tenantId,
      updatedNumbers: [],
      failedNumbers: [],
      totalProcessed: 0,
      updateMethod: 'individual_numbers'
    };

    try {
      console.log(`Updating SMS routes for tenant: ${tenantId} to URL: ${newSmsUrl}`);

      // First, check if tenant has a messaging service
      const messagingServiceId = await this.getTenantMessagingService(tenantId);
      
      if (messagingServiceId) {
        // Update messaging service webhook
        console.log(`Found messaging service ${messagingServiceId} for tenant ${tenantId}`);
        return await this.updateMessagingServiceWebhook(tenantId, messagingServiceId, newSmsUrl);
      } else {
        // Fallback to individual phone number updates
        console.log(`No messaging service found for tenant ${tenantId}, updating individual phone numbers`);
        return await this.updateIndividualPhoneNumbers(tenantId, newSmsUrl);
      }

    } catch (error) {
      console.error(`Error updating SMS routes for tenant ${tenantId}:`, error);
      throw new Error(`Failed to update SMS routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateMessagingServiceWebhook(tenantId: string, messagingServiceId: string, newSmsUrl: string): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      tenantId,
      messagingServiceId,
      updatedNumbers: [],
      failedNumbers: [],
      totalProcessed: 1,
      updateMethod: 'messaging_service'
    };

    try {
      console.log(`Updating messaging service ${messagingServiceId} webhook to ${newSmsUrl}`);
      
      // Update the messaging service webhook
      await this.twilioClient.messaging.v1.services(messagingServiceId).update({
        inboundRequestUrl: newSmsUrl,
        inboundMethod: 'POST'
      });

      // Get all phone numbers in this messaging service for reporting
      const phoneNumbers = await this.getTenantPhoneNumbers(tenantId);
      result.updatedNumbers = phoneNumbers.map(p => p.phoneNumber);
      result.success = true;

      console.log(`Successfully updated messaging service ${messagingServiceId} webhook. This affects ${result.updatedNumbers.length} phone numbers.`);
      
      return result;
    } catch (error) {
      console.error(`Failed to update messaging service ${messagingServiceId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If messaging service update fails, add all phone numbers to failed list
      const phoneNumbers = await this.getTenantPhoneNumbers(tenantId);
      result.failedNumbers = phoneNumbers.map(p => ({
        phoneNumber: p.phoneNumber,
        error: `Messaging service update failed: ${errorMessage}`
      }));
      
      throw new Error(`Failed to update messaging service webhook: ${errorMessage}`);
    }
  }

  private async updateIndividualPhoneNumbers(tenantId: string, newSmsUrl: string): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      tenantId,
      updatedNumbers: [],
      failedNumbers: [],
      totalProcessed: 0,
      updateMethod: 'individual_numbers'
    };

    const phoneNumbers = await this.getTenantPhoneNumbers(tenantId);
    
    if (phoneNumbers.length === 0) {
      console.log(`No phone numbers found for tenant: ${tenantId}`);
      result.success = true;
      return result;
    }

    console.log(`Found ${phoneNumbers.length} phone numbers for tenant: ${tenantId}`);

    for (const phoneDoc of phoneNumbers) {
      result.totalProcessed++;
      
      try {
        await this.updateTwilioNumberSmsUrl(phoneDoc.twilioSid, newSmsUrl);
        result.updatedNumbers.push(phoneDoc.phoneNumber);
        console.log(`Successfully updated SMS URL for ${phoneDoc.phoneNumber} (${phoneDoc.twilioSid})`);
        
        await this.delay(100);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.failedNumbers.push({
          phoneNumber: phoneDoc.phoneNumber,
          error: errorMessage
        });
        console.error(`Failed to update SMS URL for ${phoneDoc.phoneNumber} (${phoneDoc.twilioSid}):`, errorMessage);
      }
    }

    result.success = result.failedNumbers.length === 0;
    
    console.log(`Individual SMS route update completed for tenant ${tenantId}: ${result.updatedNumbers.length} successful, ${result.failedNumbers.length} failed`);
    
    return result;
  }

  private async getTenantMessagingService(tenantId: string): Promise<string | null> {
    try {
      const tenantDoc = await firestore.doc(`tenants/${tenantId}`).get();
      
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        return tenantData?.messagingServiceId || null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting messaging service for tenant ${tenantId}:`, error);
      return null;
    }
  }

  private async getTenantPhoneNumbers(tenantId: string): Promise<PhoneNumberDoc[]> {
    try {
      const phoneNumbersRef = firestore.collection(`tenants/${tenantId}/phoneNumbers`);
      const snapshot = await phoneNumbersRef.get();
      
      const phoneNumbers: PhoneNumberDoc[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.twilioSid && data.phoneNumber) {
          phoneNumbers.push({
            phoneNumber: data.phoneNumber,
            twilioSid: data.twilioSid,
            status: data.status || 'active'
          });
        }
      });

      return phoneNumbers.filter(phone => phone.status === 'active');
    } catch (error) {
      console.error(`Error fetching phone numbers for tenant ${tenantId}:`, error);
      throw new Error(`Failed to fetch phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateTwilioNumberSmsUrl(twilioSid: string, smsUrl: string): Promise<void> {
    try {
      await this.twilioClient.incomingPhoneNumbers(twilioSid).update({
        smsUrl: smsUrl,
        smsMethod: 'POST'
      });
    } catch (error) {
      console.error(`Twilio API error updating ${twilioSid}:`, error);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const updateSingleUserService = new UpdateSingleUserService();