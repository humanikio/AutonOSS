import { contactFinder, FindContactRequest } from '../../../contacts/utilities/findContact';

export interface ResolveAttendeeContactRequest {
  tenantId: string;
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
}

export class AttendeeContactResolver {
  /**
   * Resolves an attendee to a contactId, creating the contact if necessary
   * Priority: contactId > email > phone
   */
  async resolveAttendeeContact(request: ResolveAttendeeContactRequest): Promise<string> {
    // If contactId is already provided, return it directly
    if (request.contactId) {
      console.log(`✅ Using provided contactId: ${request.contactId}`);
      return request.contactId;
    }

    // If email is provided, find or create contact by email
    if (request.email) {
      console.log(`📧 Resolving attendee by email: ${request.email}`);

      const findContactRequest: FindContactRequest = {
        tenantId: request.tenantId,
        channel: 'EMAIL',
        address: request.email,
        contactInfo: {
          name: request.name,
          email: request.email
        }
      };

      const contactId = await contactFinder.findOrCreateContact(findContactRequest);
      console.log(`✅ Resolved email ${request.email} to contactId: ${contactId}`);
      return contactId;
    }

    // If phone is provided, find or create contact by phone
    if (request.phone) {
      console.log(`📱 Resolving attendee by phone: ${request.phone}`);

      const findContactRequest: FindContactRequest = {
        tenantId: request.tenantId,
        channel: 'SMS',
        address: request.phone,
        contactInfo: {
          name: request.name,
          email: request.email
        }
      };

      const contactId = await contactFinder.findOrCreateContact(findContactRequest);
      console.log(`✅ Resolved phone ${request.phone} to contactId: ${contactId}`);
      return contactId;
    }

    // No valid identifier provided
    throw new Error('Attendee must have at least one of: contactId, email, or phone');
  }
}

export const attendeeContactResolver = new AttendeeContactResolver();
