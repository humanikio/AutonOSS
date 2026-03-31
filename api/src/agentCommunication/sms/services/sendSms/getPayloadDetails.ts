import { firestore } from '../../../../config/firebase';
import { smsChannelFinder } from '../../../../contacts/utilities/findContactMods/smsChannelFind';
import { contactFinder } from '../../../../contacts/utilities/findContact';

export interface PayloadDetails {
  contactPhoneNumber: string | null;
  agentPhoneNumber: string | null;
  contactId: string | null; // NEW: Include contact ID in payload details
}

export interface ContactAddress {
  contact_id: string;
  address_norm: string;
  address_display: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  is_primary: boolean;
  created_at: FirebaseFirestore.Timestamp;
}

export class GetPayloadDetailsService {
  /**
   * Detect if the provided identifier is a phone number or contact ID
   */
  private isPhoneNumber(identifier: string): boolean {
    if (!identifier) return false;
    
    // Check if it starts with + and contains mostly digits
    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    const digitsOnly = identifier.replace(/[\s\-\(\)]/g, '');
    
    // If it starts with + or is all digits (10-15 chars), likely a phone number
    const isPhone = phonePattern.test(digitsOnly) || 
                   (digitsOnly.length >= 10 && digitsOnly.length <= 15 && /^\d+$/.test(digitsOnly));
    
    console.log(`🔍 Phone detection for "${identifier}": ${isPhone ? 'PHONE' : 'CONTACT_ID'}`);
    return isPhone;
  }

  /**
   * Smart contact lookup - handles both contact IDs and phone numbers
   */
  async findContactByIdentifier(tenantId: string, identifier: string, webhookData?: any): Promise<{contactId: string | null, phoneNumber: string | null}> {
    try {
      console.log(`🔍 Smart contact lookup for identifier: ${identifier}`);
      
      if (this.isPhoneNumber(identifier)) {
        console.log(`📱 Detected phone number, searching by phone`);
        
        // Try to find existing contact by phone number
        const contactId = await smsChannelFinder.findContactByPhoneNumber({
          tenantId,
          phoneNumber: identifier
        });

        if (contactId) {
          console.log(`✅ Found existing contact: ${contactId}`);
          return { contactId, phoneNumber: identifier };
        }

        // If not found and we have webhook data, create new contact
        if (webhookData) {
          console.log(`🆕 Contact not found, creating from webhook data`);
          const newContactId = await contactFinder.findOrCreateContact({
            tenantId,
            channel: 'SMS',
            address: identifier,
            contactInfo: {
              name: webhookData.full_name || webhookData.first_name || 'Unknown',
              email: webhookData.email,
              notes: `Created from webhook. GHL Contact ID: ${webhookData.contact_id || 'N/A'}`
            }
          });
          
          console.log(`✅ Created new contact: ${newContactId}`);
          return { contactId: newContactId, phoneNumber: identifier };
        }

        console.log(`❌ Contact not found and no webhook data for auto-creation`);
        return { contactId: null, phoneNumber: identifier };
        
      } else {
        console.log(`🆔 Detected contact ID, searching by contact ID`);
        
        // It's a contact ID, get the phone number for this contact
        const phoneNumber = await this.getContactPhoneNumber(tenantId, identifier);
        
        if (phoneNumber) {
          console.log(`✅ Found phone number for contact: ${phoneNumber}`);
          return { contactId: identifier, phoneNumber };
        }

        // If contact ID not found, check if we have phone number in webhook data to fallback
        const fallbackPhone = webhookData?.phone;
        if (fallbackPhone) {
          console.log(`🔄 Contact ID not found, trying fallback phone: ${fallbackPhone}`);
          
          // Search by the fallback phone number
          const fallbackContactId = await smsChannelFinder.findContactByPhoneNumber({
            tenantId,
            phoneNumber: fallbackPhone
          });

          if (fallbackContactId) {
            console.log(`✅ Found contact by fallback phone: ${fallbackContactId}`);
            return { contactId: fallbackContactId, phoneNumber: fallbackPhone };
          }

          // Create new contact with fallback phone if needed
          if (webhookData) {
            console.log(`🆕 Creating contact with fallback phone: ${fallbackPhone}`);
            const newContactId = await contactFinder.findOrCreateContact({
              tenantId,
              channel: 'SMS',
              address: fallbackPhone,
              contactInfo: {
                name: webhookData.full_name || webhookData.first_name || 'Unknown',
                email: webhookData.email
              }
            });
            
            console.log(`✅ Created new contact with fallback phone: ${newContactId}`);
            return { contactId: newContactId, phoneNumber: fallbackPhone };
          }
        }

        console.log(`❌ No phone number found for contact ID and no fallback available: ${identifier}`);
        return { contactId: identifier, phoneNumber: null };
      }
      
    } catch (error) {
      console.error('❌ Error in smart contact lookup:', error);
      return { contactId: null, phoneNumber: null };
    }
  }

  /**
   * Get contact's primary phone number from contact_addresses collection (original method - kept for contact ID lookups)
   */
  async getContactPhoneNumber(tenantId: string, contactId: string): Promise<string | null> {
    try {
      console.log(`Getting phone number for contact ${contactId} in tenant ${tenantId}`);
      
      // Query contact_addresses for primary SMS address
      const addressQuery = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contact_addresses')
        .where('contact_id', '==', contactId)
        .where('channel', '==', 'SMS')
        .where('is_primary', '==', true)
        .limit(1);
      
      const addressSnapshot = await addressQuery.get();
      
      if (addressSnapshot.empty) {
        console.warn(`No primary SMS address found for contact ${contactId}`);
        return null;
      }
      
      const addressDoc = addressSnapshot.docs[0];
      const addressData = addressDoc.data() as ContactAddress;
      
      const phoneNumber = addressData.address_norm;
      console.log(`Found contact phone number: ${phoneNumber}`);
      
      return phoneNumber;
      
    } catch (error) {
      console.error('Error getting contact phone number:', error);
      return null;
    }
  }

  /**
   * Get agent's configured phone number from agent document
   */
  async getAgentPhoneNumber(tenantId: string, agentId: string): Promise<string | null> {
    try {
      console.log(`Getting phone number for agent ${agentId} in tenant ${tenantId}`);
      
      const agentRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('agents')
        .doc(agentId);
      
      const agentDoc = await agentRef.get();
      
      if (!agentDoc.exists) {
        console.warn(`Agent ${agentId} not found in tenant ${tenantId}`);
        return null;
      }
      
      const agentData = agentDoc.data();
      const phoneNumber = agentData?.agentPhoneNumber;
      
      if (phoneNumber) {
        console.log(`Found agent phone number: ${phoneNumber}`);
        return phoneNumber;
      } else {
        console.warn(`No phone number configured for agent ${agentId}`);
        return null;
      }
      
    } catch (error) {
      console.error('Error getting agent phone number:', error);
      return null;
    }
  }

  /**
   * Get both contact and agent phone numbers in one call with smart contact detection
   */
  async getPayloadDetails(
    tenantId: string, 
    contactIdentifier: string, 
    agentId: string, 
    webhookData?: any
  ): Promise<PayloadDetails> {
    try {
      console.log(`Getting payload details for tenant ${tenantId}, contact identifier ${contactIdentifier}, agent ${agentId}`);
      
      // Execute both queries in parallel for better performance
      const [contactResult, agentPhoneNumber] = await Promise.all([
        this.findContactByIdentifier(tenantId, contactIdentifier, webhookData),
        this.getAgentPhoneNumber(tenantId, agentId)
      ]);
      
      console.log(`Payload details retrieved:`);
      console.log(`  - Contact ID: ${contactResult.contactId || 'NOT FOUND'}`);
      console.log(`  - Contact phone: ${contactResult.phoneNumber || 'NOT FOUND'}`);
      console.log(`  - Agent phone: ${agentPhoneNumber || 'NOT FOUND'}`);
      
      return {
        contactPhoneNumber: contactResult.phoneNumber,
        agentPhoneNumber,
        contactId: contactResult.contactId
      };
      
    } catch (error) {
      console.error('Error getting payload details:', error);
      
      return {
        contactPhoneNumber: null,
        agentPhoneNumber: null,
        contactId: null
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async getPayloadDetailsLegacy(tenantId: string, contactId: string, agentId: string): Promise<PayloadDetails> {
    return this.getPayloadDetails(tenantId, contactId, agentId);
  }
}

export const getPayloadDetailsService = new GetPayloadDetailsService();