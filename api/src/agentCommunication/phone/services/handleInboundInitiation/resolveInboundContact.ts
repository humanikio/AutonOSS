import { resolvePhoneContactService } from '../resolvePhoneContact';

export interface InboundContactResolution {
  contactId: string;
  phoneNumber: string;
  wasCreated: boolean;
}

/**
 * Resolves caller phone number to internal contact data
 * Uses existing resolvePhoneContact service to find or create contact
 * 
 * @param tenantId - Internal tenant identifier
 * @param callerPhoneNumber - Phone number from webhook (caller_id)
 * @returns Promise<InboundContactResolution> - Resolved contact data
 */
export async function resolveInboundContact(
  tenantId: string, 
  callerPhoneNumber: string
): Promise<InboundContactResolution> {
  try {
    console.log(`📞 Resolving inbound contact: ${callerPhoneNumber} for tenant: ${tenantId}`);
    
    // Use existing phone contact resolution service
    // Only provide fallback name for truly new contacts - don't overwrite existing names
    const contactResolution = await resolvePhoneContactService.resolvePhoneContact({
      tenantId,
      contactIdentifier: callerPhoneNumber, // Use caller phone as identifier
      contactCreationData: {
        phone: callerPhoneNumber,
        full_name: `Caller ${callerPhoneNumber.slice(-4)}`, // Shorter, simpler fallback name for new contacts only
        // No additional data for now - keep it minimal for speed
      }
    });
    
    if (!contactResolution.success) {
      throw new Error(`Contact resolution failed: ${contactResolution.error}`);
    }
    
    console.log(`✅ Contact resolved:`);
    console.log(`   - Contact ID: ${contactResolution.contactId}`);
    console.log(`   - Phone: ${callerPhoneNumber}`);
    console.log(`   - Created: ${contactResolution.wasCreated ? 'Yes' : 'No'}`);
    
    return {
      contactId: contactResolution.contactId!,
      phoneNumber: callerPhoneNumber,
      wasCreated: contactResolution.wasCreated || false
    };
    
  } catch (error) {
    console.error('❌ Failed to resolve inbound contact:', error);
    throw new Error(`Contact resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}