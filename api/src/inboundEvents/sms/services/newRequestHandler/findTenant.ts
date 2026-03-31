import { manageMessagingService } from '../../../../phoneNumbers/services/ManageMessagingService';

export class TenantResolver {
  async findTenantFromMessagingService(messagingServiceSid: string): Promise<string | null> {
    try {
      console.log(`= Resolving tenant for MessagingServiceSid: ${messagingServiceSid}`);
      
      const tenantId = await manageMessagingService.getTenantFromMessagingService(messagingServiceSid);
      
      if (tenantId) {
        console.log(` Tenant resolved: ${tenantId}`);
        return tenantId;
      } else {
        console.log(`  No tenant found for MessagingServiceSid: ${messagingServiceSid}`);
        return null;
      }
    } catch (error) {
      console.error(`L Error resolving tenant from MessagingServiceSid:`, error);
      return null;
    }
  }

  async findTenantFromPhoneNumber(phoneNumber: string): Promise<string | null> {
    try {
      console.log(`= Fallback: Resolving tenant for phone number: ${phoneNumber}`);
      
      // TODO: Implement phone number to tenant mapping for legacy numbers
      // This would query a phone_numbers collection or similar
      console.log(`  Phone number to tenant mapping not yet implemented`);
      return null;
    } catch (error) {
      console.error(`L Error resolving tenant from phone number:`, error);
      return null;
    }
  }
}

export const tenantResolver = new TenantResolver();