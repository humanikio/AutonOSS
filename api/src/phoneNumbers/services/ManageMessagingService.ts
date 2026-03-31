import { firestore } from '../../config/firebase';
import { createNewMessagingService } from './messagingService/createNewMessagingService';
import { addNumbersExistingMessagingService } from './messagingService/addNumbersExistingMessagingService';

interface ManageMessagingServiceRequest {
  tenantId: string;
  phoneNumberSid: string;
  phoneNumber: string;
  friendlyName?: string;
}

interface ManageMessagingServiceResponse {
  success: boolean;
  messagingServiceId: string;
  action: 'created' | 'added_to_existing';
  message: string;
}

class ManageMessagingService {
  async manageService(request: ManageMessagingServiceRequest): Promise<ManageMessagingServiceResponse> {
    try {
      console.log(`Managing messaging service for tenant: ${request.tenantId}`);

      // Check if tenant already has a messaging service
      const tenantDoc = await firestore.doc(`tenants/${request.tenantId}`).get();
      
      let existingMessagingServiceId: string | null = null;
      
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        existingMessagingServiceId = tenantData?.messagingServiceId || null;
      }

      if (existingMessagingServiceId) {
        // Tenant has existing messaging service - add number to it
        console.log(`Adding number to existing messaging service: ${existingMessagingServiceId}`);
        
        await addNumbersExistingMessagingService.addNumber({
          messagingServiceId: existingMessagingServiceId,
          phoneNumberSid: request.phoneNumberSid,
          phoneNumber: request.phoneNumber,
          tenantId: request.tenantId
        });

        return {
          success: true,
          messagingServiceId: existingMessagingServiceId,
          action: 'added_to_existing',
          message: `Phone number ${request.phoneNumber} added to existing messaging service`
        };
      } else {
        // No existing messaging service - create new one
        console.log(`Creating new messaging service for tenant: ${request.tenantId}`);
        
        const result = await createNewMessagingService.create({
          tenantId: request.tenantId,
          phoneNumberSid: request.phoneNumberSid,
          phoneNumber: request.phoneNumber,
          friendlyName: request.friendlyName
        });

        return {
          success: true,
          messagingServiceId: result.messagingServiceId,
          action: 'created',
          message: `New messaging service created and phone number ${request.phoneNumber} added`
        };
      }
    } catch (error) {
      console.error('Error managing messaging service:', error);
      throw new Error(`Failed to manage messaging service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessagingServiceForTenant(tenantId: string): Promise<string | null> {
    try {
      const tenantDoc = await firestore.doc(`tenants/${tenantId}`).get();
      
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        return tenantData?.messagingServiceId || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting messaging service for tenant:', error);
      throw new Error(`Failed to get messaging service for tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTenantFromMessagingService(messagingServiceId: string): Promise<string | null> {
    try {
      const messagingGroupDoc = await firestore.doc(`messagingGroups/${messagingServiceId}`).get();
      
      if (messagingGroupDoc.exists) {
        const messagingGroupData = messagingGroupDoc.data();
        return messagingGroupData?.tenantId || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting tenant from messaging service:', error);
      throw new Error(`Failed to get tenant from messaging service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const manageMessagingService = new ManageMessagingService();