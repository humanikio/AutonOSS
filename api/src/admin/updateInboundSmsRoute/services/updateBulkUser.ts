import twilio from 'twilio';
import { firestore } from '../../../config/firebase';

interface UpdateBulkUserRequest {
  newSmsUrl: string;
}

interface TenantPhoneNumbers {
  tenantId: string;
  phoneNumbers: PhoneNumberDoc[];
}

interface PhoneNumberDoc {
  phoneNumber: string;
  twilioSid: string;
  status: string;
}

interface BulkUpdateResult {
  success: boolean;
  totalTenantsProcessed: number;
  totalNumbersProcessed: number;
  totalMessagingServicesUpdated: number;
  updatedNumbers: string[];
  failedNumbers: { phoneNumber: string; tenantId: string; error: string }[];
  tenantResults: { tenantId: string; successful: number; failed: number; updateMethod: 'messaging_service' | 'individual_numbers'; messagingServiceId?: string }[];
}

export class UpdateBulkUserService {
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

  async updateAllUsersSmsRoute(request: UpdateBulkUserRequest): Promise<BulkUpdateResult> {
    const { newSmsUrl } = request;
    const result: BulkUpdateResult = {
      success: false,
      totalTenantsProcessed: 0,
      totalNumbersProcessed: 0,
      totalMessagingServicesUpdated: 0,
      updatedNumbers: [],
      failedNumbers: [],
      tenantResults: []
    };

    try {
      console.log(`Starting bulk SMS route update to URL: ${newSmsUrl}`);

      const allTenantPhoneNumbers = await this.getAllTenantPhoneNumbers();
      
      if (allTenantPhoneNumbers.length === 0) {
        console.log('No tenants with phone numbers found');
        result.success = true;
        return result;
      }

      console.log(`Found ${allTenantPhoneNumbers.length} tenants with phone numbers`);

      for (const tenantData of allTenantPhoneNumbers) {
        result.totalTenantsProcessed++;
        
        const tenantResult: { tenantId: string; successful: number; failed: number; updateMethod: 'messaging_service' | 'individual_numbers'; messagingServiceId?: string } = {
          tenantId: tenantData.tenantId,
          successful: 0,
          failed: 0,
          updateMethod: 'individual_numbers',
          messagingServiceId: undefined
        };

        console.log(`Processing tenant: ${tenantData.tenantId} with ${tenantData.phoneNumbers.length} phone numbers`);

        // Check if tenant has a messaging service
        const messagingServiceId = await this.getTenantMessagingService(tenantData.tenantId);
        
        if (messagingServiceId) {
          // Update messaging service webhook
          tenantResult.updateMethod = 'messaging_service';
          tenantResult.messagingServiceId = messagingServiceId;
          
          try {
            console.log(`Updating messaging service ${messagingServiceId} for tenant ${tenantData.tenantId}`);
            
            await this.twilioClient.messaging.v1.services(messagingServiceId).update({
              inboundRequestUrl: newSmsUrl,
              inboundMethod: 'POST'
            });

            result.totalMessagingServicesUpdated++;
            tenantResult.successful = tenantData.phoneNumbers.length;
            result.updatedNumbers.push(...tenantData.phoneNumbers.map(p => p.phoneNumber));
            
            console.log(`Successfully updated messaging service ${messagingServiceId}. This affects ${tenantData.phoneNumbers.length} phone numbers.`);
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to update messaging service ${messagingServiceId} for tenant ${tenantData.tenantId}:`, errorMessage);
            
            // Mark all phone numbers as failed
            tenantResult.failed = tenantData.phoneNumbers.length;
            result.failedNumbers.push(...tenantData.phoneNumbers.map(p => ({
              phoneNumber: p.phoneNumber,
              tenantId: tenantData.tenantId,
              error: `Messaging service update failed: ${errorMessage}`
            })));
          }
        } else {
          // Fallback to individual phone number updates
          console.log(`No messaging service found for tenant ${tenantData.tenantId}, updating individual phone numbers`);
          
          for (const phoneDoc of tenantData.phoneNumbers) {
            result.totalNumbersProcessed++;
            
            try {
              await this.updateTwilioNumberSmsUrl(phoneDoc.twilioSid, newSmsUrl);
              result.updatedNumbers.push(phoneDoc.phoneNumber);
              tenantResult.successful++;
              console.log(`Successfully updated SMS URL for ${phoneDoc.phoneNumber} (tenant: ${tenantData.tenantId})`);
              
              await this.delay(100);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              result.failedNumbers.push({
                phoneNumber: phoneDoc.phoneNumber,
                tenantId: tenantData.tenantId,
                error: errorMessage
              });
              tenantResult.failed++;
              console.error(`Failed to update SMS URL for ${phoneDoc.phoneNumber} (tenant: ${tenantData.tenantId}):`, errorMessage);
            }
          }
        }

        result.tenantResults.push(tenantResult);
        
        await this.delay(200);
      }

      result.success = result.failedNumbers.length === 0;
      
      console.log(`Bulk SMS route update completed: ${result.updatedNumbers.length} successful, ${result.failedNumbers.length} failed across ${result.totalTenantsProcessed} tenants`);
      
      return result;

    } catch (error) {
      console.error('Error during bulk SMS route update:', error);
      throw new Error(`Failed to update SMS routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  private async getAllTenantPhoneNumbers(): Promise<TenantPhoneNumbers[]> {
    try {
      const tenantsRef = firestore.collection('tenants');
      const tenantsSnapshot = await tenantsRef.get();
      
      const allTenantPhoneNumbers: TenantPhoneNumbers[] = [];

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        
        try {
          const phoneNumbersRef = firestore.collection(`tenants/${tenantId}/phoneNumbers`);
          const phoneNumbersSnapshot = await phoneNumbersRef.get();
          
          const phoneNumbers: PhoneNumberDoc[] = [];
          
          phoneNumbersSnapshot.forEach((phoneDoc) => {
            const data = phoneDoc.data();
            if (data.twilioSid && data.phoneNumber) {
              phoneNumbers.push({
                phoneNumber: data.phoneNumber,
                twilioSid: data.twilioSid,
                status: data.status || 'active'
              });
            }
          });

          const activePhoneNumbers = phoneNumbers.filter(phone => phone.status === 'active');
          
          if (activePhoneNumbers.length > 0) {
            allTenantPhoneNumbers.push({
              tenantId,
              phoneNumbers: activePhoneNumbers
            });
          }
        } catch (error) {
          console.error(`Error fetching phone numbers for tenant ${tenantId}:`, error);
        }
      }

      return allTenantPhoneNumbers;
    } catch (error) {
      console.error('Error fetching all tenant phone numbers:', error);
      throw new Error(`Failed to fetch tenant phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

export const updateBulkUserService = new UpdateBulkUserService();