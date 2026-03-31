import { useState, useEffect, useCallback, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { conversationService, UIContact, UIMessage, UIPhoneRecord } from '../lib/services/conversationService';
import { contactCacheService } from '../lib/services/contactCacheService';

export function useConversations(tenantId: string, forcedContactId?: string) {
  const [contacts, setContacts] = useState<UIContact[]>([]);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [phoneRecords, setPhoneRecords] = useState<UIPhoneRecord[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false); // Track contact selection state
  const [cacheHit, setCacheHit] = useState(false); // Track if we loaded from cache
  const [autoSelected, setAutoSelected] = useState(false); // Track if we auto-selected

  // Pagination state for messages
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [oldestMessageCursor, setOldestMessageCursor] = useState<Timestamp | null>(null);

  // Pagination state for contacts
  const [hasMoreContacts, setHasMoreContacts] = useState(true);
  const [loadingMoreContacts, setLoadingMoreContacts] = useState(false);
  const [contactsCursor, setContactsCursor] = useState<any>(null); // DocumentSnapshot type

  // Ref to prevent concurrent contact loading
  const loadingContactsRef = useRef(false);

  // Total count state
  const [totalContactsCount, setTotalContactsCount] = useState<number>(0);

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  // Reset state when forcedContactId changes (for contact detail pages)
  useEffect(() => {
    if (forcedContactId && forcedContactId !== selectedContactId) {
      console.log(`🔄 Forced contact ID changed to ${forcedContactId}, resetting conversation state`);
      setMessages([]);
      setPhoneRecords([]);
      setSelectedContactId(null);
      setHasMoreMessages(true);
      setOldestMessageCursor(null);
      setSelecting(false);
      setError(null);
      setAutoSelected(false); // Reset auto-selection to allow new contact selection
    }
  }, [forcedContactId, selectedContactId]);

  // Clear conversation state (for contacts without conversations)
  const clearConversationState = useCallback(() => {
    console.log(`🧹 Manually clearing conversation state`);
    setMessages([]);
    setPhoneRecords([]);
    setSelectedContactId(null);
    setHasMoreMessages(true);
    setOldestMessageCursor(null);
    setSelecting(false);
    setError(null);
  }, []);

  // Load initial contacts with caching
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadContacts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get from cache first
        const cachedContacts = contactCacheService.getConversationContacts(tenantId);
        if (cachedContacts && cachedContacts.length > 0) {
          setContacts(cachedContacts);
          setCacheHit(true);
          setLoading(false);

          // IMPORTANT: Fetch pagination data in background so infinite scroll works
          conversationService.getContactsWithConversations(tenantId, 20).then(result => {
            // Set cursor and hasMore state for pagination
            setContactsCursor(result.lastDoc);
            setHasMoreContacts(result.hasMore);
            console.log('📇 Set pagination cursor from fresh fetch (cached path):', { hasMore: result.hasMore });
          }).catch(err => {
            console.error('Error fetching pagination data (cached path):', err);
          });

          // Fetch total count in background (even when using cache)
          conversationService.getTotalConversationsCount(tenantId).then(totalCount => {
            setTotalContactsCount(totalCount);
          }).catch(err => {
            console.error('Error fetching total count (cached path):', err);
          });

          // Still set up real-time listener for updates in background
          unsubscribe = conversationService.onContactsChange(tenantId, (updatedContacts) => {
            // IMPORTANT: The real-time listener only returns the first 50 contacts
            // We need to merge them with our paginated contacts WITHOUT replacing the full list
            setContacts(prev => {
              // If real-time update is empty (e.g., query error), don't update
              if (updatedContacts.length === 0) {
                console.log('🔄 Real-time update (cached) returned 0 contacts, keeping existing list');
                return prev;
              }

              const updatedIds = new Set(updatedContacts.map(c => c.id));

              // Keep paginated contacts that aren't in the real-time update (contacts 51+)
              const paginatedContacts = prev.filter(c => !updatedIds.has(c.id));

              // Merge: real-time updates (first 50) + paginated contacts (51+)
              const merged = [...updatedContacts, ...paginatedContacts];

              // Deduplicate by ID just in case
              const seen = new Set();
              const deduplicated = merged.filter(contact => {
                if (seen.has(contact.id)) {
                  console.warn(`⚠️ Duplicate contact detected (cached): ${contact.id} - ${contact.name}`);
                  return false;
                }
                seen.add(contact.id);
                return true;
              });

              console.log(`🔄 Real-time merge (cached): ${updatedContacts.length} updated + ${paginatedContacts.length} paginated = ${deduplicated.length} total (${merged.length - deduplicated.length} duplicates removed)`);

              // Don't cache here - only cache the first 50
              return deduplicated;
            });
          });
          
          return;
        }

        setCacheHit(false);

        // Get total count
        const totalCount = await conversationService.getTotalConversationsCount(tenantId);
        setTotalContactsCount(totalCount);

        // Get contacts with conversations only (for chat interfaces) - with pagination
        const result = await conversationService.getContactsWithConversations(tenantId, 20);
        setContacts(result.contacts);
        setHasMoreContacts(result.hasMore);
        setContactsCursor(result.lastDoc);

        // Cache the results immediately
        contactCacheService.setConversationContacts(tenantId, result.contacts);

        // Set up real-time listener
        unsubscribe = conversationService.onContactsChange(tenantId, (updatedContacts) => {
          // IMPORTANT: The real-time listener only returns the first 50 contacts
          // We need to merge them with our paginated contacts WITHOUT replacing the full list
          setContacts(prev => {
            // If real-time update is empty (e.g., query error), don't update
            if (updatedContacts.length === 0) {
              console.log('🔄 Real-time update returned 0 contacts, keeping existing list');
              return prev;
            }

            const updatedIds = new Set(updatedContacts.map(c => c.id));

            // Keep paginated contacts that aren't in the real-time update (contacts 51+)
            const paginatedContacts = prev.filter(c => !updatedIds.has(c.id));

            // Merge: real-time updates (first 50) + paginated contacts (51+)
            const merged = [...updatedContacts, ...paginatedContacts];

            // Deduplicate by ID just in case
            const seen = new Set();
            const deduplicated = merged.filter(contact => {
              if (seen.has(contact.id)) {
                console.warn(`⚠️ Duplicate contact detected: ${contact.id} - ${contact.name}`);
                return false;
              }
              seen.add(contact.id);
              return true;
            });

            console.log(`🔄 Real-time merge: ${updatedContacts.length} updated + ${paginatedContacts.length} paginated = ${deduplicated.length} total (${merged.length - deduplicated.length} duplicates removed)`);

            // Don't cache here - only cache the first 50
            return deduplicated;
          });
        });

      } catch (err) {
        console.error('Error loading conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      loadContacts();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [tenantId]);

  // Auto-select last conversation when contacts are loaded, or select forced contact
  useEffect(() => {
    if (!tenantId || !contacts.length || selectedContactId || autoSelected || selecting) {
      return;
    }

    // If we have a forced contact ID (from contact detail page), prioritize that
    if (forcedContactId) {
      const forcedContact = contacts.find(c => c.id === forcedContactId);
      if (forcedContact) {
        console.log(`🎯 Force-selecting contact from URL: ${forcedContact.name}`);
        setAutoSelected(true);
        setSelectedContactId(forcedContactId);
        contactCacheService.setLastSelectedConversation(tenantId, forcedContactId);
        return;
      } else {
        console.log(`⚠️ Forced contact ${forcedContactId} not found in conversations list`);
      }
    }

    console.log('🎯 Auto-selecting last conversation...');

    // Try to get last selected conversation
    const lastSelectedContactId = contactCacheService.getLastSelectedConversation(tenantId);
    
    if (lastSelectedContactId) {
      // Check if the last selected contact still exists in current contacts
      const lastContact = contacts.find(c => c.id === lastSelectedContactId);
      if (lastContact) {
        console.log(`⚡ INSTANT: Auto-selecting last conversation: ${lastContact.name}`);
        setAutoSelected(true);
        
        // Manually trigger contact selection without circular dependency
        setSelectedContactId(lastSelectedContactId);
        contactCacheService.setLastSelectedConversation(tenantId, lastSelectedContactId);
        return;
      } else {
        console.log(`⚠️ Last selected contact ${lastSelectedContactId} no longer exists`);
        // Clear stale selection
        contactCacheService.clearLastSelectedConversation(tenantId);
      }
    }

    // Fallback: Select most recent conversation (first in list)
    if (contacts.length > 0) {
      console.log(`📋 Fallback: Auto-selecting most recent conversation: ${contacts[0].name}`);
      setAutoSelected(true);
      
      // Manually trigger contact selection without circular dependency
      const fallbackContactId = contacts[0].id;
      setSelectedContactId(fallbackContactId);
      contactCacheService.setLastSelectedConversation(tenantId, fallbackContactId);
    }
  }, [tenantId, contacts, selectedContactId, autoSelected, selecting, forcedContactId]);

  // Load messages when contact is selected - but not during atomic selection
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadMessages = async () => {
      // Don't clear messages during atomic selection
      if (!selectedContactId || !selectedContact?.conversationId) {
        if (!selecting) {
          setMessages([]);
          setPhoneRecords([]);
          setHasMoreMessages(true);
          setOldestMessageCursor(null);
        }
        return;
      }

      // Skip loading if we're in the middle of an atomic selection (cache handles it)
      if (selecting) {
        return;
      }

      try {
        console.log(`📧 Loading initial messages for contact ${selectedContactId}`);
        
        // Get initial recent messages (50) and phone records
        const [initialMessages, initialPhoneRecords] = await Promise.all([
          conversationService.getRecentMessages(
            tenantId,
            selectedContactId,
            selectedContact.conversationId,
            50
          ),
          conversationService.getPhoneRecords(tenantId, selectedContactId)
        ]);
        
        setMessages(initialMessages);
        setPhoneRecords(initialPhoneRecords);
        
        // Set pagination state
        setHasMoreMessages(initialMessages.length === 50); // If we got 50, there might be more
        setOldestMessageCursor(
          initialMessages.length > 0 
            ? Timestamp.fromDate(initialMessages[0].timestamp) 
            : null
        );

        // Set up real-time listener for recent messages only
        unsubscribe = conversationService.onMessagesChange(
          tenantId,
          selectedContactId,
          selectedContact.conversationId,
          (recentMessages) => {
            // Smart merge: only add new messages not already in our list
            setMessages(currentMessages => {
              const existingIds = new Set(currentMessages.map(m => m.id));
              const newMessages = recentMessages.filter(m => !existingIds.has(m.id));
              
              if (newMessages.length > 0) {
                console.log(`📧 Adding ${newMessages.length} new real-time messages`);
                // Append new messages at the end (chronologically)
                return [...currentMessages, ...newMessages];
              }
              
              return currentMessages;
            });
          },
          50 // Only listen to recent 50 messages
        );

      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      }
    };

    loadMessages();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [tenantId, selectedContactId, selectedContact?.conversationId, selecting]);

  // Atomic contact selection with built-in caching and mark-as-read functionality
  const selectContact = useCallback(async (contactId: string, markAsReadCallback?: () => Promise<void>) => {
    if (selecting) return; // Prevent concurrent selections

    console.log(`👆 Starting atomic selection for contact ${contactId}`);
    setSelecting(true);
    setError(null);

    // CRITICAL: Immediately clear old contact data to prevent stale state bug
    console.log(`🧹 Clearing previous contact data to prevent stale state`);
    setMessages([]);
    setPhoneRecords([]);
    setHasMoreMessages(true);
    setOldestMessageCursor(null);

    try {
      // Step 1: Fetch fresh contact data from Firestore to get latest conversationId
      console.log(`🔄 Fetching fresh contact data from Firestore for ${contactId}`);
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase/firebase');

      const contactRef = doc(db, 'tenants', tenantId, 'contacts', contactId);
      const contactSnap = await getDoc(contactRef);

      if (!contactSnap.exists()) {
        throw new Error(`Contact ${contactId} not found in Firestore`);
      }

      const freshContactData = contactSnap.data();
      const conversationId = freshContactData.conversationId;

      console.log(`✅ Fresh contact data loaded, conversationId: ${conversationId || 'none'}`);

      // Step 2: Find the contact in our current list OR create a temporary one
      let contact = contacts.find(c => c.id === contactId);

      if (!contact) {
        console.log(`📝 Contact not in conversations list, creating temporary contact object from Firestore data`);
        // Create a temporary contact object from Firestore data
        const timestamp = freshContactData.updated_at?.toDate() || new Date();
        contact = {
          id: contactId,
          name: freshContactData.name || 'Unknown Contact',
          email: freshContactData.email,
          phone: freshContactData.phone,
          conversationId: conversationId,
          unread: 0,
          lastMessage: '',
          time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          date: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          lastActivityTime: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          lastActivityDate: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          lastActivityTimestamp: timestamp,
          status: 'active' as const,
          initials: (freshContactData.name || 'Unknown Contact').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
        };

        // Add to contacts state if conversationId exists
        if (conversationId) {
          setContacts(prev => [contact!, ...prev]);

          // Update cache
          const cachedContacts = contactCacheService.getConversationContacts(tenantId) || [];
          contactCacheService.setConversationContacts(tenantId, [contact!, ...cachedContacts]);
        }
      } else {
        // Update the contact in state with fresh conversationId if changed
        if (conversationId && contact.conversationId !== conversationId) {
          console.log(`📝 Updating contact with fresh conversationId: ${conversationId}`);
          contact = { ...contact, conversationId };

          // Update contacts state to reflect the fresh data
          setContacts(prev => prev.map(c => c.id === contactId ? contact! : c));

          // Update cache with fresh contact data
          const cachedContacts = contactCacheService.getConversationContacts(tenantId) || [];
          const updatedCache = cachedContacts.map(c => c.id === contactId ? contact! : c);
          contactCacheService.setConversationContacts(tenantId, updatedCache);
        }
      }

      if (!conversationId) {
        throw new Error(`Contact ${contactId} has no conversation`);
      }

      // Step 3: Optimistically set the selected contact
      setSelectedContactId(contactId);

      // Save this selection for next time
      contactCacheService.setLastSelectedConversation(tenantId, contactId);

      // Step 4: Try to load from cache first
      const cachedData = contactCacheService.getConversationData(tenantId, conversationId);
      
      if (cachedData) {
        console.log(`⚡ INSTANT LOAD: Using cached conversation data for ${conversationId}`);
        setMessages(cachedData.messages);
        setPhoneRecords(cachedData.phoneRecords);

        // Set pagination state based on cached data
        setHasMoreMessages(cachedData.messages.length === 50);
        setOldestMessageCursor(
          cachedData.messages.length > 0
            ? Timestamp.fromDate(cachedData.messages[0].timestamp)
            : null
        );

        // Still handle mark-as-read if needed
        if (markAsReadCallback && contact.unread > 0) {
          console.log(`📖 Marking conversation as read for cached data`);
          try {
            await markAsReadCallback();
          } catch (error) {
            console.warn('Failed to mark as read:', error);
          }
        }

        setSelecting(false);
        return;
      }

      // Step 5: No cache, load from database
      console.log(`🐌 SLOW LOAD: Loading conversation data from database for ${conversationId}`);
      const promises: Promise<any>[] = [
        conversationService.getRecentMessages(tenantId, contactId, conversationId, 50),
        conversationService.getPhoneRecords(tenantId, contactId)
      ];
      
      // Add mark-as-read callback to the atomic operation if provided
      if (markAsReadCallback && contact.unread > 0) {
        console.log(`📖 Including mark-as-read in atomic operation for ${contact.unread} unread messages`);
        promises.push(markAsReadCallback());
      }
      
      const results = await Promise.all(promises);
      const [initialMessages, initialPhoneRecords] = results;

      // Step 6: Update all state atomically
      setMessages(initialMessages);
      setPhoneRecords(initialPhoneRecords);

      // Cache the loaded data for next time
      contactCacheService.setConversationData(tenantId, conversationId, initialMessages, initialPhoneRecords);
      
      // Set pagination state
      setHasMoreMessages(initialMessages.length === 50);
      setOldestMessageCursor(
        initialMessages.length > 0 
          ? Timestamp.fromDate(initialMessages[0].timestamp) 
          : null
      );
      
      console.log(`✅ Atomic selection completed for contact ${contactId} (cached for next time)`);
      
    } catch (err) {
      console.error(`❌ Atomic selection failed for contact ${contactId}:`, err);
      setError(`Failed to select contact: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Rollback on failure
      setSelectedContactId(null);
      setMessages([]);
      setPhoneRecords([]);
    } finally {
      setSelecting(false);
    }
  }, [contacts, tenantId, selecting]);

  const loadMoreMessages = useCallback(async () => {
    if (!selectedContactId || !selectedContact?.conversationId || !oldestMessageCursor || loadingMoreMessages || !hasMoreMessages) {
      return;
    }

    try {
      setLoadingMoreMessages(true);
      console.log(`📧 Loading more messages before cursor for contact ${selectedContactId}`);
      
      const olderMessages = await conversationService.getMessagesBefore(
        tenantId,
        selectedContactId,
        selectedContact.conversationId,
        oldestMessageCursor,
        50
      );

      if (olderMessages.length > 0) {
        // Prepend older messages to the beginning of the array
        setMessages(currentMessages => {
          const updatedMessages = [...olderMessages, ...currentMessages];
          
          // Update cache with the expanded message list
          if (selectedContact?.conversationId) {
            contactCacheService.setConversationData(tenantId, selectedContact.conversationId, updatedMessages, phoneRecords);
          }
          
          return updatedMessages;
        });
        
        // Update cursor to the oldest message we just loaded
        setOldestMessageCursor(Timestamp.fromDate(olderMessages[0].timestamp));
        
        // If we got fewer than 50 messages, we've reached the end
        if (olderMessages.length < 50) {
          setHasMoreMessages(false);
        }
        
        console.log(`📧 Loaded ${olderMessages.length} older messages and updated cache`);
      } else {
        // No more messages available
        setHasMoreMessages(false);
        console.log(`📧 No more older messages available`);
      }
      
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError('Failed to load more messages');
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [tenantId, selectedContactId, selectedContact?.conversationId, oldestMessageCursor, loadingMoreMessages, hasMoreMessages]);

  const loadMoreContacts = useCallback(async () => {
    // Use ref to prevent concurrent calls (state updates are async)
    if (loadingContactsRef.current) {
      console.log('⏭️ Already loading contacts, skipping...');
      return;
    }

    if (!contactsCursor || loadingMoreContacts || !hasMoreContacts) {
      console.log('⏭️ Cannot load more:', { hasCursor: !!contactsCursor, loadingMoreContacts, hasMoreContacts });
      return;
    }

    try {
      loadingContactsRef.current = true;
      setLoadingMoreContacts(true);
      console.log(`📇 Loading more contacts after cursor`);

      const result = await conversationService.getContactsWithConversations(tenantId, 20, contactsCursor);

      if (result.contacts.length > 0) {
        // Append new contacts to the list
        setContacts(currentContacts => {
          const updatedContacts = [...currentContacts, ...result.contacts];

          // Update cache with expanded contacts
          contactCacheService.setConversationContacts(tenantId, updatedContacts);

          return updatedContacts;
        });

        // Update cursor and hasMore state
        setContactsCursor(result.lastDoc);
        setHasMoreContacts(result.hasMore);

        console.log(`📇 Loaded ${result.contacts.length} more contacts, hasMore: ${result.hasMore}`);
      } else {
        // No more contacts available
        setHasMoreContacts(false);
        console.log(`📇 No more contacts available`);
      }
    } catch (err) {
      console.error('Error loading more contacts:', err);
      setError('Failed to load more contacts');
    } finally {
      loadingContactsRef.current = false;
      setLoadingMoreContacts(false);
    }
  }, [tenantId, contactsCursor, loadingMoreContacts, hasMoreContacts]);

  const refreshContacts = useCallback(async () => {
    try {
      console.log('🔄 Refreshing contacts for tenant:', tenantId);
      setLoading(true);

      // Get total count
      const totalCount = await conversationService.getTotalConversationsCount(tenantId);
      setTotalContactsCount(totalCount);

      // Get first page of contacts
      const result = await conversationService.getContactsWithConversations(tenantId, 20);
      console.log('📞 Found contacts:', result.contacts.length, result.contacts.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
      setContacts(result.contacts);
      setHasMoreContacts(result.hasMore);
      setContactsCursor(result.lastDoc);

      contactCacheService.setConversationContacts(tenantId, result.contacts);
    } catch (err) {
      console.error('Error refreshing contacts:', err);
      setError('Failed to refresh contacts');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  return {
    contacts,
    messages,
    phoneRecords,
    selectedContact,
    selectedContactId,
    loading,
    error,
    selecting, // Export the selection state
    selectContact,
    refreshContacts,
    clearConversationState, // Export the clear function
    // Message pagination
    hasMoreMessages,
    loadingMoreMessages,
    loadMoreMessages,
    // Contact pagination
    hasMoreContacts,
    loadingMoreContacts,
    loadMoreContacts,
    totalContactsCount,
    // Cache info
    cacheHit,
    autoSelected // Export auto-selection state
  };
}