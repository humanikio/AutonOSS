import { firestore } from '../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';
import { validateTags } from '../utilities/tags/validateTags';

export interface UpdateContactRequest {
  tenantId: string;
  contactId: string;
  updates: {
    [key: string]: any; // Allow any field (system or custom)
  };
}

export interface UpdateContactResult {
  success: boolean;
  contactId?: string;
  updated?: boolean;
  fieldsUpdated?: string[];
  error?: string;
}

export class ContactUpdateService {
  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    // Basic email pattern: something@something.something
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phone: string): boolean {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Phone must have at least 10 digits (most international numbers)
    // and no more than 15 (E.164 standard max)
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return false;
    }

    // Must not contain @ symbol (catches emails)
    if (phone.includes('@')) {
      return false;
    }

    // Must contain at least some digits
    if (digitsOnly.length === 0) {
      return false;
    }

    return true;
  }

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

  /**
   * Delete old address record and create new one
   * Clean approach: nuke the old, create the new with is_primary: true
   */
  private async replaceContactAddress(
    tenantId: string,
    contactId: string,
    channel: 'SMS' | 'EMAIL',
    oldNormalizedAddress: string | null,
    newNormalizedAddress: string,
    newRawAddress: string
  ): Promise<void> {
    // Validate input
    if (!newRawAddress || newRawAddress.trim().length === 0) {
      console.warn(`⚠️ Empty address provided for ${channel}, skipping`);
      return;
    }

    // Validate email vs phone mismatch
    const looksLikeEmail = newRawAddress.includes('@');
    if (channel === 'SMS' && looksLikeEmail) {
      console.error(`❌ Email address "${newRawAddress}" provided for SMS channel - rejecting!`);
      return;
    }
    if (channel === 'EMAIL' && !looksLikeEmail) {
      console.warn(`⚠️ Non-email "${newRawAddress}" provided for EMAIL channel - may be invalid`);
    }

    // Validate normalized result
    if (newNormalizedAddress.length === 0) {
      console.error(`❌ Normalized address is empty for ${channel} address "${newRawAddress}" - rejecting!`);
      return;
    }

    // Step 1: Delete old address record if it exists
    if (oldNormalizedAddress) {
      console.log(`🗑️  Deleting old ${channel} address: ${oldNormalizedAddress}`);
      const oldAddressQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contact_addresses')
        .where('contact_id', '==', contactId)
        .where('channel', '==', channel)
        .where('address_norm', '==', oldNormalizedAddress)
        .get();

      if (!oldAddressQuery.empty) {
        const batch = firestore.batch();
        oldAddressQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Deleted ${oldAddressQuery.size} old ${channel} address record(s)`);
      }
    }

    // Step 2: Check if new address already exists (might be from message sending)
    const existingQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .where('contact_id', '==', contactId)
      .where('channel', '==', channel)
      .where('address_norm', '==', newNormalizedAddress)
      .get();

    if (!existingQuery.empty) {
      // Address exists, make sure it's primary
      console.log(`📝 Address already exists, ensuring it's primary`);
      const batch = firestore.batch();
      existingQuery.docs.forEach(doc => {
        batch.update(doc.ref, { is_primary: true });
      });
      await batch.commit();
      console.log(`✅ Updated existing ${channel} address to primary: ${newNormalizedAddress}`);
      return;
    }

    // Step 3: Demote any other primary addresses for this channel (edge case cleanup)
    const otherPrimaryQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .where('contact_id', '==', contactId)
      .where('channel', '==', channel)
      .where('is_primary', '==', true)
      .get();

    if (!otherPrimaryQuery.empty) {
      console.log(`🔄 Demoting ${otherPrimaryQuery.size} other primary ${channel} address(es)`);
      const batch = firestore.batch();
      otherPrimaryQuery.docs.forEach(doc => {
        batch.update(doc.ref, { is_primary: false });
      });
      await batch.commit();
    }

    // Step 4: Create new address record as PRIMARY
    const addressId = uuidv4();
    const addressData = {
      id: addressId,
      tenant_id: tenantId,
      contact_id: contactId,
      channel: channel,
      address_norm: newNormalizedAddress,
      address_raw: newRawAddress,
      is_primary: true,
      created_at: admin.firestore.Timestamp.now()
    };

    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .doc(addressId)
      .set(addressData);

    console.log(`✅ Created new ${channel} address: ${newNormalizedAddress} (primary: true)`);
  }

  async updateContactIfNeeded(request: UpdateContactRequest): Promise<UpdateContactResult> {
    try {
      console.log(`📝 Updating contact ${request.contactId} for tenant ${request.tenantId}`);

      // 1. Validate tags if provided
      let validatedTags: string[] | undefined;
      if (request.updates.tags && Array.isArray(request.updates.tags) && request.updates.tags.length > 0) {
        console.log(`🏷️  Validating ${request.updates.tags.length} tag(s)`);
        const tagValidation = await validateTags(request.tenantId, request.updates.tags);

        if (!tagValidation.valid) {
          throw new Error(`Invalid tag IDs provided: ${tagValidation.invalidTagIds.join(', ')}`);
        }

        validatedTags = tagValidation.validTagIds;
        console.log(`✅ All tags validated successfully`);
      }

      // 2. Fetch custom field definitions
      const customFields = await fetchAllCustomFields(request.tenantId, 'contact');

      // 3. Get current contact data
      const contactRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId);

      const contactDoc = await contactRef.get();

      if (!contactDoc.exists) {
        console.error(`❌ Contact ${request.contactId} not found`);
        return {
          success: false,
          error: 'Contact not found'
        };
      }

      const currentData = contactDoc.data();

      // 4. Handle name derivation if 'name' field is provided
      // Exclude tags from the updates for validation (we'll handle them separately)
      const { tags: _, ...updatesWithoutTags } = request.updates;
      let updatesWithDerived = { ...updatesWithoutTags };

      if (updatesWithDerived.name && typeof updatesWithDerived.name === 'string') {
        // Only derive firstName/lastName if 'name' is a real name (not a placeholder)
        const isPlaceholderName =
          updatesWithDerived.name === 'Unknown Contact' ||
          updatesWithDerived.name.startsWith('Inbound Caller') ||
          updatesWithDerived.name.startsWith('Caller ');

        if (isPlaceholderName) {
          // REMOVE placeholder names entirely - don't update existing contact names with placeholders
          delete updatesWithDerived.name;
          console.log('   Skipping placeholder name update - preserving existing contact name');
        } else {
          // Derive firstName/lastName for real names
          const nameParts = updatesWithDerived.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Only override firstName/lastName if they're not explicitly provided in updates
          if (!updatesWithDerived.firstName && firstName) {
            updatesWithDerived.firstName = firstName;
          }
          if (!updatesWithDerived.lastName && lastName) {
            updatesWithDerived.lastName = lastName;
          }
        }
      }

      // 5. Validate all fields against definitions
      const validatedFields = ResolveCustomFields.verify(
        updatesWithDerived,
        customFields,
        'contact'
      );

      // Add validated tags to the validated fields if provided
      if (validatedTags !== undefined) {
        validatedFields.tags = validatedTags;
      }

      console.log(`✅ Validated ${Object.keys(validatedFields).length} field(s)`);

      // 6. Handle special fields that need external operations
      const fieldsUpdated: string[] = [];

      // Handle email - validate, delete old, create new
      if (validatedFields.email) {
        // Validate email format
        if (!this.validateEmail(validatedFields.email)) {
          console.error(`❌ Invalid email format: ${validatedFields.email}`);
          return {
            success: false,
            error: `Invalid email format: ${validatedFields.email}`
          };
        }

        const oldEmail = currentData?.email ? this.normalizeEmail(currentData.email) : null;
        const newEmail = this.normalizeEmail(validatedFields.email);

        console.log(`📧 Replacing EMAIL address: ${oldEmail || 'none'} → ${newEmail}`);
        await this.replaceContactAddress(
          request.tenantId,
          request.contactId,
          'EMAIL',
          oldEmail,
          newEmail,
          validatedFields.email
        );
      }

      // Handle phoneNumber - validate, delete old, create new
      if (validatedFields.phoneNumber) {
        // Validate phone format
        if (!this.validatePhoneNumber(validatedFields.phoneNumber)) {
          console.error(`❌ Invalid phone number format: ${validatedFields.phoneNumber}`);
          return {
            success: false,
            error: `Invalid phone number format: ${validatedFields.phoneNumber}. Must be 10-15 digits.`
          };
        }

        // Phone is NOT in contact doc, need to look up old primary from contact_addresses
        let oldPhone: string | null = null;
        const oldPhoneQuery = await firestore
          .collection('tenants')
          .doc(request.tenantId)
          .collection('contact_addresses')
          .where('contact_id', '==', request.contactId)
          .where('channel', '==', 'SMS')
          .where('is_primary', '==', true)
          .limit(1)
          .get();

        if (!oldPhoneQuery.empty) {
          oldPhone = oldPhoneQuery.docs[0].data().address_norm;
        }

        const newPhone = this.normalizePhoneNumber(validatedFields.phoneNumber);

        console.log(`📱 Replacing SMS address: ${oldPhone || 'none'} → ${newPhone}`);
        await this.replaceContactAddress(
          request.tenantId,
          request.contactId,
          'SMS',
          oldPhone,
          newPhone,
          validatedFields.phoneNumber
        );

        // phoneNumber is not saved to contact document (only in contact_addresses)
        delete validatedFields.phoneNumber;
      }

      // Notes field is deprecated - remove if present in updates
      // Use userNotes subcollection for actual note-taking
      if (validatedFields.notes) {
        console.log(`⚠️  Ignoring deprecated notes field update`);
        delete validatedFields.notes;
      }

      // 7. Check if there are any fields to update
      if (Object.keys(validatedFields).length === 0) {
        console.log(`✅ Contact ${request.contactId} - no changes needed`);
        return {
          success: true,
          contactId: request.contactId,
          updated: false,
          fieldsUpdated: []
        };
      }

      // 8. Add updated_at timestamp
      const fieldsToUpdate = {
        ...validatedFields,
        updated_at: admin.firestore.Timestamp.now()
      };

      // 9. Perform the update
      console.log(`💾 Updating ${Object.keys(validatedFields).length} field(s):`, Object.keys(validatedFields).join(', '));
      await contactRef.update(fieldsToUpdate);

      console.log(`✅ Contact ${request.contactId} updated successfully`);
      return {
        success: true,
        contactId: request.contactId,
        updated: true,
        fieldsUpdated: Object.keys(validatedFields)
      };

    } catch (error) {
      console.error(`❌ Error updating contact:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating contact'
      };
    }
  }
}

export const contactUpdateService = new ContactUpdateService();