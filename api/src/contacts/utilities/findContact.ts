import { smsChannelFinder } from './findContactMods/smsChannelFind';
import { emailChannelFinder } from './findContactMods/emailChannelFind';
import { contactCreationService, CreateContactRequest } from '../services/createContacts';
import { contactUpdateService } from '../services/updateContact';

export interface FindContactRequest {
  tenantId: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  address: string;
  contactInfo?: {
    name?: string;
    email?: string;
    notes?: string;
  };
}

export class ContactFinder {
  async findOrCreateContact(request: FindContactRequest): Promise<string> {
    console.log(`= Finding or creating contact for tenant ${request.tenantId}, channel ${request.channel}, address ${request.address}`);

    try {
      let contactId: string | null = null;

      // Route to appropriate channel finder
      switch (request.channel) {
        case 'SMS':
          contactId = await smsChannelFinder.findContactByPhoneNumber({
            tenantId: request.tenantId,
            phoneNumber: request.address
          });
          break;
        
        case 'WHATSAPP':
          // TODO: Implement WhatsApp channel finder
          console.log(`🚧 WhatsApp channel finder not yet implemented`);
          break;
        
        case 'EMAIL':
          contactId = await emailChannelFinder.findContactByEmail({
            tenantId: request.tenantId,
            email: request.address
          });
          break;
        
        default:
          throw new Error(`Unsupported channel: ${request.channel}`);
      }

      // If contact found, check if we need to update it with new information
      if (contactId) {
        console.log(`✅ Found existing contact: ${contactId}`);
        
        // If we have contact info to potentially update, try to update the contact
        if (request.contactInfo && (request.contactInfo.name || request.contactInfo.email)) {
          console.log(`📝 Checking if contact ${contactId} needs updates...`);

          // Only include fields that have actual values (not undefined)
          const updates: Record<string, any> = {};
          if (request.contactInfo.name !== undefined) updates.name = request.contactInfo.name;
          if (request.contactInfo.email !== undefined) updates.email = request.contactInfo.email;
          if (request.contactInfo.notes !== undefined) updates.notes = request.contactInfo.notes;

          const updateResult = await contactUpdateService.updateContactIfNeeded({
            tenantId: request.tenantId,
            contactId,
            updates
          });
          
          if (updateResult.success && updateResult.updated) {
            console.log(`✅ Updated contact ${contactId} with fields: ${updateResult.fieldsUpdated?.join(', ')}`);
          } else if (updateResult.success) {
            console.log(`✅ Contact ${contactId} is already up to date`);
          } else {
            console.warn(`⚠️ Failed to update contact ${contactId}: ${updateResult.error}`);
          }
        }
        
        return contactId;
      }

      // If not found, create new contact
      console.log(`=🆕 Contact not found, creating new contact...`);

      if (request.channel === 'SMS') {
        const createRequest: CreateContactRequest = {
          tenantId: request.tenantId,
          channel: 'SMS',
          address: request.address,
          name: request.contactInfo?.name,
          email: request.contactInfo?.email,
          notes: request.contactInfo?.notes
        };

        contactId = await contactCreationService.createContact(createRequest);
        console.log(`✅ Created new contact: ${contactId}`);
        return contactId;
      } else if (request.channel === 'EMAIL') {
        const createRequest: CreateContactRequest = {
          tenantId: request.tenantId,
          channel: 'EMAIL',
          address: request.address,
          name: request.contactInfo?.name,
          email: request.address, // Email is both the address and contact field
          notes: request.contactInfo?.notes
        };

        contactId = await contactCreationService.createContact(createRequest);
        console.log(`✅ Created new contact: ${contactId}`);
        return contactId;
      } else {
        throw new Error(`Contact creation not yet implemented for channel: ${request.channel}`);
      }

    } catch (error) {
      console.error(`❌ Error in findOrCreateContact:`, error);
      throw new Error(`Failed to find or create contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const contactFinder = new ContactFinder();