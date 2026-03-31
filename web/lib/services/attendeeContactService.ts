import { db } from '../firebase/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { getAvatarColor } from '../utils/avatarColors';

// UI-friendly interface for attendee contact selection
export interface UIContactForAttendee {
  id: string;
  name: string;
  phone: string;
  email: string;
  initials: string;
  avatarColor: string;
}

export class AttendeeContactService {
  // Debug logging helper
  private debugLog(message: string, data?: any) {
    console.log(`🔍 [AttendeeContact] ${message}`, data || '');
  }

  /**
   * Get all contacts for attendee selection with pagination
   */
  async getAllContactsForAttendees(
    tenantId: string,
    pageSize: number = 20
  ): Promise<{ contacts: UIContactForAttendee[] }> {
    this.debugLog(`Fetching ${pageSize} contacts for tenant: ${tenantId}`);

    try {
      // Query contacts ordered by creation date
      const contactsRef = collection(db, `tenants/${tenantId}/contacts`);
      const contactsQuery = query(
        contactsRef,
        orderBy('created_at', 'desc'),
        limit(pageSize)
      );

      const contactsSnapshot = await getDocs(contactsQuery);
      const contacts: UIContactForAttendee[] = [];

      // Process each contact
      for (const contactDoc of contactsSnapshot.docs) {
        const contactData = contactDoc.data();

        // Get primary phone and email from contact_addresses
        const addressesRef = collection(db, `tenants/${tenantId}/contact_addresses`);
        const addressesQuery = query(
          addressesRef,
          where('contact_id', '==', contactDoc.id),
          where('is_primary', '==', true)
        );

        const addressesSnapshot = await getDocs(addressesQuery);

        let phone = '';
        let email = '';

        addressesSnapshot.docs.forEach(doc => {
          const addressData = doc.data();
          if (addressData.channel === 'SMS' || addressData.channel === 'WHATSAPP') {
            phone = addressData.address_raw || addressData.address_norm;
          } else if (addressData.channel === 'EMAIL') {
            email = addressData.address_raw || addressData.address_norm;
          }
        });

        // Skip contacts without phone or email
        if (!phone && !email) {
          continue;
        }

        // Get name
        const name = contactData.name ||
                    (contactData.firstName && contactData.lastName
                      ? `${contactData.firstName} ${contactData.lastName}`
                      : contactData.firstName || contactData.lastName || 'Unknown');

        // Generate initials
        const initials = this.getInitials(name);
        const avatarColor = getAvatarColor(contactDoc.id);

        contacts.push({
          id: contactDoc.id,
          name,
          phone,
          email,
          initials,
          avatarColor
        });
      }

      this.debugLog(`Found ${contacts.length} contacts`);
      return { contacts };
    } catch (error) {
      console.error('Error fetching contacts for attendees:', error);
      throw error;
    }
  }

  /**
   * Search all contacts for attendee selection using Firebase indexed queries
   * This searches across ALL contacts, not just the first page
   */
  async searchContacts(
    tenantId: string,
    searchQuery: string
  ): Promise<UIContactForAttendee[]> {
    this.debugLog(`Searching contacts for: "${searchQuery}"`);

    try {
      const searchLower = searchQuery.toLowerCase().trim();

      if (!searchLower) {
        return [];
      }

      const searchCapitalized = searchLower.charAt(0).toUpperCase() + searchLower.slice(1);

      // Build multiple search queries using Firebase indexes (same strategy as contactManagementService)
      const searchQueries = [];

      // 1. Search by name (lowercase)
      searchQueries.push(
        query(
          collection(db, `tenants/${tenantId}/contacts`),
          where('name', '>=', searchLower),
          where('name', '<=', searchLower + '\uf8ff'),
          orderBy('name'),
          limit(100)
        )
      );

      // 2. Search by name (capitalized)
      if (searchCapitalized !== searchLower) {
        searchQueries.push(
          query(
            collection(db, `tenants/${tenantId}/contacts`),
            where('name', '>=', searchCapitalized),
            where('name', '<=', searchCapitalized + '\uf8ff'),
            orderBy('name'),
            limit(100)
          )
        );
      }

      // 3. Search by firstName (lowercase)
      searchQueries.push(
        query(
          collection(db, `tenants/${tenantId}/contacts`),
          where('firstName', '>=', searchLower),
          where('firstName', '<=', searchLower + '\uf8ff'),
          orderBy('firstName'),
          limit(100)
        )
      );

      // 4. Search by firstName (capitalized)
      if (searchCapitalized !== searchLower) {
        searchQueries.push(
          query(
            collection(db, `tenants/${tenantId}/contacts`),
            where('firstName', '>=', searchCapitalized),
            where('firstName', '<=', searchCapitalized + '\uf8ff'),
            orderBy('firstName'),
            limit(100)
          )
        );
      }

      // 5. Search by lastName (lowercase)
      searchQueries.push(
        query(
          collection(db, `tenants/${tenantId}/contacts`),
          where('lastName', '>=', searchLower),
          where('lastName', '<=', searchLower + '\uf8ff'),
          orderBy('lastName'),
          limit(100)
        )
      );

      // 6. Search by lastName (capitalized)
      if (searchCapitalized !== searchLower) {
        searchQueries.push(
          query(
            collection(db, `tenants/${tenantId}/contacts`),
            where('lastName', '>=', searchCapitalized),
            where('lastName', '<=', searchCapitalized + '\uf8ff'),
            orderBy('lastName'),
            limit(100)
          )
        );
      }

      // 7. Search by email if query contains @
      if (searchLower.includes('@')) {
        searchQueries.push(
          query(
            collection(db, `tenants/${tenantId}/contacts`),
            where('email', '>=', searchLower),
            where('email', '<=', searchLower + '\uf8ff'),
            orderBy('email'),
            limit(100)
          )
        );
      }

      // 8. Search by phone number in contact_addresses
      if (/[\d\+\-\(\)\s]/.test(searchQuery)) {
        searchQueries.push(
          query(
            collection(db, `tenants/${tenantId}/contact_addresses`),
            where('address_norm', '>=', searchQuery),
            where('address_norm', '<=', searchQuery + '\uf8ff'),
            where('channel', '==', 'SMS'),
            orderBy('address_norm'),
            limit(100)
          )
        );
      }

      this.debugLog(`Executing ${searchQueries.length} parallel search queries`);

      // Execute all queries in parallel
      const searchResults = await Promise.all(
        searchQueries.map(q => getDocs(q))
      );

      // Deduplicate contact IDs
      const foundContactIds = new Set<string>();
      const contactDocsMap = new Map<string, any>();

      for (let i = 0; i < searchResults.length; i++) {
        const snapshot = searchResults[i];
        const isPhoneSearch = i === searchQueries.length - 1 && /[\d\+\-\(\)\s]/.test(searchQuery);

        for (const doc of snapshot.docs) {
          let contactId: string;

          if (isPhoneSearch) {
            // This is a contact_addresses document
            const addressData = doc.data();
            contactId = addressData.contact_id;
          } else {
            // This is a contacts document
            contactId = doc.id;
          }

          if (!foundContactIds.has(contactId)) {
            foundContactIds.add(contactId);

            if (!isPhoneSearch) {
              contactDocsMap.set(contactId, doc);
            } else {
              contactDocsMap.set(contactId, null); // Mark for fetching
            }
          }
        }
      }

      // Fetch contact documents for phone search results
      const contactIdsToFetch = Array.from(contactDocsMap.entries())
        .filter(([_, doc]) => doc === null)
        .map(([contactId, _]) => contactId);

      if (contactIdsToFetch.length > 0) {
        // Batch fetch contacts by ID (limit 10 per query due to Firebase 'in' limit)
        for (let i = 0; i < contactIdsToFetch.length; i += 10) {
          const batchIds = contactIdsToFetch.slice(i, i + 10);
          const contactQuery = query(
            collection(db, `tenants/${tenantId}/contacts`),
            where('__name__', 'in', batchIds)
          );
          const contactSnapshot = await getDocs(contactQuery);

          contactSnapshot.docs.forEach(doc => {
            contactDocsMap.set(doc.id, doc);
          });
        }
      }

      const allContactDocs = Array.from(contactDocsMap.values()).filter(doc => doc !== null);
      this.debugLog(`Found ${allContactDocs.length} matching contact documents`);

      // Batch fetch all contact addresses for found contacts
      const contactIds = allContactDocs.map(doc => doc.id);
      const addressMap = new Map<string, { phone: string; email: string }>();

      // Batch addresses in groups of 10 (Firebase 'in' limit)
      for (let i = 0; i < contactIds.length; i += 10) {
        const batchIds = contactIds.slice(i, i + 10);
        const addressesQuery = query(
          collection(db, `tenants/${tenantId}/contact_addresses`),
          where('contact_id', 'in', batchIds),
          where('is_primary', '==', true)
        );

        const addressesSnapshot = await getDocs(addressesQuery);

        addressesSnapshot.docs.forEach(doc => {
          const addressData = doc.data();
          const contactId = addressData.contact_id;

          if (!addressMap.has(contactId)) {
            addressMap.set(contactId, { phone: '', email: '' });
          }

          const contactAddress = addressMap.get(contactId)!;

          if (addressData.channel === 'SMS' || addressData.channel === 'WHATSAPP') {
            contactAddress.phone = addressData.address_raw || addressData.address_norm;
          } else if (addressData.channel === 'EMAIL') {
            contactAddress.email = addressData.address_raw || addressData.address_norm;
          }
        });
      }

      // Process contacts
      const contacts: UIContactForAttendee[] = [];

      for (const contactDoc of allContactDocs) {
        const contactData = contactDoc.data();

        // Get name
        const name = contactData.name ||
                    (contactData.firstName && contactData.lastName
                      ? `${contactData.firstName} ${contactData.lastName}`
                      : contactData.firstName || contactData.lastName || 'Unknown');

        // Get addresses from pre-fetched map
        const addresses = addressMap.get(contactDoc.id) || { phone: '', email: '' };

        // Skip contacts without phone or email
        if (!addresses.phone && !addresses.email) {
          continue;
        }

        // Verify match (additional client-side validation)
        const nameMatches = name.toLowerCase().includes(searchLower);
        const emailMatches = addresses.email.toLowerCase().includes(searchLower);
        const phoneMatches = addresses.phone.includes(searchQuery);

        if (!nameMatches && !emailMatches && !phoneMatches) {
          continue;
        }

        const initials = this.getInitials(name);
        const avatarColor = getAvatarColor(contactDoc.id);

        contacts.push({
          id: contactDoc.id,
          name,
          phone: addresses.phone,
          email: addresses.email,
          initials,
          avatarColor
        });
      }

      this.debugLog(`Search completed: found ${contacts.length} matching contacts`);
      return contacts;
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Get initials from name
   */
  private getInitials(name: string): string {
    if (!name || name === 'Unknown') return '?';

    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}

// Export singleton instance
export const attendeeContactService = new AttendeeContactService();
