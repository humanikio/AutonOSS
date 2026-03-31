import { firestore } from '../../../config/firebase';

/**
 * Resolves the phone number for a contact from Firestore
 *
 * @param tenantId - The tenant ID
 * @param contactId - The contact ID to look up
 * @returns The contact's phone number
 * @throws Error if contact not found or has no phone number
 */
export async function resolveContactPhone(tenantId: string, contactId: string): Promise<string> {
  try {
    console.log(`📞 Resolving phone number for contact: ${contactId}`);

    // Get contact document from Firestore
    const contactDoc = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .doc(contactId)
      .get();

    if (!contactDoc.exists) {
      throw new Error(`Contact ${contactId} not found`);
    }

    const contactData = contactDoc.data();
    const phoneNumber = contactData?.phoneNumber || contactData?.phone;

    if (!phoneNumber) {
      throw new Error(`Contact ${contactId} has no phone number`);
    }

    console.log(`✅ Resolved phone number: ${phoneNumber}`);
    return phoneNumber;

  } catch (error) {
    console.error(`❌ Failed to resolve phone number for contact ${contactId}:`, error);
    throw error;
  }
}
