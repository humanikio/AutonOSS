import { db } from '../firebase/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { getAvatarColor } from '../utils/avatarColors';

/*
====================================================================
🔥 REQUIRED FIREBASE INDEXES FOR OPTIMAL PERFORMANCE 🔥
====================================================================

When you run this code, Firebase will generate links in the console to create these indexes.
Click the links to automatically create the required indexes for optimal performance.

Required Composite Indexes:
1. tenants/{tenantId}/contact_addresses
   - Fields: contact_id (Ascending), channel (Ascending), is_primary (Ascending)

2. tenants/{tenantId}/contacts/{contactId}/conversations  
   - Fields: channel (Ascending), last_message_at (Descending)

Required Single Field Indexes:
3. tenants/{tenantId}/contacts
   - Fields: created_at (Descending)
   - Fields: name (Ascending) 
   - Fields: firstName (Ascending)
   - Fields: lastName (Ascending)
   - Fields: email (Ascending)

4. tenants/{tenantId}/contact_addresses
   - Fields: address_norm (Ascending)

5. tenants/{tenantId}/contacts/{contactId}/conversations/{conversationId}/messages
   - Fields: created_at (Descending)

Performance Impact: These indexes will reduce query time from 3-5s to 200-500ms
====================================================================
*/

// Types for contact management (matching backend structure)
export interface Contact {
  id: string;
  tenant_id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  notes?: string;
  dateOfBirth?: string;
  created_at: Timestamp;
  tags?: string[];
}

export interface ContactAddress {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  address_norm: string;
  address_raw: string;
  is_primary: boolean;
  created_at: Timestamp;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  status: 'open' | 'closed';
  assigned_user_id?: string;
  last_message_at: Timestamp;
  created_at: Timestamp;
  isStarred?: boolean;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  provider_msg_id: string;
  from_norm: string;
  to_norm: string;
  body: string;
  media?: Array<{ url: string; type: string }>;
  status: string;
  created_at: Timestamp;
  agent_id?: string;
  
  // Email-specific fields
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
  subject?: string;
  html_content?: string;
  thread_id?: string;
}

// UI-friendly interface for contact management
export interface UIContactForManagement {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastMessage: string;
  time: string; // Contact creation time
  date: string; // Contact creation date
  lastActivityTime: string; // Last message time or creation time
  lastActivityDate: string; // Last message date or creation date
  lastActivityTimestamp: Date; // Raw timestamp for last activity
  unread: number;
  status: 'active' | 'waiting' | 'closed';
  initials: string;
  avatarColor: string;
  conversationId?: string;
  isStarred?: boolean;
  tags?: string[];
}

export class ContactManagementService {
  // Debug logging helper
  private debugLog(message: string, data?: any) {
    console.log(`🔍 [ContactManagement] ${message}`, data || '');
  }

  // Performance timing helper
  private timeOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      this.debugLog(`⏱️ Starting operation: ${operation}`);
      
      try {
        const result = await fn();
        const endTime = performance.now();
        this.debugLog(`✅ Operation completed: ${operation} in ${(endTime - startTime).toFixed(2)}ms`);
        resolve(result);
      } catch (error) {
        const endTime = performance.now();
        this.debugLog(`❌ Operation failed: ${operation} in ${(endTime - startTime).toFixed(2)}ms`, error);
        reject(error);
      }
    });
  }

  private getInitials(name?: string, phone?: string): string {
    if (name && name.trim()) {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  }

  private formatTime(timestamp: Timestamp): { time: string; date: string } {
    const date = timestamp.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    let dateStr: string;
    if (messageDate.getTime() === today.getTime()) {
      dateStr = 'Today';
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      dateStr = 'Yesterday';
    } else {
      dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }

    return { time, date: dateStr };
  }

  async getTotalContactsCount(tenantId: string): Promise<number> {
    try {
      this.debugLog('📊 Getting total count of contacts...');

      const contactsQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        orderBy('created_at', 'desc')
      );

      const { getCountFromServer } = await import('firebase/firestore');
      const snapshot = await getCountFromServer(contactsQuery);
      const totalCount = snapshot.data().count;

      this.debugLog(`📊 Total contacts count: ${totalCount}`);
      return totalCount;
    } catch (error) {
      console.error('❌ Error getting total contacts count:', error);
      return 0;
    }
  }

  async getAllContactsForManagement(
    tenantId: string, 
    pageSize: number = 20, 
    cursor?: DocumentSnapshot
  ): Promise<{
    contacts: UIContactForManagement[];
    hasMore: boolean;
    lastDoc?: DocumentSnapshot;
  }> {
    return this.timeOperation('getAllContactsForManagement', async () => {
      this.debugLog(`📥 Fetching contacts for tenant ${tenantId}`, {
        pageSize,
        hasCursor: !!cursor
      });

      // To trigger index creation, uncomment the line below and run once:
      // await this.forceIndexCreation(tenantId);

      // Build paginated query for contacts - REQUIRES SINGLE FIELD INDEX
      // Firebase Index Required: tenants/{tenantId}/contacts
      // Fields: created_at (Descending)
      let contactsQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        orderBy('created_at', 'desc'),
        limit(pageSize)
      );

      // Add cursor for pagination - SAME INDEX AS ABOVE
      if (cursor) {
        contactsQuery = query(
          collection(db, 'tenants', tenantId, 'contacts'),
          orderBy('created_at', 'desc'),
          startAfter(cursor),
          limit(pageSize)
        );
      }
      
      const contactsSnapshot = await getDocs(contactsQuery);
      
      this.debugLog(`📄 Retrieved ${contactsSnapshot.docs.length} contact documents`);

      // STRATEGY 1: Batch query for all phone numbers
      const contactIds = contactsSnapshot.docs.map(doc => doc.id);
      this.debugLog(`🚀 Batch querying phone numbers for ${contactIds.length} contacts`);
      
      // Firebase 'in' operator supports max 10 items, so batch in groups of 10
      const addressBatches: Promise<any>[] = [];
      for (let i = 0; i < contactIds.length; i += 10) {
        const batchIds = contactIds.slice(i, i + 10);
        const batchQuery = query(
          collection(db, 'tenants', tenantId, 'contact_addresses'),
          where('contact_id', 'in', batchIds),
          where('channel', '==', 'SMS'),
          where('is_primary', '==', true)
        );
        addressBatches.push(getDocs(batchQuery));
      }
      
      // Execute all address batches in parallel
      const addressResults = await Promise.all(addressBatches);
      
      // Create a map for O(1) lookup of addresses
      const addressMap = new Map<string, ContactAddress>();
      addressResults.forEach(snapshot => {
        snapshot.docs.forEach((doc: any) => {
          const address = doc.data() as ContactAddress;
          addressMap.set(address.contact_id, address);
        });
      });
      
      this.debugLog(`📱 Retrieved ${addressMap.size} phone numbers in ${addressBatches.length} batches`);

      // STRATEGY 2: Process all contacts in parallel
      const contactPromises = contactsSnapshot.docs.map(async (contactDoc): Promise<UIContactForManagement> => {
        const contact = contactDoc.data() as Contact;
        
        this.debugLog(`👤 Processing contact: ${contact.id}`, { name: contact.name });
        
        // Get address from pre-fetched map (no query needed!)
        const primaryAddress = addressMap.get(contact.id);
        
        // Get latest conversation for this contact (if any) - REQUIRES COMPOSITE INDEX
        // Firebase Index Required: tenants/{tenantId}/contacts/{contactId}/conversations
        // Fields: channel (Ascending), last_message_at (Descending)
        const conversationQuery = query(
          collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations'),
          where('channel', '==', 'SMS'),
          orderBy('last_message_at', 'desc'),
          limit(1)
        );
        
        const conversationSnapshot = await getDocs(conversationQuery);
        const latestConversation = conversationSnapshot.docs[0];
        
        this.debugLog(`💬 Found ${conversationSnapshot.docs.length} conversation(s) for contact ${contact.id}`);
        
        // Create contact data regardless of whether they have conversations/messages
        const { time: createdTime, date: createdDate } = this.formatTime(contact.created_at);
        
        if (latestConversation) {
          const conversation = latestConversation.data() as Conversation;
          
          // Get latest message from this conversation - REQUIRES SINGLE FIELD INDEX
          // Firebase Index Required: tenants/{tenantId}/contacts/{contactId}/conversations/{conversationId}/messages
          // Fields: created_at (Descending)
          const messageQuery = query(
            collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations', conversation.id, 'messages'),
            orderBy('created_at', 'desc'),
            limit(1)
          );
          
          const messageSnapshot = await getDocs(messageQuery);
          const latestMessage = messageSnapshot.docs[0]?.data() as Message;
          
          this.debugLog(`📨 Found ${messageSnapshot.docs.length} latest message(s) for conversation ${conversation.id}`);
          
          if (latestMessage) {
            // Contact with conversation and messages
            const { time: lastActivityTime, date: lastActivityDate } = this.formatTime(latestMessage.created_at);
            
            return {
              id: contact.id,
              name: contact.name || primaryAddress?.address_norm || 'Unknown',
              phone: primaryAddress?.address_norm || '',
              email: contact.email || '',
              lastMessage: latestMessage.body || '',
              time: createdTime,
              date: createdDate,
              lastActivityTime,
              lastActivityDate,
              lastActivityTimestamp: latestMessage.created_at.toDate(),
              unread: latestMessage.direction === 'inbound' ? 1 : 0,
              status: conversation.status === 'open' ? 'active' as const : 'closed' as const,
              initials: this.getInitials(contact.name, primaryAddress?.address_norm),
              avatarColor: getAvatarColor(contact.id),
              conversationId: conversation.id,
              isStarred: conversation.isStarred || false,
              tags: contact.tags
            };
          } else {
            // Contact with conversation but no messages
            return {
              id: contact.id,
              name: contact.name || primaryAddress?.address_norm || 'Unknown',
              phone: primaryAddress?.address_norm || '',
              email: contact.email || '',
              lastMessage: 'No messages yet',
              time: createdTime,
              date: createdDate,
              lastActivityTime: createdTime,
              lastActivityDate: createdDate,
              lastActivityTimestamp: contact.created_at.toDate(),
              unread: 0,
              status: 'waiting' as const,
              initials: this.getInitials(contact.name, primaryAddress?.address_norm),
              avatarColor: getAvatarColor(contact.id),
              conversationId: conversation.id,
              isStarred: conversation.isStarred || false,
              tags: contact.tags
            };
          }
        } else {
          // Contact without any conversations - newly created contact
          return {
            id: contact.id,
            name: contact.name || primaryAddress?.address_norm || 'Unknown',
            phone: primaryAddress?.address_norm || '',
            email: contact.email || '',
            lastMessage: 'No messages yet',
            time: createdTime,
            date: createdDate,
            lastActivityTime: createdTime,
            lastActivityDate: createdDate,
            lastActivityTimestamp: contact.created_at.toDate(),
            unread: 0,
            status: 'waiting',
            initials: this.getInitials(contact.name, primaryAddress?.address_norm),
            avatarColor: getAvatarColor(contact.id),
            tags: contact.tags
          };
        }
      });

      // Execute all contact processing in parallel and wait for results
      const processedContacts = await Promise.all(contactPromises);
      
      this.debugLog(`✅ Processed ${processedContacts.length} contacts in parallel`);

      const hasMore = contactsSnapshot.docs.length === pageSize;
      const lastDoc = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
      
      this.debugLog(`📊 Query completed`, {
        totalContacts: processedContacts.length,
        hasMore,
        hasLastDoc: !!lastDoc
      });

      return {
        contacts: processedContacts,
        hasMore,
        lastDoc
      };
    });
  }

  // Search all contacts by name, email, or phone
  async searchAllContacts(tenantId: string, searchQuery: string): Promise<UIContactForManagement[]> {
    return this.timeOperation('searchAllContacts', async () => {
      const contacts: UIContactForManagement[] = [];
      const searchLower = searchQuery.toLowerCase().trim();
      
      this.debugLog(`🔍 Searching contacts with query: "${searchQuery}"`);
      
      if (!searchLower) {
        return contacts;
      }

      // Force index creation for search (remove this after indexes are created)
      try {
        await this.forceIndexCreation(tenantId);
      } catch (error) {
        console.log('🔥 Index creation triggered, this is expected on first run');
      }

      // Search by name, firstName, lastName, email, and phone number using Firebase indexes
      const searchQueries = [];
      const searchCapitalized = searchLower.charAt(0).toUpperCase() + searchLower.slice(1);
      console.log(`🔍 Building search queries for: "${searchQuery}"`);
      console.log(`🔍 Search terms: lowercase="${searchLower}", capitalized="${searchCapitalized}"`);
      
      // 1. Search by full name (case-insensitive) - REQUIRES SINGLE FIELD INDEX
      // Firebase Index Required: tenants/{tenantId}/contacts
      // Fields: name (Ascending)
      
      // Search lowercase version
      searchQueries.push(
        query(
          collection(db, 'tenants', tenantId, 'contacts'),
          where('name', '>=', searchLower),
          where('name', '<=', searchLower + '\uf8ff'),
          orderBy('name'),
          limit(100)
        )
      );
      
      // Search capitalized version (first letter uppercase)
      if (searchCapitalized !== searchLower) {
        searchQueries.push(
          query(
            collection(db, 'tenants', tenantId, 'contacts'),
            where('name', '>=', searchCapitalized),
            where('name', '<=', searchCapitalized + '\uf8ff'),
            orderBy('name'),
            limit(100)
          )
        );
      }
      
      // 2. Search by firstName - REQUIRES SINGLE FIELD INDEX
      // Firebase Index Required: tenants/{tenantId}/contacts
      // Fields: firstName (Ascending)
      
      // Search lowercase firstName
      searchQueries.push(
        query(
          collection(db, 'tenants', tenantId, 'contacts'),
          where('firstName', '>=', searchLower),
          where('firstName', '<=', searchLower + '\uf8ff'),
          orderBy('firstName'),
          limit(100)
        )
      );
      
      // Search capitalized firstName
      if (searchCapitalized !== searchLower) {
        searchQueries.push(
          query(
            collection(db, 'tenants', tenantId, 'contacts'),
            where('firstName', '>=', searchCapitalized),
            where('firstName', '<=', searchCapitalized + '\uf8ff'),
            orderBy('firstName'),
            limit(100)
          )
        );
      }
      
      // 3. Search by lastName - REQUIRES SINGLE FIELD INDEX
      // Firebase Index Required: tenants/{tenantId}/contacts
      // Fields: lastName (Ascending)
      
      // Search lowercase lastName
      searchQueries.push(
        query(
          collection(db, 'tenants', tenantId, 'contacts'),
          where('lastName', '>=', searchLower),
          where('lastName', '<=', searchLower + '\uf8ff'),
          orderBy('lastName'),
          limit(100)
        )
      );
      
      // Search capitalized lastName
      if (searchCapitalized !== searchLower) {
        searchQueries.push(
          query(
            collection(db, 'tenants', tenantId, 'contacts'),
            where('lastName', '>=', searchCapitalized),
            where('lastName', '<=', searchCapitalized + '\uf8ff'),
            orderBy('lastName'),
            limit(100)
          )
        );
      }
      
      // 4. Search by email if query contains @ - REQUIRES SINGLE FIELD INDEX
      // Firebase Index Required: tenants/{tenantId}/contacts
      // Fields: email (Ascending)
      if (searchLower.includes('@')) {
        searchQueries.push(
          query(
            collection(db, 'tenants', tenantId, 'contacts'),
            where('email', '>=', searchLower),
            where('email', '<=', searchLower + '\uf8ff'),
            orderBy('email'),
            limit(100)
          )
        );
      }
      
      // 5. Search by phone number in contact_addresses - REQUIRES SINGLE FIELD INDEX
      // Firebase Index Required: tenants/{tenantId}/contact_addresses
      // Fields: address_norm (Ascending)
      if (/[\d\+\-\(\)\s]/.test(searchQuery)) { // If query contains phone-like characters
        searchQueries.push(
          query(
            collection(db, 'tenants', tenantId, 'contact_addresses'),
            where('address_norm', '>=', searchQuery),
            where('address_norm', '<=', searchQuery + '\uf8ff'),
            where('channel', '==', 'SMS'),
            orderBy('address_norm'),
            limit(100)
          )
        );
      }

      console.log(`🔍 Executing ${searchQueries.length} search queries for: "${searchQuery}"`);
      const searchResults = await Promise.all(
        searchQueries.map(async (q, index) => {
          const result = await getDocs(q);
          console.log(`🔍 Query ${index + 1} returned ${result.docs.length} results`);
          return result;
        })
      );

      // Combine and deduplicate results from all search types
      const foundContactIds = new Set<string>();
      const contactDocsMap = new Map<string, any>();
      
      for (let i = 0; i < searchResults.length; i++) {
        const snapshot = searchResults[i];
        const isPhoneSearch = i === searchQueries.length - 1 && /[\d\+\-\(\)\s]/.test(searchQuery);
        
        for (const doc of snapshot.docs) {
          let contactId: string;
          
          if (isPhoneSearch) {
            // This is a contact_addresses document, get the contact_id
            const addressData = doc.data() as ContactAddress;
            contactId = addressData.contact_id;
          } else {
            // This is a contacts document
            contactId = doc.id;
          }
          
          if (!foundContactIds.has(contactId)) {
            foundContactIds.add(contactId);
            
            if (!isPhoneSearch) {
              // Store the contact document for direct use
              contactDocsMap.set(contactId, doc);
            } else {
              // For phone searches, we need to fetch the actual contact document
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
            collection(db, 'tenants', tenantId, 'contacts'),
            where('__name__', 'in', batchIds)
          );
          const contactSnapshot = await getDocs(contactQuery);
          
          contactSnapshot.docs.forEach(doc => {
            contactDocsMap.set(doc.id, doc);
          });
        }
      }

      const allContactDocs = Array.from(contactDocsMap.values()).filter(doc => doc !== null);
      this.debugLog(`🔍 Found ${allContactDocs.length} matching contact documents`);

      // Process each found contact (same logic as getAllContactsForManagement)
      for (const contactDoc of allContactDocs) {
        const contact = contactDoc.data() as Contact;
        
        // Get primary phone number - REQUIRES COMPOSITE INDEX (same as above)
        // Firebase Index Required: tenants/{tenantId}/contact_addresses
        // Fields: contact_id (Ascending), channel (Ascending), is_primary (Ascending)
        const addressQuery = query(
          collection(db, 'tenants', tenantId, 'contact_addresses'),
          where('contact_id', '==', contact.id),
          where('channel', '==', 'SMS'),
          where('is_primary', '==', true),
          limit(1)
        );
        
        const addressSnapshot = await getDocs(addressQuery);
        const primaryAddress = addressSnapshot.docs[0]?.data() as ContactAddress;
        
        // Check if phone number matches search query
        const phoneMatches = primaryAddress?.address_norm?.includes(searchQuery) || false;
        const nameMatches = contact.name?.toLowerCase().includes(searchLower) || false;
        const emailMatches = contact.email?.toLowerCase().includes(searchLower) || false;
        
        // Only include if it actually matches our search criteria
        if (!nameMatches && !emailMatches && !phoneMatches) {
          continue;
        }

        // Get latest conversation and message (same logic as getAllContactsForManagement)
        // Firebase Index Required: tenants/{tenantId}/contacts/{contactId}/conversations
        // Fields: channel (Ascending), last_message_at (Descending)
        const conversationQuery = query(
          collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations'),
          where('channel', '==', 'SMS'),
          orderBy('last_message_at', 'desc'),
          limit(1)
        );
        
        const conversationSnapshot = await getDocs(conversationQuery);
        const latestConversation = conversationSnapshot.docs[0];
        
        const { time: createdTime, date: createdDate } = this.formatTime(contact.created_at);
        
        if (latestConversation) {
          const conversation = latestConversation.data() as Conversation;
          
          // Firebase Index Required: tenants/{tenantId}/contacts/{contactId}/conversations/{conversationId}/messages
          // Fields: created_at (Descending)
          const messageQuery = query(
            collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations', conversation.id, 'messages'),
            orderBy('created_at', 'desc'),
            limit(1)
          );
          
          const messageSnapshot = await getDocs(messageQuery);
          const latestMessage = messageSnapshot.docs[0]?.data() as Message;
          
          if (latestMessage) {
            const { time: lastActivityTime, date: lastActivityDate } = this.formatTime(latestMessage.created_at);
            
            contacts.push({
              id: contact.id,
              name: contact.name || primaryAddress?.address_norm || 'Unknown',
              phone: primaryAddress?.address_norm || '',
              email: contact.email || '',
              lastMessage: latestMessage.body || '',
              time: createdTime,
              date: createdDate,
              lastActivityTime,
              lastActivityDate,
              lastActivityTimestamp: latestMessage.created_at.toDate(),
              unread: latestMessage.direction === 'inbound' ? 1 : 0,
              status: conversation.status === 'open' ? 'active' as const : 'closed' as const,
              initials: this.getInitials(contact.name, primaryAddress?.address_norm),
              avatarColor: getAvatarColor(contact.id),
              conversationId: conversation.id,
              isStarred: conversation.isStarred || false
            });
          } else {
            contacts.push({
              id: contact.id,
              name: contact.name || primaryAddress?.address_norm || 'Unknown',
              phone: primaryAddress?.address_norm || '',
              email: contact.email || '',
              lastMessage: 'No messages yet',
              time: createdTime,
              date: createdDate,
              lastActivityTime: createdTime,
              lastActivityDate: createdDate,
              lastActivityTimestamp: contact.created_at.toDate(),
              unread: 0,
              status: 'waiting' as const,
              initials: this.getInitials(contact.name, primaryAddress?.address_norm),
              avatarColor: getAvatarColor(contact.id),
              conversationId: conversation.id,
              isStarred: conversation.isStarred || false
            });
          }
        } else {
          contacts.push({
            id: contact.id,
            name: contact.name || primaryAddress?.address_norm || 'Unknown',
            phone: primaryAddress?.address_norm || '',
            email: contact.email || '',
            lastMessage: 'No messages yet',
            time: createdTime,
            date: createdDate,
            lastActivityTime: createdTime,
            lastActivityDate: createdDate,
            lastActivityTimestamp: contact.created_at.toDate(),
            unread: 0,
            status: 'waiting',
            initials: this.getInitials(contact.name, primaryAddress?.address_norm),
            avatarColor: getAvatarColor(contact.id)
          });
        }
      }
      
      this.debugLog(`🔍 Search completed, found ${contacts.length} matching contacts`);
      
      return contacts;
    });
  }

  // Get a single contact by ID
  async getContactById(tenantId: string, contactId: string): Promise<UIContactForManagement | null> {
    return this.timeOperation('getContactById', async () => {
      this.debugLog(`🔍 Fetching single contact: ${contactId}`);

      try {
        // Import doc and getDoc from Firebase
        const { doc, getDoc } = await import('firebase/firestore');

        // Get the contact document
        const contactRef = doc(db, 'tenants', tenantId, 'contacts', contactId);
        const contactSnap = await getDoc(contactRef);

        if (!contactSnap.exists()) {
          this.debugLog(`❌ Contact not found: ${contactId}`);
          return null;
        }

        const contact = contactSnap.data() as Contact;

        // Get primary phone number
        const addressQuery = query(
          collection(db, 'tenants', tenantId, 'contact_addresses'),
          where('contact_id', '==', contactId),
          where('channel', '==', 'SMS'),
          where('is_primary', '==', true),
          limit(1)
        );

        const addressSnapshot = await getDocs(addressQuery);
        const primaryAddress = addressSnapshot.docs[0]?.data() as ContactAddress;

        // Get latest conversation
        const conversationQuery = query(
          collection(db, 'tenants', tenantId, 'contacts', contactId, 'conversations'),
          where('channel', '==', 'SMS'),
          orderBy('last_message_at', 'desc'),
          limit(1)
        );

        const conversationSnapshot = await getDocs(conversationQuery);
        const latestConversation = conversationSnapshot.docs[0];

        const { time: createdTime, date: createdDate } = this.formatTime(contact.created_at);

        if (latestConversation) {
          const conversation = latestConversation.data() as Conversation;

          // Get latest message
          const messageQuery = query(
            collection(db, 'tenants', tenantId, 'contacts', contactId, 'conversations', conversation.id, 'messages'),
            orderBy('created_at', 'desc'),
            limit(1)
          );

          const messageSnapshot = await getDocs(messageQuery);
          const latestMessage = messageSnapshot.docs[0]?.data() as Message;

          if (latestMessage) {
            const { time: lastActivityTime, date: lastActivityDate } = this.formatTime(latestMessage.created_at);

            return {
              id: contact.id,
              name: contact.name || primaryAddress?.address_norm || 'Unknown',
              phone: primaryAddress?.address_norm || '',
              email: contact.email || '',
              lastMessage: latestMessage.body || '',
              time: createdTime,
              date: createdDate,
              lastActivityTime,
              lastActivityDate,
              lastActivityTimestamp: latestMessage.created_at.toDate(),
              unread: latestMessage.direction === 'inbound' ? 1 : 0,
              status: conversation.status === 'open' ? 'active' as const : 'closed' as const,
              initials: this.getInitials(contact.name, primaryAddress?.address_norm),
              avatarColor: getAvatarColor(contact.id),
              conversationId: conversation.id,
              isStarred: conversation.isStarred || false,
              tags: contact.tags
            };
          } else {
            return {
              id: contact.id,
              name: contact.name || primaryAddress?.address_norm || 'Unknown',
              phone: primaryAddress?.address_norm || '',
              email: contact.email || '',
              lastMessage: 'No messages yet',
              time: createdTime,
              date: createdDate,
              lastActivityTime: createdTime,
              lastActivityDate: createdDate,
              lastActivityTimestamp: contact.created_at.toDate(),
              unread: 0,
              status: 'waiting' as const,
              initials: this.getInitials(contact.name, primaryAddress?.address_norm),
              avatarColor: getAvatarColor(contact.id),
              conversationId: conversation.id,
              isStarred: conversation.isStarred || false,
              tags: contact.tags
            };
          }
        } else {
          return {
            id: contact.id,
            name: contact.name || primaryAddress?.address_norm || 'Unknown',
            phone: primaryAddress?.address_norm || '',
            email: contact.email || '',
            lastMessage: 'No messages yet',
            time: createdTime,
            date: createdDate,
            lastActivityTime: createdTime,
            lastActivityDate: createdDate,
            lastActivityTimestamp: contact.created_at.toDate(),
            unread: 0,
            status: 'waiting',
            initials: this.getInitials(contact.name, primaryAddress?.address_norm),
            avatarColor: getAvatarColor(contact.id),
            tags: contact.tags
          };
        }
      } catch (error) {
        console.error('Error fetching contact by ID:', error);
        return null;
      }
    });
  }

  // Real-time listener for contact management (only listens to first page)
  onContactsChange(tenantId: string, callback: (contacts: UIContactForManagement[]) => void) {
    const contactsQuery = query(
      collection(db, 'tenants', tenantId, 'contacts'),
      orderBy('created_at', 'desc'),
      limit(20) // Only listen to first page for real-time updates
    );

    return onSnapshot(contactsQuery, async () => {
      // Re-fetch first page when any contact changes
      this.debugLog('🔄 Real-time contact change detected, refreshing first page');
      const result = await this.getAllContactsForManagement(tenantId, 20);
      callback(result.contacts);
    });
  }

  // 🔥 FORCE INDEX CREATION METHOD
  // Call this method once to trigger Firebase index creation prompts
  async forceIndexCreation(tenantId: string): Promise<void> {
    console.log('🔥 FORCING INDEX CREATION - These queries WILL FAIL until indexes are created!');
    
    try {
      // Force contact_addresses composite index creation
      console.log('🔥 Triggering contact_addresses composite index requirement...');
      const addressQuery = query(
        collection(db, 'tenants', tenantId, 'contact_addresses'),
        where('contact_id', '==', 'force-index'),
        where('channel', '==', 'SMS'),
        where('is_primary', '==', true)
      );
      await getDocs(addressQuery);

      // Force conversations composite index creation  
      console.log('🔥 Triggering conversations composite index requirement...');
      const conversationQuery = query(
        collection(db, 'tenants', tenantId, 'contacts', 'dummy-contact', 'conversations'),
        where('channel', '==', 'SMS'),
        orderBy('last_message_at', 'desc')
      );
      await getDocs(conversationQuery);

      // Force phone search index creation
      console.log('🔥 Triggering phone search index requirement...');
      const phoneQuery = query(
        collection(db, 'tenants', tenantId, 'contact_addresses'),
        where('address_norm', '>=', '555'),
        where('address_norm', '<=', '555\uf8ff'),
        where('channel', '==', 'SMS'),
        orderBy('address_norm')
      );
      await getDocs(phoneQuery);

      // Force firstName search index creation
      console.log('🔥 Triggering firstName search index requirement...');
      const firstNameQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        where('firstName', '>=', 'test'),
        where('firstName', '<=', 'test\uf8ff'),
        orderBy('firstName')
      );
      await getDocs(firstNameQuery);

      // Force lastName search index creation
      console.log('🔥 Triggering lastName search index requirement...');
      const lastNameQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        where('lastName', '>=', 'test'),
        where('lastName', '<=', 'test\uf8ff'),
        orderBy('lastName')
      );
      await getDocs(lastNameQuery);

      // Force messages single field index creation
      console.log('🔥 Triggering messages single field index requirement...');
      const messageQuery = query(
        collection(db, 'tenants', tenantId, 'contacts', 'dummy-contact', 'conversations', 'dummy-conv', 'messages'),
        orderBy('created_at', 'desc')
      );
      await getDocs(messageQuery);

    } catch (error: any) {
      if (error.message?.includes('index')) {
        console.log('🔥 SUCCESS! Index creation links should appear in console above ⬆️');
        console.log('🔥 Click the links to create the required indexes');
      } else {
        console.error('🔥 Unexpected error:', error);
      }
    }
  }
}

export const contactManagementService = new ContactManagementService();

// 🔥 GLOBAL HELPER: Call this from browser console to force index creation
// Usage: window.forceFirebaseIndexes('your-tenant-id')
if (typeof window !== 'undefined') {
  (window as any).forceFirebaseIndexes = (tenantId: string) => {
    if (!tenantId) {
      console.error('🔥 ERROR: Please provide tenant ID: window.forceFirebaseIndexes("your-tenant-id")');
      return;
    }
    console.log(`🔥 Starting index creation for tenant: ${tenantId}`);
    contactManagementService.forceIndexCreation(tenantId);
  };
}