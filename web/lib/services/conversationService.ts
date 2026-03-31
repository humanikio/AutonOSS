import { db } from '../firebase/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { getAvatarColor } from '../utils/avatarColors';

/*
====================================================================
🔥 ADDITIONAL FIREBASE INDEXES FOR CONVERSATION SERVICE 🔥
====================================================================

Additional indexes needed for the conversation service:

5. tenants/{tenantId}/contacts/{contactId}/conversations
   - Fields: channel (Ascending), status (Ascending), last_message_at (Descending)

Note: Other required indexes are documented in contactManagementService.ts
====================================================================
*/

// Types matching our backend structure
export interface Contact {
  id: string;
  tenant_id: string;
  name?: string;
  email?: string;
  notes?: string;
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
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PHONE';
  status: 'open' | 'closed';
  assigned_user_id?: string;
  last_message_at: Timestamp;
  created_at: Timestamp;
  unread_count?: number; // Add missing unread_count field
  last_read_at?: Timestamp; // Also add last_read_at field for completeness
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
  media?: Array<{
    url: string;
    type: string;
    filename?: string; // NEW: Attachment filename
    isInline?: boolean; // NEW: Distinguish inline images from attachments
  }>;
  status: string;
  created_at: Timestamp;
  agent_id?: string; // Agent ID for agent-sent messages
  user_id?: string; // User ID for user-sent messages

  // Email-specific fields
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PHONE';
  subject?: string; // Email subject
  html_content?: string; // DEPRECATED: HTML content for emails (old emails)
  html_storage_url?: string; // NEW: URL to HTML in Firebase Storage
  html_storage_path?: string; // NEW: Storage path for HTML
  thread_id?: string; // Gmail thread ID

  // Phone-specific fields
  message_category?: 'system' | 'agent_report' | 'standard'; // Category for UI rendering
  message_type?: 'call_initiated' | 'call_completed' | 'call_failed'; // Phone call status

  // Destination workflow fields
  destination_key?: string; // The destination webhook key used
  send_method?: 'traditional_sms' | 'destination_webhook'; // How the message was sent
  webhook_response?: any; // Webhook response data for destination messages
  webhook_status_code?: number; // HTTP status code from webhook
}

// UI-friendly interfaces
export interface UIContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastMessage: string;
  time: string; // Contact creation time
  date: string; // Contact creation date
  lastActivityTime: string; // Last message time
  lastActivityDate: string; // Last message date
  lastActivityTimestamp: Date; // Raw timestamp for last activity
  unread: number;
  status: 'active' | 'waiting' | 'closed';
  initials: string;
  avatarColor: string;
  conversationId?: string;
  isStarred?: boolean;
  tags?: string[];
}

export interface UIMessage {
  id: string;
  sender: 'bot' | 'user' | 'agent';
  text: string;
  time: string;
  timestamp: Date;
  media?: Array<{
    url: string;
    type: string;
    filename?: string; // NEW: Attachment filename
    isInline?: boolean; // NEW: Distinguish inline images from attachments
  }>;
  direction: 'inbound' | 'outbound';
  agent_id?: string; // Agent ID for agent-sent messages
  user_id?: string; // User ID for user-sent messages

  // Email-specific fields
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PHONE';
  subject?: string; // Email subject
  htmlContent?: string; // DEPRECATED: HTML content for emails (old emails)
  htmlStorageUrl?: string; // NEW: URL to HTML in Firebase Storage
  htmlStoragePath?: string; // NEW: Storage path for HTML
  threadId?: string; // Gmail thread ID

  // Phone-specific fields
  message_category?: 'system' | 'agent_report' | 'standard'; // NEW: Category for special rendering
  message_type?: 'call_initiated' | 'call_completed' | 'call_failed'; // Phone call status

  // Destination workflow fields
  destination_key?: string; // The destination webhook key used
  send_method?: 'traditional_sms' | 'destination_webhook'; // How the message was sent
  webhook_response?: any; // Webhook response data for destination messages
  webhook_status_code?: number; // HTTP status code from webhook
}

export interface PhoneRecord {
  id: string;
  conversationId: string;
  direction?: 'inbound' | 'outbound';
  phoneNumber: string;
  duration?: number;
  status: string;
  callSummaryTitle?: string;
  transcriptSummary?: string;
  audioUrl?: string;
  audioStoragePath?: string;
  transcript?: any[];
  analysis?: any;
  metadata?: {
    call_duration_secs?: number;
    phone_call?: {
      direction?: 'inbound' | 'outbound';
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  agentId?: string;
  agentName?: string;
}

export interface UIPhoneRecord {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  phoneNumber: string;
  duration?: number;
  status: string;
  callSummaryTitle?: string;
  transcriptSummary?: string;
  audioUrl?: string;
  timestamp: Date;
  time: string;
  contactInitials: string;
  avatarColor: string;
  agentName?: string;
  agentId?: string;
  transcript?: any[];
  analysis?: any;
}

export class ConversationService {
  
  private getMessagePreview(message?: any): string {
    if (!message) return 'Click to view conversation';
    
    // Handle phone call messages
    if (message.channel === 'PHONE' || message.call_sid) {
      // Use custom message body for phone calls (already formatted in backend)
      if (message.body && message.body.trim()) {
        return message.body;
      }
      
      // Fallback phone call formatting if body is missing
      const messageType = message.message_type;
      const direction = message.direction;
      const duration = message.call_duration;
      
      switch (messageType) {
        case 'call_initiated':
          return direction === 'inbound' ? '📞 Incoming call started' : '📞 Outbound call started';
        case 'call_completed':
          const durationText = duration ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})` : '';
          return direction === 'inbound' ? `📞 Call completed${durationText}` : `📞 Outbound call completed${durationText}`;
        case 'call_failed':
          return direction === 'inbound' ? '📞 Incoming call failed' : '📞 Outbound call failed';
        default:
          return '📞 Phone call';
      }
    }
    
    // Handle email messages
    if (message.channel === 'EMAIL' || message.subject) {
      // For emails, show subject if available, otherwise body
      if (message.subject && message.subject.trim()) {
        return message.subject;
      } else if (message.body && message.body.trim()) {
        return message.body;
      }
      return '📧 Email';
    }
    
    // Handle SMS/text messages with text content
    if (message.body && message.body.trim()) {
      return message.body;
    }
    
    // Handle media messages (SMS/MMS)
    if (message.media && message.media.length > 0) {
      const mediaCount = message.media.length;
      const firstMediaType = message.media[0].type || 'file';
      
      if (firstMediaType.startsWith('image/')) {
        return mediaCount > 1 ? `📷 ${mediaCount} images` : '📷 Image';
      } else if (firstMediaType.startsWith('video/')) {
        return mediaCount > 1 ? `🎥 ${mediaCount} videos` : '🎥 Video';
      } else if (firstMediaType.startsWith('audio/')) {
        return mediaCount > 1 ? `🎵 ${mediaCount} audio files` : '🎵 Audio';
      } else {
        return mediaCount > 1 ? `📎 ${mediaCount} files` : '📎 Attachment';
      }
    }
    
    // Fallback for messages with no content
    return 'Message';
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

  async searchContactsWithConversations(tenantId: string, searchQuery: string): Promise<UIContact[]> {
    try {
      const searchLower = searchQuery.toLowerCase().trim();
      console.log(`🔍 Searching contacts with conversations for: "${searchQuery}"`);

      if (!searchLower) {
        return [];
      }

      // Get ALL contacts with conversationId
      const contactsQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        where('conversationId', '!=', null),
        orderBy('conversationId'), // Required when using != operator
        orderBy('created_at', 'desc')
      );

      const contactsSnapshot = await getDocs(contactsQuery);

      if (contactsSnapshot.empty) {
        return [];
      }

      // Filter contacts client-side by name, email, or phone
      const matchingContacts: UIContact[] = [];

      for (const contactDoc of contactsSnapshot.docs) {
        const contact = contactDoc.data() as Contact;

        // Check if contact matches search query
        const nameMatch = contact.name?.toLowerCase().includes(searchLower);
        const emailMatch = contact.email?.toLowerCase().includes(searchLower);

        if (!nameMatch && !emailMatch) {
          continue; // Skip non-matching contacts
        }

        // Get phone number
        const addressQuery = query(
          collection(db, 'tenants', tenantId, 'contact_addresses'),
          where('contact_id', '==', contact.id),
          where('channel', '==', 'SMS'),
          where('is_primary', '==', true),
          limit(1)
        );

        const addressSnapshot = await getDocs(addressQuery);
        const primaryAddress = addressSnapshot.docs[0]?.data() as ContactAddress;

        if (!primaryAddress) continue;

        // Get latest conversation
        const conversationQuery = query(
          collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations'),
          where('status', '==', 'open'),
          orderBy('last_message_at', 'desc'),
          limit(1)
        );

        const conversationSnapshot = await getDocs(conversationQuery);
        if (conversationSnapshot.empty) continue;

        const latestConversation = conversationSnapshot.docs[0];
        const conversation = latestConversation.data() as Conversation;

        // Get latest message
        const messageQuery = query(
          collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations', conversation.id, 'messages'),
          orderBy('created_at', 'desc'),
          limit(1)
        );

        const messageSnapshot = await getDocs(messageQuery);
        const latestMessage = messageSnapshot.docs[0]?.data() as Message;

        const unreadCount = conversation.unread_count || 0;
        const { time: createdTime, date: createdDate } = this.formatTime(contact.created_at);
        const { time: lastActivityTime, date: lastActivityDate } = latestMessage
          ? this.formatTime(latestMessage.created_at)
          : this.formatTime(conversation.created_at);

        matchingContacts.push({
          id: contact.id,
          name: contact.name || primaryAddress.address_norm || 'Unknown',
          phone: primaryAddress.address_norm || '',
          email: contact.email || '',
          lastMessage: this.getMessagePreview(latestMessage),
          time: createdTime,
          date: createdDate,
          lastActivityTime,
          lastActivityDate,
          lastActivityTimestamp: latestMessage ? latestMessage.created_at.toDate() : conversation.created_at.toDate(),
          unread: unreadCount,
          status: conversation.status === 'open' ? 'active' : 'waiting',
          initials: this.getInitials(contact.name, primaryAddress.address_norm),
          avatarColor: getAvatarColor(contact.id),
          conversationId: conversation.id,
          isStarred: conversation.isStarred || false,
          tags: contact.tags
        });
      }

      // Sort by last activity
      matchingContacts.sort((a, b) => {
        const aTime = a.lastActivityTimestamp?.getTime() || 0;
        const bTime = b.lastActivityTimestamp?.getTime() || 0;
        return bTime - aTime;
      });

      console.log(`🔍 Found ${matchingContacts.length} matching contacts with conversations`);
      return matchingContacts;
    } catch (error) {
      console.error('Error searching contacts with conversations:', error);
      return [];
    }
  }

  async getTotalConversationsCount(tenantId: string): Promise<number> {
    try {
      console.log('📊 Getting total count of contacts with conversations...');

      // Get all contacts with conversationId field
      const contactsQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        where('conversationId', '!=', null) // Only count contacts with conversationId field
      );

      const { getCountFromServer } = await import('firebase/firestore');
      const snapshot = await getCountFromServer(contactsQuery);
      const totalCount = snapshot.data().count;

      console.log(`📊 Total conversations count: ${totalCount}`);

      if (totalCount === 0) {
        console.warn('⚠️ Total count is 0 - this might indicate:');
        console.warn('  1. No contacts have conversationId field set');
        console.warn('  2. Firestore index is still building');
        console.warn('  3. Query is failing silently');
      }

      return totalCount;
    } catch (error) {
      console.error('❌ Error getting total conversations count:', error);
      console.error('Full error:', JSON.stringify(error, null, 2));
      return 0;
    }
  }

  async getContactsWithConversations(
    tenantId: string,
    limitCount: number = 50,
    cursor?: DocumentSnapshot
  ): Promise<{ contacts: UIContact[], hasMore: boolean, lastDoc?: DocumentSnapshot }> {
    const startTime = performance.now();
    console.log('🔍 OPTIMIZED getContactsWithConversations called for tenant:', tenantId, 'limit:', limitCount, 'cursor:', !!cursor);

    try {
      const contacts: UIContact[] = [];

      // STEP 1: Get contacts with pagination - NO COMPOSITE INDEX NEEDED (single field)
      console.log('📞 Step 1: Fetching contacts...');

      // Build query with cursor support
      let contactsQuery = query(
        collection(db, 'tenants', tenantId, 'contacts'),
        orderBy('created_at', 'desc'),
        limit(limitCount + 1) // Fetch one extra to determine if there are more
      );

      // Add cursor if provided (for pagination)
      if (cursor) {
        contactsQuery = query(contactsQuery, startAfter(cursor));
      }

      const contactsSnapshot = await getDocs(contactsQuery);
      console.log(`📞 Step 1 completed in ${Math.round(performance.now() - startTime)}ms - Found ${contactsSnapshot.docs.length} contacts`);

      if (contactsSnapshot.empty) {
        console.log('📞 No contacts found');
        return { contacts: [], hasMore: false };
      }

      // Check if there are more results
      const hasMore = contactsSnapshot.docs.length > limitCount;
      const docsToProcess = hasMore ? contactsSnapshot.docs.slice(0, limitCount) : contactsSnapshot.docs;
      const lastDoc = docsToProcess[docsToProcess.length - 1];

      // STEP 2: Batch get all contact addresses - COMPOSITE INDEX REQUIRED
      const step2Start = performance.now();
      console.log('🔍 Step 2: Batch fetching contact addresses...');
      const contactIds = docsToProcess.map(doc => doc.id);
      
      // PROBLEM: We can only query 10 contacts at a time with 'in' operator!
      // This means for 50 contacts, we need 5 separate queries
      const addressMap = new Map<string, ContactAddress>();
      
      // Batch contacts in groups of 10 for the 'in' query limit
      for (let i = 0; i < contactIds.length; i += 10) {
        const batchIds = contactIds.slice(i, i + 10);
        // Firebase Index Required: tenants/{tenantId}/contact_addresses
        // Fields: contact_id (Ascending), channel (Ascending), is_primary (Ascending)
        const addressesQuery = query(
          collection(db, 'tenants', tenantId, 'contact_addresses'),
          where('contact_id', 'in', batchIds),
          where('channel', '==', 'SMS'),
          where('is_primary', '==', true)
        );
        
        const batchSnapshot = await getDocs(addressesQuery);
        batchSnapshot.docs.forEach(doc => {
          const address = doc.data() as ContactAddress;
          addressMap.set(address.contact_id, address);
        });
      }
      
      console.log(`📞 Step 2 completed in ${Math.round(performance.now() - step2Start)}ms - Found ${addressMap.size} addresses`);

      // STEP 3: Process contacts in batches to avoid N+1 queries
      const step3Start = performance.now();
      console.log('💬 Step 3: Processing contacts with conversations...');
      let processedCount = 0;
      
      // Process contacts in parallel batches for better performance
      const contactPromises = docsToProcess.map(async (contactDoc) => {
        try {
          const contact = contactDoc.data() as Contact;
          const primaryAddress = addressMap.get(contact.id);
          
          if (!primaryAddress) {
            return null; // Skip contacts without addresses
          }

          // Firebase Index Required: tenants/{tenantId}/contacts/{contactId}/conversations
          // Fields: status (Ascending), last_message_at (Descending)
          const conversationQuery = query(
            collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations'),
            where('status', '==', 'open'),
            orderBy('last_message_at', 'desc'),
            limit(1)
          );
          
          const conversationSnapshot = await getDocs(conversationQuery);
          
          if (conversationSnapshot.empty) {
            return null; // Skip contacts without conversations
          }

          const latestConversation = conversationSnapshot.docs[0];
          const conversation = latestConversation.data() as Conversation;
          
          // Get latest message only - use conversation's unread_count field
          const messageQuery = query(
            collection(db, 'tenants', tenantId, 'contacts', contact.id, 'conversations', conversation.id, 'messages'),
            orderBy('created_at', 'desc'),
            limit(1)
          );
          
          const messageSnapshot = await getDocs(messageQuery);
          const latestMessage = messageSnapshot.docs[0]?.data() as Message;
          
          // USE THE BACKEND'S UNREAD COUNT - this is properly maintained when marking as read
          const unreadCount = conversation.unread_count || 0;

          // Format times
          const { time: createdTime, date: createdDate } = this.formatTime(contact.created_at);
          const { time: lastActivityTime, date: lastActivityDate } = latestMessage 
            ? this.formatTime(latestMessage.created_at)
            : this.formatTime(conversation.created_at);
          
          processedCount++;
          
          return {
            id: contact.id,
            name: contact.name || primaryAddress.address_norm || 'Unknown',
            phone: primaryAddress.address_norm || '',
            email: contact.email || '',
            lastMessage: this.getMessagePreview(latestMessage),
            time: createdTime,
            date: createdDate,
            lastActivityTime,
            lastActivityDate,
            lastActivityTimestamp: latestMessage ? latestMessage.created_at.toDate() : conversation.created_at.toDate(),
            unread: unreadCount,
            status: conversation.status === 'open' ? 'active' : 'waiting',
            initials: this.getInitials(contact.name, primaryAddress.address_norm),
            avatarColor: getAvatarColor(contact.id),
            conversationId: conversation.id,
            isStarred: conversation.isStarred || false,
            tags: contact.tags
          };

        } catch (conversationError: any) {
          if (conversationError?.message?.includes('index') || conversationError?.message?.includes('Index')) {
            console.error('🚨 FIRESTORE INDEX REQUIRED! Check console for index creation link.');
            console.error('🔗 FULL ERROR MESSAGE:', conversationError?.message);
            console.error('🔗 FULL ERROR OBJECT:', conversationError);
          }
          return null;
        }
      });

      // Execute all contact queries in parallel and filter out nulls
      const contactResults = await Promise.all(contactPromises);
      const validContacts = contactResults.filter(contact => contact !== null) as UIContact[];
      
      console.log(`💬 Step 3 completed in ${Math.round(performance.now() - step3Start)}ms - Processed ${validContacts.length} contacts`);

      // Sort by last activity (most recent first)
      validContacts.sort((a, b) => {
        const aTime = a.lastActivityTimestamp?.getTime() || 0;
        const bTime = b.lastActivityTimestamp?.getTime() || 0;
        return bTime - aTime;
      });

      const totalTime = Math.round(performance.now() - startTime);
      console.log(`✅ OPTIMIZED: Returning ${validContacts.length} contacts in ${totalTime}ms (${Math.round(totalTime / validContacts.length)}ms per contact), hasMore: ${hasMore}`);

      return {
        contacts: validContacts,
        hasMore,
        lastDoc
      };
      
    } catch (error: any) {
      console.error('❌ Error in optimized getContactsWithConversations:', error);
      
      // Check if it's an index error
      if (error?.message?.includes('index') || error?.message?.includes('Index')) {
        console.error('🚨 FIRESTORE INDEX REQUIRED! Check console for index creation link.');
        console.error('🔗 FULL ERROR MESSAGE:', error?.message);
        console.error('🔗 FULL ERROR OBJECT:', error);
        console.error('📋 Required indexes:');
        console.error('1. Collection: contact_addresses, Fields: contact_id, channel, is_primary');  
        console.error('2. Collection: conversations, Fields: channel, status, last_message_at');
        console.error('3. Collection: messages, Fields: direction, created_at');
      }

      return { contacts: [], hasMore: false };
    }
  }


  async getMessages(tenantId: string, contactId: string, conversationId: string): Promise<UIMessage[]> {
    // Legacy method - now delegates to getRecentMessages for backwards compatibility
    return this.getRecentMessages(tenantId, contactId, conversationId, 50);
  }

  async getRecentMessages(tenantId: string, contactId: string, conversationId: string, limitCount: number = 50): Promise<UIMessage[]> {
    try {
      console.log(`📧 Loading recent ${limitCount} messages for conversation ${conversationId}`);
      
      // Get most recent messages first (desc order)
      // Firebase Index Required: tenants/{tenantId}/contacts/{contactId}/conversations/{conversationId}/messages
      // Fields: created_at (Descending)
      const messagesQuery = query(
        collection(db, 'tenants', tenantId, 'contacts', contactId, 'conversations', conversationId, 'messages'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messages = messagesSnapshot.docs.map(doc => {
        const message = doc.data() as Message;
        const { time } = this.formatTime(message.created_at);

        return {
          id: message.id,
          sender: message.agent_id ? 'agent' : (message.direction === 'outbound' ? 'user' : 'bot') as 'bot' | 'user' | 'agent',
          text: message.body,
          time,
          timestamp: message.created_at.toDate(),
          media: message.media,
          direction: message.direction,
          agent_id: message.agent_id,
          user_id: message.user_id,
          channel: message.channel,
          subject: message.subject,
          htmlContent: message.html_content, // Keep for backward compatibility
          htmlStorageUrl: message.html_storage_url, // NEW
          htmlStoragePath: message.html_storage_path, // NEW
          threadId: message.thread_id,
          message_category: message.message_category,
          message_type: message.message_type,
          destination_key: message.destination_key,
          send_method: message.send_method,
          webhook_response: message.webhook_response,
          webhook_status_code: message.webhook_status_code
        };
      });
      
      // Reverse to get chronological order (oldest first) for UI display
      return messages.reverse();
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      return [];
    }
  }

  async getMessagesBefore(tenantId: string, contactId: string, conversationId: string, beforeCursor: Timestamp, limitCount: number = 50): Promise<UIMessage[]> {
    try {
      console.log(`📧 Loading ${limitCount} messages before cursor for conversation ${conversationId}`);
      
      // Get messages before the cursor (going backwards in time)
      const messagesQuery = query(
        collection(db, 'tenants', tenantId, 'contacts', contactId, 'conversations', conversationId, 'messages'),
        orderBy('created_at', 'desc'),
        startAfter(beforeCursor),
        limit(limitCount)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messages = messagesSnapshot.docs.map(doc => {
        const message = doc.data() as Message;
        const { time } = this.formatTime(message.created_at);

        return {
          id: message.id,
          sender: message.agent_id ? 'agent' : (message.direction === 'outbound' ? 'user' : 'bot') as 'bot' | 'user' | 'agent',
          text: message.body,
          time,
          timestamp: message.created_at.toDate(),
          media: message.media,
          direction: message.direction,
          agent_id: message.agent_id,
          user_id: message.user_id,
          channel: message.channel,
          subject: message.subject,
          htmlContent: message.html_content, // Keep for backward compatibility
          htmlStorageUrl: message.html_storage_url, // NEW
          htmlStoragePath: message.html_storage_path, // NEW
          threadId: message.thread_id,
          message_category: message.message_category,
          message_type: message.message_type,
          destination_key: message.destination_key,
          send_method: message.send_method,
          webhook_response: message.webhook_response,
          webhook_status_code: message.webhook_status_code
        };
      });
      
      // Reverse to get chronological order (oldest first) for UI display
      return messages.reverse();
    } catch (error) {
      console.error('Error fetching messages before cursor:', error);
      return [];
    }
  }

  async getPhoneRecords(tenantId: string, contactId: string): Promise<UIPhoneRecord[]> {
    try {
      const phoneRecordsQuery = query(
        collection(db, 'tenants', tenantId, 'contacts', contactId, 'phoneRecords'),
        orderBy('createdAt', 'asc')
      );
      
      const phoneRecordsSnapshot = await getDocs(phoneRecordsQuery);
      
      return phoneRecordsSnapshot.docs.map(doc => {
        const record = doc.data() as PhoneRecord;
        const { time } = this.formatTime(record.createdAt);
        
        
        return {
          id: record.id,
          conversationId: record.conversationId,
          direction: record.direction || record.metadata?.phone_call?.direction || 'outbound',
          phoneNumber: record.phoneNumber,
          duration: record.duration || record.metadata?.call_duration_secs,
          status: record.status,
          callSummaryTitle: record.callSummaryTitle || record.analysis?.call_summary_title,
          transcriptSummary: record.transcriptSummary || record.analysis?.transcript_summary,
          audioUrl: record.audioUrl,
          timestamp: record.createdAt.toDate(),
          time,
          contactInitials: this.getInitials('', record.phoneNumber),
          avatarColor: getAvatarColor(contactId),
          agentName: record.agentName,
          agentId: record.agentId,
          transcript: record.transcript,
          analysis: record.analysis
        };
      });
    } catch (error) {
      console.error('Error fetching phone records:', error);
      return [];
    }
  }

  // Real-time listener for recent messages only (optimized for pagination)
  onMessagesChange(
    tenantId: string, 
    contactId: string, 
    conversationId: string, 
    callback: (messages: UIMessage[]) => void,
    limitCount: number = 50
  ) {
    console.log(`🔄 Setting up real-time listener for recent ${limitCount} messages`);
    
    // Only listen to recent messages to avoid loading entire conversation
    const messagesQuery = query(
      collection(db, 'tenants', tenantId, 'contacts', contactId, 'conversations', conversationId, 'messages'),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const message = doc.data() as Message;
        const { time } = this.formatTime(message.created_at);

        return {
          id: message.id,
          sender: message.agent_id ? 'agent' : (message.direction === 'outbound' ? 'user' : 'bot') as 'bot' | 'user' | 'agent',
          text: message.body,
          time,
          timestamp: message.created_at.toDate(),
          media: message.media,
          direction: message.direction,
          agent_id: message.agent_id,
          user_id: message.user_id,
          channel: message.channel,
          subject: message.subject,
          htmlContent: message.html_content, // Keep for backward compatibility
          htmlStorageUrl: message.html_storage_url, // NEW
          htmlStoragePath: message.html_storage_path, // NEW
          threadId: message.thread_id,
          message_category: message.message_category, // Phone message category
          message_type: message.message_type, // Phone message type
          destination_key: message.destination_key,
          send_method: message.send_method,
          webhook_response: message.webhook_response,
          webhook_status_code: message.webhook_status_code
        };
      });
      
      // Reverse to chronological order for UI display
      callback(messages.reverse());
    });
  }

  // Real-time listener for conversations - OPTIMIZED to not break pagination
  // This listener only fetches the first 50 contacts for real-time updates
  // The hook will merge these with any additional paginated contacts
  onContactsChange(tenantId: string, callback: (contacts: UIContact[]) => void) {
    const contactsQuery = query(
      collection(db, 'tenants', tenantId, 'contacts'),
      where('conversationId', '!=', null),
      orderBy('conversationId'),
      orderBy('created_at', 'desc'),
      limit(50) // Limit real-time updates to recent 50 contacts only
    );

    return onSnapshot(contactsQuery, async (snapshot) => {
      // Only process the first 50 contacts with conversations for real-time updates
      // The hook will handle merging with pagination state
      const contacts: UIContact[] = [];

      // Capture 'this' context for use in async callback
      const self = this;

      for (const contactDoc of snapshot.docs) {
        const contactData = contactDoc.data();
        const conversationId = contactData.conversationId;

        if (!conversationId) continue;

        // Get the conversation data
        const conversationRef = doc(db, 'tenants', tenantId, 'contacts', contactDoc.id, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);

        if (!conversationSnap.exists()) continue;

        const conversation = conversationSnap.data();

        // Format the date using the formatTime method
        const timestamp = conversation.last_message_at?.toDate() || new Date();
        const { date: formattedDate, time: formattedTime } = conversation.last_message_at
          ? self.formatTime(conversation.last_message_at)
          : { date: 'Unknown', time: 'Unknown' };

        contacts.push({
          id: contactDoc.id,
          name: contactData.name || 'Unknown',
          email: contactData.email || '',
          phone: contactData.phone || '',
          conversationId,
          lastMessage: conversation.last_message_preview || 'Click to view conversation',
          date: formattedDate,
          time: formattedTime,
          lastActivityTime: formattedTime,
          lastActivityDate: formattedDate,
          lastActivityTimestamp: timestamp,
          status: (conversation.status as 'active' | 'waiting' | 'closed') || 'active',
          unread: conversation.unread_count || 0,
          avatarColor: getAvatarColor(contactDoc.id),
          initials: self.getInitials(contactData.name || 'Unknown'),
          isStarred: conversation.is_starred || false
        });
      }

      callback(contacts);
    });
  }

  // Toggle star status for a conversation
  async toggleConversationStar(tenantId: string, contactId: string, conversationId: string, token: string): Promise<boolean> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/conversations/${contactId}/${conversationId}/toggle-star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle star status');
      }

      const result = await response.json();
      return result.isStarred;
    } catch (error) {
      console.error('Error toggling conversation star:', error);
      throw error;
    }
  }
}

export const conversationService = new ConversationService();