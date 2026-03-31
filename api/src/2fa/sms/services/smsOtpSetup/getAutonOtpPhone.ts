import { firestore } from '../../../../config/firebase';

export interface AutonPhoneNumber {
  phoneNumber: string;
  twilioSid: string;
  friendlyName: string;
  status: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  countryCode: string;
  numberType: string;
  createdAt: string;
  updatedAt: string;
  purchasedAt: string;
  sessionId: string;
}

/**
 * Gets the designated Auton phone number for sending OTP messages
 * Looks in the global admin collection: /admin/global/phoneNumbers/{phoneNumberId}
 */
export const getAutonOtpPhoneNumber = async (): Promise<string | null> => {
  try {
    console.log('🔍 Looking for designated Auton OTP phone number in global admin collection');

    // Query the global admin phone numbers collection
    const phoneNumbersRef = firestore.collection('admin/global/phoneNumbers');
    
    // Look for active phone numbers with SMS capability
    const snapshot = await phoneNumbersRef
      .where('status', '==', 'active')
      .where('capabilities.sms', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No active SMS-enabled phone numbers found in global admin collection');
      return null;
    }
    
    const phoneDoc = snapshot.docs[0];
    const phoneData = phoneDoc.data() as AutonPhoneNumber;
    
    console.log(`✅ Found designated Auton OTP phone number: ${phoneData.phoneNumber}`);
    console.log(`📞 Twilio SID: ${phoneData.twilioSid}`);
    console.log(`📍 Friendly Name: ${phoneData.friendlyName}`);
    
    return phoneData.phoneNumber;
    
  } catch (error) {
    console.error('Error getting Auton OTP phone number:', error);
    return null;
  }
};

/**
 * Gets the full phone number document for the designated Auton OTP phone
 * Useful when you need additional details like Twilio SID
 */
export const getAutonOtpPhoneDetails = async (): Promise<AutonPhoneNumber | null> => {
  try {
    console.log('🔍 Getting full details for Auton OTP phone number');

    const phoneNumbersRef = firestore.collection('admin/global/phoneNumbers');
    
    const snapshot = await phoneNumbersRef
      .where('status', '==', 'active')
      .where('capabilities.sms', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No active SMS-enabled phone numbers found');
      return null;
    }
    
    const phoneDoc = snapshot.docs[0];
    const phoneData = phoneDoc.data() as AutonPhoneNumber;
    
    console.log(`✅ Retrieved full details for: ${phoneData.phoneNumber}`);
    
    return phoneData;
    
  } catch (error) {
    console.error('Error getting Auton OTP phone details:', error);
    return null;
  }
};

/**
 * Gets a specific Auton phone number by its document ID
 * Useful when you know the exact phone number ID you want to use
 */
export const getAutonPhoneById = async (phoneNumberId: string): Promise<AutonPhoneNumber | null> => {
  try {
    console.log(`🔍 Getting Auton phone number by ID: ${phoneNumberId}`);

    const phoneDocRef = firestore.doc(`admin/global/phoneNumbers/${phoneNumberId}`);
    const phoneDoc = await phoneDocRef.get();
    
    if (!phoneDoc.exists) {
      console.log(`❌ Phone number document not found: ${phoneNumberId}`);
      return null;
    }
    
    const phoneData = phoneDoc.data() as AutonPhoneNumber;
    
    // Verify it's active and SMS-enabled
    if (phoneData.status !== 'active' || !phoneData.capabilities?.sms) {
      console.log(`❌ Phone number ${phoneData.phoneNumber} is not active or SMS-enabled`);
      return null;
    }
    
    console.log(`✅ Retrieved phone number: ${phoneData.phoneNumber}`);
    
    return phoneData;
    
  } catch (error) {
    console.error(`Error getting phone number by ID ${phoneNumberId}:`, error);
    return null;
  }
};