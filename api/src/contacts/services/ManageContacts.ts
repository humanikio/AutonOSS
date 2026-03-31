import { firestore } from '../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { fetchAllCustomFields, fetchContactFieldGroups } from '../tools';
import { ResolveCustomFields } from '../utilities';
import { validateTags } from '../utilities/tags/validateTags';

export interface ManageContactRequest {
  tenantId: string;
  contactId: string;
  updates: {
    name?: string;
    email?: string;
    notes?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    [key: string]: any; // Allow custom fields
  };
}

export interface ContactUpdateFields {
  name?: string;
  email?: string;
  notes?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  updated_at: FirebaseFirestore.Timestamp;
  [key: string]: any;
}

export interface UserNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  isEdited: boolean;
}

export interface CreateUserNoteRequest {
  tenantId: string;
  contactId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl?: string;
}

export interface UpdateUserNoteRequest {
  tenantId: string;
  contactId: string;
  noteId: string;
  content: string;
  authorId: string; // For authorization check
}

export interface ContactAddressUpdateFields {
  address_norm?: string;
  address_raw?: string;
  updated_at: FirebaseFirestore.Timestamp;
  [key: string]: any;
}

export class ManageContactsService {
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
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

  /**
   * Create a contact_address entry for a contact if it doesn't exist
   */
  private async createContactAddressIfNeeded(
    tenantId: string,
    contactId: string,
    channel: 'SMS' | 'EMAIL',
    normalizedAddress: string,
    rawAddress: string
  ): Promise<boolean> {
    // Check if address already exists
    const addressQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .where('contact_id', '==', contactId)
      .where('channel', '==', channel)
      .where('address_norm', '==', normalizedAddress)
      .limit(1)
      .get();

    if (!addressQuery.empty) {
      return false; // Already exists
    }

    // Create new address entry
    const addressId = uuidv4();

    // Check if any primary address exists for this channel
    const primaryQuery = await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .where('contact_id', '==', contactId)
      .where('channel', '==', channel)
      .where('is_primary', '==', true)
      .limit(1)
      .get();

    const isPrimary = primaryQuery.empty; // First address for this channel is primary

    const addressData = {
      id: addressId,
      tenant_id: tenantId,
      contact_id: contactId,
      channel: channel,
      address_norm: normalizedAddress,
      address_raw: rawAddress,
      is_primary: isPrimary,
      created_at: admin.firestore.Timestamp.now()
    };

    await firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contact_addresses')
      .doc(addressId)
      .set(addressData);

    console.log(`✅ Created ${channel} contact_address entry for contact ${contactId}: ${normalizedAddress}`);
    return true; // Created
  }

  async updateContact(request: ManageContactRequest): Promise<void> {
    console.log(`📝 Updating contact ${request.contactId} for tenant ${request.tenantId}`);

    try {
      // 1. Validate tags if provided
      let validatedTags: string[] | undefined;
      if (request.updates.tags !== undefined && Array.isArray(request.updates.tags)) {
        if (request.updates.tags.length > 0) {
          console.log(`🏷️  Validating ${request.updates.tags.length} tag(s)`);
          const tagValidation = await validateTags(request.tenantId, request.updates.tags);

          if (!tagValidation.valid) {
            throw new Error(`Invalid tag IDs provided: ${tagValidation.invalidTagIds.join(', ')}`);
          }

          validatedTags = tagValidation.validTagIds;
          console.log(`✅ All tags validated successfully`);
        } else {
          // Empty array - user wants to clear all tags
          console.log(`🏷️  Clearing all tags from contact`);
          validatedTags = [];
        }
      }

      // 2. Fetch custom field definitions
      const customFields = await fetchAllCustomFields(request.tenantId, 'contact');

      // 3. Separate phoneNumber and tags (they go to different handling)
      const { phoneNumber, tags, ...fieldsToValidate } = request.updates;

      // 4. Handle name derivation logic
      let payloadToValidate = { ...fieldsToValidate };

      // If firstName or lastName are being updated, derive the full name
      if (fieldsToValidate.firstName !== undefined || fieldsToValidate.lastName !== undefined) {
        // Get current contact data to preserve existing firstName/lastName
        const currentContactDoc = await firestore
          .collection('tenants')
          .doc(request.tenantId)
          .collection('contacts')
          .doc(request.contactId)
          .get();

        const currentData = currentContactDoc.data();
        const currentFirstName = currentData?.firstName || currentData?.name?.split(' ')[0] || '';
        const currentLastName = currentData?.lastName || currentData?.name?.split(' ').slice(1).join(' ') || '';

        // Use provided values or fall back to current values
        const firstName = fieldsToValidate.firstName !== undefined
          ? fieldsToValidate.firstName
          : currentFirstName;
        const lastName = fieldsToValidate.lastName !== undefined
          ? fieldsToValidate.lastName
          : currentLastName;

        // Derive name and include in validation payload
        payloadToValidate = {
          ...payloadToValidate,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
        };
      } else if (fieldsToValidate.name !== undefined) {
        // If name is provided, derive firstName and lastName
        const nameParts = fieldsToValidate.name.trim().split(' ');
        payloadToValidate = {
          ...payloadToValidate,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
        };
      }

      // 5. Verify all fields (system + custom) against definitions
      const validatedFields = ResolveCustomFields.verify(
        payloadToValidate,
        customFields,
        'contact'
      );

      // Add validated tags to the validated fields if provided
      if (validatedTags !== undefined) {
        validatedFields.tags = validatedTags;
      }

      // 6. Build contact updates with validated fields
      const now = admin.firestore.Timestamp.now();
      const contactUpdates = {
        ...validatedFields,
        updated_at: now,
      };

      const batch = firestore.batch();

      // Update contact document
      const contactRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId);

      // Only update contact if there are fields to update
      const contactFieldsToUpdate = Object.keys(contactUpdates).filter(key => key !== 'updated_at');
      if (contactFieldsToUpdate.length > 0) {
        batch.update(contactRef, contactUpdates as any);
      }

      // Handle phone number update
      if (phoneNumber !== undefined) {
        console.log(`📞 Updating phone number for contact ${request.contactId}`);
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

        // Find the primary SMS contact address
        const addressQuery = await firestore
          .collection('tenants')
          .doc(request.tenantId)
          .collection('contact_addresses')
          .where('contact_id', '==', request.contactId)
          .where('channel', '==', 'SMS')
          .where('is_primary', '==', true)
          .limit(1)
          .get();

        if (!addressQuery.empty) {
          // Update existing primary SMS address
          const addressDoc = addressQuery.docs[0];

          const addressUpdates: ContactAddressUpdateFields = {
            address_norm: normalizedPhone,
            address_raw: phoneNumber,
            updated_at: now
          };

          batch.update(addressDoc.ref, addressUpdates as any);
        } else {
          // No primary SMS address exists - create one
          console.log(`📱 No primary SMS address found, creating new contact_address entry`);
          await this.createContactAddressIfNeeded(
            request.tenantId,
            request.contactId,
            'SMS',
            normalizedPhone,
            phoneNumber
          );
        }
      }

      // Handle email update - create contact_address entry if email is being added
      if (request.updates.email !== undefined) {
        console.log(`📧 Checking for EMAIL contact_address entry`);
        const normalizedEmail = this.normalizeEmail(request.updates.email);

        // Create contact_address entry for email if it doesn't exist
        await this.createContactAddressIfNeeded(
          request.tenantId,
          request.contactId,
          'EMAIL',
          normalizedEmail,
          request.updates.email
        );
      }

      // Commit the batch
      await batch.commit();

      console.log(`✅ Successfully updated contact ${request.contactId}`);

    } catch (error) {
      console.error(`❌ Error updating contact ${request.contactId}:`, error);
      throw new Error(`Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getContact(tenantId: string, contactId: string): Promise<any> {
    try {
      console.log(`🔍 Fetching contact ${contactId} for tenant ${tenantId}`);

      // 1. Fetch sparse contact data from Firestore
      const contactRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId);

      const contactDoc = await contactRef.get();

      if (!contactDoc.exists) {
        throw new Error('Contact not found');
      }

      const contactData = contactDoc.data();

      // 2. Fetch phone number from contact_addresses
      const addressQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contact_addresses')
        .where('contact_id', '==', contactId)
        .where('channel', '==', 'SMS')
        .where('is_primary', '==', true)
        .limit(1)
        .get();

      let phoneNumber = undefined;
      if (!addressQuery.empty) {
        phoneNumber = addressQuery.docs[0].data().address_raw || addressQuery.docs[0].data().address_norm;
      }

      // Merge phone number into contact data
      const contactWithPhone = {
        ...contactData,
        phoneNumber
      };

      // 3. Fetch custom field definitions and groups
      const customFields = await fetchAllCustomFields(tenantId, 'contact');
      const fieldGroups = await fetchContactFieldGroups(tenantId);

      // 4. Merge to get ALL possible fields (with values or undefined)
      const mergedFields = ResolveCustomFields.merge(
        contactWithPhone,
        customFields,
        'contact',
        fieldGroups
      );

      // 5. Ensure tags is always an array (handle legacy string format)
      let tags: string[] = [];
      if (contactData?.tags) {
        if (Array.isArray(contactData.tags)) {
          tags = contactData.tags;
        } else if (typeof contactData.tags === 'string') {
          // Legacy format: tags stored as string, try to parse as JSON
          console.warn(`⚠️  Contact ${contactId} has tags stored as string, converting to array`);
          try {
            const parsed = JSON.parse(contactData.tags);
            tags = Array.isArray(parsed) ? parsed : [];
          } catch {
            // If not valid JSON, treat as single tag
            tags = [contactData.tags];
          }
        }
      }

      // 6. Return complete field list for frontend
      return {
        contactId,
        fields: mergedFields,
        tags // Include tags at top level (guaranteed array)
      };

    } catch (error) {
      console.error(`❌ Error fetching contact ${contactId}:`, error);
      throw new Error(`Failed to fetch contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getContactFlattened(tenantId: string, contactId: string): Promise<any> {
    try {
      console.log(`🔍 Fetching flattened contact ${contactId} for tenant ${tenantId}`);

      // Get the full contact data using existing method
      const contact = await this.getContact(tenantId, contactId);

      // Flatten the fields array into a simple object
      const flattened: any = {
        contactId: contact.contactId,
        tags: contact.tags || [] // Include tags
      };

      // Convert fields array to simple key-value pairs
      contact.fields.forEach((field: any) => {
        if (field.name && field.value !== undefined) {
          flattened[field.name] = field.value;
        }
      });

      console.log(`✅ Flattened ${contact.fields.length} fields for contact ${contactId}`);
      console.log(`   🏷️  Tags (type: ${typeof flattened.tags}, isArray: ${Array.isArray(flattened.tags)}):`, JSON.stringify(flattened.tags));

      return flattened;

    } catch (error) {
      console.error(`❌ Error fetching flattened contact ${contactId}:`, error);
      throw new Error(`Failed to fetch flattened contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createUserNote(request: CreateUserNoteRequest): Promise<UserNote> {
    console.log(`📝 Creating user note for contact ${request.contactId} by user ${request.authorId}`);

    try {
      const now = admin.firestore.Timestamp.now();
      const noteId = firestore.collection('temp').doc().id; // Generate unique ID

      const userNote: UserNote = {
        id: noteId,
        content: request.content,
        authorId: request.authorId,
        authorName: request.authorName,
        authorEmail: request.authorEmail,
        authorAvatarUrl: request.authorAvatarUrl,
        createdAt: now,
        updatedAt: now,
        isEdited: false
      };

      const noteRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('userNotes')
        .doc(noteId);

      await noteRef.set(userNote);

      console.log(`✅ Successfully created user note ${noteId}`);
      return userNote;

    } catch (error) {
      console.error(`❌ Error creating user note:`, error);
      throw new Error(`Failed to create user note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserNotes(tenantId: string, contactId: string): Promise<UserNote[]> {
    console.log(`📋 Fetching user notes for contact ${contactId}`);

    try {
      const notesQuery = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('userNotes')
        .orderBy('createdAt', 'desc')
        .get();

      const notes: UserNote[] = [];
      notesQuery.forEach(doc => {
        notes.push(doc.data() as UserNote);
      });

      console.log(`✅ Successfully fetched ${notes.length} user notes`);
      return notes;

    } catch (error) {
      console.error(`❌ Error fetching user notes:`, error);
      throw new Error(`Failed to fetch user notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserNote(request: UpdateUserNoteRequest): Promise<void> {
    console.log(`✏️ Updating user note ${request.noteId} by user ${request.authorId}`);

    try {
      const noteRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('userNotes')
        .doc(request.noteId);

      const noteDoc = await noteRef.get();
      if (!noteDoc.exists) {
        throw new Error('Note not found');
      }

      const noteData = noteDoc.data() as UserNote;
      if (noteData.authorId !== request.authorId) {
        throw new Error('Unauthorized: Can only edit your own notes');
      }

      const now = admin.firestore.Timestamp.now();
      await noteRef.update({
        content: request.content,
        updatedAt: now,
        isEdited: true
      });

      console.log(`✅ Successfully updated user note ${request.noteId}`);

    } catch (error) {
      console.error(`❌ Error updating user note:`, error);
      throw new Error(`Failed to update user note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteUserNote(tenantId: string, contactId: string, noteId: string, authorId: string): Promise<void> {
    console.log(`🗑️ Deleting user note ${noteId} by user ${authorId}`);

    try {
      const noteRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('userNotes')
        .doc(noteId);

      const noteDoc = await noteRef.get();
      if (!noteDoc.exists) {
        throw new Error('Note not found');
      }

      const noteData = noteDoc.data() as UserNote;
      if (noteData.authorId !== authorId) {
        throw new Error('Unauthorized: Can only delete your own notes');
      }

      await noteRef.delete();

      console.log(`✅ Successfully deleted user note ${noteId}`);

    } catch (error) {
      console.error(`❌ Error deleting user note:`, error);
      throw new Error(`Failed to delete user note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const manageContactsService = new ManageContactsService();
