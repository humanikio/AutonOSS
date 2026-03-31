import { firestore } from '../../../../config/firebase';

interface PhoneNumberDocument {
  phoneNumber: string;
  twilioSid: string;
  friendlyName?: string;
  numberType: string;
  countryCode: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

class FindPhoneNumberSid {
  async findSidByPhoneNumber(tenantId: string, phoneNumber: string): Promise<string> {
    try {
      console.log(`Finding SID for phone number ${phoneNumber} in tenant ${tenantId}`);
      
      // Query phone numbers collection for this tenant
      const phoneNumbersRef = firestore.collection(`tenants/${tenantId}/phoneNumbers`);
      const snapshot = await phoneNumbersRef.where('phoneNumber', '==', phoneNumber).limit(1).get();
      
      if (snapshot.empty) {
        throw new Error(`Phone number ${phoneNumber} not found for tenant ${tenantId}`);
      }
      
      const phoneNumberDoc = snapshot.docs[0];
      const data = phoneNumberDoc.data() as PhoneNumberDocument;
      
      if (!data.twilioSid) {
        throw new Error(`Twilio SID not found for phone number ${phoneNumber}`);
      }
      
      console.log(`Found Twilio SID: ${data.twilioSid} for phone number ${phoneNumber}`);
      return data.twilioSid;
      
    } catch (error) {
      console.error(`Error finding phone number SID:`, error);
      throw new Error(`Failed to find phone number SID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllTenantPhoneNumbers(tenantId: string): Promise<PhoneNumberDocument[]> {
    try {
      console.log(`Getting all phone numbers for tenant ${tenantId}`);
      
      const phoneNumbersRef = firestore.collection(`tenants/${tenantId}/phoneNumbers`);
      const snapshot = await phoneNumbersRef.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => doc.data() as PhoneNumberDocument);
      
    } catch (error) {
      console.error(`Error getting tenant phone numbers:`, error);
      throw new Error(`Failed to get tenant phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const findPhoneNumberSid = new FindPhoneNumberSid();