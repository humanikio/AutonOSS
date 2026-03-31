import { firestore } from '../../../config/firebase';

export interface SmsChannelFindRequest {
  tenantId: string;
  phoneNumber: string;
}

export class SmsChannelFinder {
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1 and is 11 digits, format as +1XXXXXXXXXX
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    // If it's 10 digits, assume US number and add +1
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    // For other cases, just add + if not already there
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digitsOnly}`;
  }

  async findContactByPhoneNumber(request: SmsChannelFindRequest): Promise<string | null> {
    const normalizedPhone = this.normalizePhoneNumber(request.phoneNumber);
    
    console.log(`= Looking up contact for tenant ${request.tenantId} with phone ${normalizedPhone}`);

    try {
      const addressQuery = await firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contact_addresses')
        .where('channel', '==', 'SMS')
        .where('address_norm', '==', normalizedPhone)
        .limit(1)
        .get();

      if (addressQuery.empty) {
        console.log(`L No contact found for phone ${normalizedPhone}`);
        return null;
      }

      const addressDoc = addressQuery.docs[0];
      const addressData = addressDoc.data();
      const contactId = addressData.contact_id;

      console.log(` Found contact ${contactId} for phone ${normalizedPhone}`);
      return contactId;

    } catch (error) {
      console.error(`L Error looking up contact by phone number:`, error);
      throw new Error(`Failed to find contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const smsChannelFinder = new SmsChannelFinder();