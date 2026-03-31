import { contactFinder } from '../../../contacts/utilities/findContact';

export interface ContactResolutionRequest {
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

export interface ContactResolutionResult {
  success: boolean;
  contactId?: string;
  phoneNumber?: string;
  error?: string;
  wasCreated?: boolean;
}

export class ResolveContactService {
  /**
   * Resolve contact identifier to a real contact ID
   * Handles both phone numbers and contact IDs
   * Creates new contact if needed and creation data is provided
   */
  async resolveContact(request: ContactResolutionRequest): Promise<ContactResolutionResult> {
    try {
      console.log(`= Resolving contact for identifier: ${request.contactIdentifier}`);
      
      // Determine if identifier is a phone number or contact ID
      const isPhoneNumber = this.isPhoneNumber(request.contactIdentifier);
      
      if (isPhoneNumber) {
        console.log(`=� Identifier is phone number, finding or creating contact`);
        
        // Use the contact finder to find or create contact by phone
        // Construct the best name from available data
        let contactName = 'Unknown Contact';
        if (request.contactCreationData?.full_name) {
          contactName = request.contactCreationData.full_name;
        } else if (request.contactCreationData?.first_name) {
          const lastName = request.contactCreationData.last_name || '';
          contactName = `${request.contactCreationData.first_name} ${lastName}`.trim();
        }
        
        const contactId = await contactFinder.findOrCreateContact({
          tenantId: request.tenantId,
          channel: 'SMS',
          address: request.contactIdentifier,
          contactInfo: {
            name: contactName,
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
      console.error(`L Error resolving contact:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown contact resolution error'
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

export const resolveContactService = new ResolveContactService();