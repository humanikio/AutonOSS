import { firestore } from '../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';
import { validateTags } from '../utilities/tags/validateTags';

export interface CreateContactRequest {
  tenantId: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  address: string; // Phone number or email address
  phoneNumber?: string; // For backwards compatibility
  name?: string;
  email?: string;
  notes?: string;
  tags?: string[]; // Array of tag IDs
  [key: string]: any; // Allow additional custom fields
}

export interface ContactAddress {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  address_norm: string;
  address_raw: string;
  is_primary: boolean;
  created_at: FirebaseFirestore.Timestamp;
}

export interface Contact {
  id: string;
  tenant_id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  notes?: string;
  dateOfBirth?: string;
  created_at: FirebaseFirestore.Timestamp;
}

export class ContactCreationService {
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1 and is 11 digits, format as +1XXXXXXXXXX
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    // If it's 10 digits, assume US number and add +1
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    // For other cases, just add + if not already there
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digitsOnly}`;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  async createContact(request: CreateContactRequest): Promise<string> {
    const contactId = uuidv4();
    const addressId = uuidv4();

    // Support both new (channel/address) and old (phoneNumber) formats
    const channel = request.channel || 'SMS';
    const rawAddress = request.address || request.phoneNumber || '';

    const normalizedAddress = channel === 'EMAIL'
      ? this.normalizeEmail(rawAddress)
      : this.normalizePhoneNumber(rawAddress);

    console.log(`📝 Creating new contact for tenant ${request.tenantId} via ${channel} with ${normalizedAddress}`);

    try {
      // 1. Validate tags if provided
      let validatedTags: string[] | undefined;
      if (request.tags && Array.isArray(request.tags) && request.tags.length > 0) {
        console.log(`🏷️  Validating ${request.tags.length} tag(s)`);
        const tagValidation = await validateTags(request.tenantId, request.tags);

        if (!tagValidation.valid) {
          throw new Error(`Invalid tag IDs provided: ${tagValidation.invalidTagIds.join(', ')}`);
        }

        validatedTags = tagValidation.validTagIds;
        console.log(`✅ All tags validated successfully`);
      }

      // 2. Fetch custom field definitions
      const customFields = await fetchAllCustomFields(request.tenantId, 'contact');

      // 3. Extract payload for validation (exclude tenantId, phoneNumber, and tags)
      const { tenantId, phoneNumber, tags, ...fieldsToValidate } = request;

      // Split name into firstName and lastName if provided
      const nameParts = fieldsToValidate.name ? fieldsToValidate.name.trim().split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Add derived fields to validation payload
      const payloadWithDerived = {
        ...fieldsToValidate,
        firstName,
        lastName,
      };

      // 4. Verify all fields (system + custom) against definitions
      const validatedFields = ResolveCustomFields.verify(
        payloadWithDerived,
        customFields,
        'contact'
      );

      // 5. Build contact data with validated fields
      const contactData = {
        id: contactId,
        tenant_id: request.tenantId,
        created_at: admin.firestore.Timestamp.now(),
        ...validatedFields, // All validated fields (sparse)
        ...(validatedTags && validatedTags.length > 0 ? { tags: validatedTags } : {}), // Add tags if validated
      };

      // Use a batch to ensure both documents are created atomically
      const batch = firestore.batch();

      // Create contact document
      const contactRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(contactId);

      batch.set(contactRef, contactData);

      // Create contact address document
      const addressRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contact_addresses')
        .doc(addressId);

      const addressData: ContactAddress = {
        id: addressId,
        tenant_id: request.tenantId,
        contact_id: contactId,
        channel: channel,
        address_norm: normalizedAddress,
        address_raw: rawAddress,
        is_primary: true,
        created_at: admin.firestore.Timestamp.now()
      };

      batch.set(addressRef, addressData);

      // Commit the batch
      await batch.commit();

      console.log(` Successfully created contact ${contactId} with address ${addressId}`);
      return contactId;

    } catch (error) {
      console.error(`L Error creating contact:`, error);
      throw new Error(`Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const contactCreationService = new ContactCreationService();