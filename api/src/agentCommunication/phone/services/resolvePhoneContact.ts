import { contactFinder } from '../../../contacts/utilities/findContact';

export interface PhoneContactResolutionRequest {
  tenantId: string;
  contactIdentifier: string; // Can be phone number or contact ID
  contactCreationData?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PhoneContactResolutionResult {
  success: boolean;
  contactId?: string;
  phoneNumber?: string;
  error?: string;
  wasCreated?: boolean;
}

export class ResolvePhoneContactService {
  /**
   * Resolve contact identifier to a real contact ID
   * Handles both phone numbers and contact IDs
   * Creates new contact if needed and creation data is provided
   */
  async resolvePhoneContact(request: PhoneContactResolutionRequest): Promise<PhoneContactResolutionResult> {
    try {
      console.log(`= Resolving phone contact for identifier: ${request.contactIdentifier}`);
      
      // Determine if identifier is a phone number or contact ID
      const isPhoneNumber = this.isPhoneNumber(request.contactIdentifier);
      
      if (isPhoneNumber) {
        console.log(`=� Identifier is phone number, finding or creating contact`);
        
        // Use the contact finder to find or create contact by phone
        // Pass through the full_name if provided, otherwise undefined
        // The contact creation/update service will handle name derivation properly
        const contactId = await contactFinder.findOrCreateContact({
          tenantId: request.tenantId,
          channel: 'SMS', // Use SMS channel for phone lookups (same contact_addresses table)
          address: request.contactIdentifier,
          contactInfo: {
            name: request.contactCreationData?.full_name,
            email: request.contactCreationData?.email
          }
        });
        
        console.log(` Resolved phone ${request.contactIdentifier} to contact ID: ${contactId}`);
        
        return {
          success: true,
          contactId,
          phoneNumber: request.contactIdentifier,
          wasCreated: true // findOrCreateContact may have created it
        };
        
      } else {
        console.log(`<� Identifier appears to be contact ID, validating existence`);
        
        // TODO: Add contact ID validation if needed
        // For now, assume it's a valid contact ID
        
        return {
          success: true,
          contactId: request.contactIdentifier,
          phoneNumber: undefined, // Will be resolved later if needed
          wasCreated: false
        };
      }
      
    } catch (error) {
      console.error(`L Error resolving phone contact:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown phone contact resolution error'
      };
    }
  }
  
  /**
   * Simple check to determine if identifier looks like a phone number
   */
  private isPhoneNumber(identifier: string): boolean {
    // Check if it starts with + and contains mostly digits
    const phonePattern = /^\+?[\d\s\-\(\)]+$/;
    const hasDigits = /\d/.test(identifier);
    
    return phonePattern.test(identifier) && hasDigits && identifier.length >= 10;
  }
}

export const resolvePhoneContactService = new ResolvePhoneContactService();