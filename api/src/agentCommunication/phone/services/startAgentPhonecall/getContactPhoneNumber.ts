import admin from 'firebase-admin';

export const getContactPhoneNumber = async (tenantId: string, contactId: string): Promise<string> => {
  try {
    const db = admin.firestore();
    
    // First, check if contact exists
    const contactRef = db.collection('tenants').doc(tenantId).collection('contacts').doc(contactId);
    const contactDoc = await contactRef.get();
    if (!contactDoc.exists) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    
    // Get the phone number from contact_addresses collection
    const addressesRef = db.collection('tenants').doc(tenantId).collection('contact_addresses');
    const addressQuery = await addressesRef
      .where('contact_id', '==', contactId)
      .where('channel', '==', 'SMS')
      .where('is_primary', '==', true)
      .get();
    
    if (addressQuery.empty) {
      throw new Error(`No phone number found for contact ${contactId}`);
    }
    
    const addressDoc = addressQuery.docs[0];
    const addressData = addressDoc.data();
    const phoneNumber = addressData?.address_norm;
    
    if (!phoneNumber) {
      throw new Error(`No normalized phone number found for contact ${contactId}`);
    }
    
    console.log(`Retrieved phone number for contact ${contactId}: ${phoneNumber}`);
    return phoneNumber;
    
  } catch (error) {
    console.error('Error getting contact phone number:', error);
    throw new Error(`Failed to get contact phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};