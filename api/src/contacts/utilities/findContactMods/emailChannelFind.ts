import { firestore } from '../../../config/firebase';

export interface EmailChannelFindRequest {
  tenantId: string;
  email: string;
}

export class EmailChannelFinder {
  private normalizeEmail(email: string): string {
    // Lowercase and trim the email
    return email.toLowerCase().trim();
  }

  async findContactByEmail(request: EmailChannelFindRequest): Promise<string | null> {
    const normalizedEmail = this.normalizeEmail(request.email);

    console.log(`📧 Looking up contact for tenant ${request.tenantId} with email ${normalizedEmail}`);

    try {
      const addressQuery = await firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contact_addresses')
        .where('channel', '==', 'EMAIL')
        .where('address_norm', '==', normalizedEmail)
        .limit(1)
        .get();

      if (addressQuery.empty) {
        console.log(`📭 No contact found for email ${normalizedEmail}`);
        return null;
      }

      const addressDoc = addressQuery.docs[0];
      const addressData = addressDoc.data();
      const contactId = addressData.contact_id;

      console.log(`✅ Found contact ${contactId} for email ${normalizedEmail}`);
      return contactId;

    } catch (error) {
      console.error(`❌ Error looking up contact by email:`, error);
      throw new Error(`Failed to find contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const emailChannelFinder = new EmailChannelFinder();
