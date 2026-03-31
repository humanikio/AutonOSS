import { UIContactForManagement } from './contactManagementService';
import { UIContact, UIMessage, UIPhoneRecord } from './conversationService';

/**
 * ContactCacheService - Provides persistent caching for contacts across navigation
 * 
 * Features:
 * - In-memory caching with localStorage backup
 * - Automatic cache invalidation (30 minutes)
 * - Optimistic contact lookup
 * - Cross-component state sharing
 */
class ContactCacheService {
  private memoryCache = new Map<string, {
    contacts: UIContactForManagement[];
    conversationContacts: UIContact[];
    timestamp: number;
    tenantId: string;
  }>();
  
  private conversationCache = new Map<string, {
    contacts: UIContact[];
    timestamp: number;
    tenantId: string;
  }>();

  // New: Cache for individual conversation messages and phone records
  private conversationDataCache = new Map<string, {
    messages: UIMessage[];
    phoneRecords: UIPhoneRecord[];
    timestamp: number;
    tenantId: string;
    conversationId: string;
  }>();

  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly STORAGE_KEY_PREFIX = 'contacts_cache_';
  private readonly CONVERSATION_STORAGE_KEY_PREFIX = 'conversations_cache_';
  private readonly CONVERSATION_DATA_PREFIX = 'conversation_data_';
  private readonly LAST_SELECTED_PREFIX = 'last_selected_conversation_';

  // Event system for cache updates
  private listeners = new Set<(tenantId: string) => void>();

  /**
   * Get cached contacts for management (all contacts including those without conversations)
   */
  getManagementContacts(tenantId: string): UIContactForManagement[] | null {
    if (!tenantId) return null;

    // Check memory cache first
    const cached = this.memoryCache.get(tenantId);
    if (cached && this.isValidCache(cached.timestamp)) {
      console.log(`📦 Cache HIT: Retrieved ${cached.contacts.length} management contacts from memory`);
      return cached.contacts;
    }

    // Check localStorage backup
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${tenantId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.isValidCache(parsed.timestamp)) {
          // Restore Date objects that were serialized as strings
          const restoredContacts = this.restoreContactDates(parsed.contacts);
          const restoredEntry = {
            ...parsed,
            contacts: restoredContacts
          };
          
          // Restore to memory cache
          this.memoryCache.set(tenantId, restoredEntry);
          console.log(`💾 Cache HIT: Retrieved ${restoredContacts.length} management contacts from localStorage`);
          return restoredContacts;
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage cache:', error);
    }

    console.log(`❌ Cache MISS: No valid management contacts cache for tenant ${tenantId}`);
    return null;
  }

  /**
   * Cache contacts for management
   */
  setManagementContacts(tenantId: string, contacts: UIContactForManagement[]): void {
    if (!tenantId) return;

    const cacheEntry = {
      contacts,
      conversationContacts: this.memoryCache.get(tenantId)?.conversationContacts || [],
      timestamp: Date.now(),
      tenantId
    };

    // Update memory cache
    this.memoryCache.set(tenantId, cacheEntry);

    // Update localStorage backup
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${tenantId}`;
      localStorage.setItem(storageKey, JSON.stringify(cacheEntry));
      console.log(`💾 Cached ${contacts.length} management contacts for tenant ${tenantId}`);
    } catch (error) {
      console.warn('Failed to write to localStorage cache:', error);
    }

    // Notify listeners
    this.notifyListeners(tenantId);
  }

  /**
   * Get cached conversation contacts (only contacts with active conversations)
   */
  getConversationContacts(tenantId: string): UIContact[] | null {
    if (!tenantId) return null;

    // Check memory cache first
    const cached = this.conversationCache.get(tenantId);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.contacts;
    }

    // Check localStorage backup
    try {
      const storageKey = `${this.CONVERSATION_STORAGE_KEY_PREFIX}${tenantId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.isValidCache(parsed.timestamp)) {
          // Restore Date objects that were serialized as strings
          const restoredContacts = this.restoreConversationContactDates(parsed.contacts);
          const restoredEntry = {
            ...parsed,
            contacts: restoredContacts
          };
          
          // Restore to memory cache
          this.conversationCache.set(tenantId, restoredEntry);
          return restoredContacts;
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage cache:', error);
    }

    return null;
  }

  /**
   * Cache conversation contacts
   */
  setConversationContacts(tenantId: string, contacts: UIContact[]): void {
    if (!tenantId) return;

    const cacheEntry = {
      contacts,
      timestamp: Date.now(),
      tenantId
    };

    // Update memory cache
    this.conversationCache.set(tenantId, cacheEntry);

    // Update localStorage backup
    try {
      const storageKey = `${this.CONVERSATION_STORAGE_KEY_PREFIX}${tenantId}`;
      localStorage.setItem(storageKey, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Failed to write to localStorage cache:', error);
    }

    // Notify listeners
    this.notifyListeners(tenantId);
  }

  /**
   * Find a specific contact by ID from either cache
   */
  findContact(tenantId: string, contactId: string): UIContactForManagement | UIContact | null {
    if (!tenantId || !contactId) return null;

    // Check management contacts first
    const managementContacts = this.getManagementContacts(tenantId);
    if (managementContacts) {
      const found = managementContacts.find(c => c.id === contactId);
      if (found) {
        console.log(`🎯 Found contact ${contactId} in management cache`);
        return found;
      }
    }

    // Check conversation contacts
    const conversationContacts = this.getConversationContacts(tenantId);
    if (conversationContacts) {
      const found = conversationContacts.find(c => c.id === contactId);
      if (found) {
        console.log(`🎯 Found contact ${contactId} in conversation cache`);
        return found;
      }
    }

    console.log(`❌ Contact ${contactId} not found in any cache`);
    return null;
  }

  /**
   * Invalidate cache for a tenant (force refresh)
   */
  invalidateCache(tenantId: string): void {
    if (!tenantId) return;

    this.memoryCache.delete(tenantId);
    this.conversationCache.delete(tenantId);

    try {
      localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${tenantId}`);
      localStorage.removeItem(`${this.CONVERSATION_STORAGE_KEY_PREFIX}${tenantId}`);
      console.log(`🗑️ Invalidated all caches for tenant ${tenantId}`);
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }

    // Notify listeners
    this.notifyListeners(tenantId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.memoryCache.clear();
    this.conversationCache.clear();
    this.conversationDataCache.clear();

    try {
      // Clear all cache keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(this.STORAGE_KEY_PREFIX) || 
          key.startsWith(this.CONVERSATION_STORAGE_KEY_PREFIX) ||
          key.startsWith(this.CONVERSATION_DATA_PREFIX) ||
          key.startsWith(this.LAST_SELECTED_PREFIX)
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`🗑️ Cleared all contact and conversation caches`);
    } catch (error) {
      console.warn('Failed to clear localStorage caches:', error);
    }
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(listener: (tenantId: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(tenantId: string): {
    managementContacts: number;
    conversationContacts: number;
    managementCacheAge: number | null;
    conversationCacheAge: number | null;
  } {
    const managementCache = this.memoryCache.get(tenantId);
    const conversationCache = this.conversationCache.get(tenantId);
    const now = Date.now();

    return {
      managementContacts: managementCache?.contacts.length || 0,
      conversationContacts: conversationCache?.contacts.length || 0,
      managementCacheAge: managementCache ? now - managementCache.timestamp : null,
      conversationCacheAge: conversationCache ? now - conversationCache.timestamp : null,
    };
  }

  private isValidCache(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age < this.CACHE_DURATION;
  }

  private notifyListeners(tenantId: string): void {
    this.listeners.forEach(listener => {
      try {
        listener(tenantId);
      } catch (error) {
        console.error('Error in cache listener:', error);
      }
    });
  }

  /**
   * Restore Date objects for management contacts after localStorage deserialization
   */
  private restoreContactDates(contacts: any[]): UIContactForManagement[] {
    return contacts.map(contact => ({
      ...contact,
      lastActivityTimestamp: contact.lastActivityTimestamp ? new Date(contact.lastActivityTimestamp) : new Date()
    }));
  }

  /**
   * Restore Date objects for conversation contacts after localStorage deserialization
   */
  private restoreConversationContactDates(contacts: any[]): UIContact[] {
    return contacts.map(contact => ({
      ...contact,
      lastActivityTimestamp: contact.lastActivityTimestamp ? new Date(contact.lastActivityTimestamp) : new Date()
    }));
  }

  /**
   * Get cached conversation data (messages and phone records)
   */
  getConversationData(tenantId: string, conversationId: string): { messages: UIMessage[]; phoneRecords: UIPhoneRecord[] } | null {
    if (!tenantId || !conversationId) return null;

    const cacheKey = `${tenantId}_${conversationId}`;

    // Check memory cache first
    const cached = this.conversationDataCache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      console.log(`📦 Cache HIT: Retrieved ${cached.messages.length} messages and ${cached.phoneRecords.length} phone records from memory`);
      return { messages: cached.messages, phoneRecords: cached.phoneRecords };
    }

    // Check localStorage backup
    try {
      const storageKey = `${this.CONVERSATION_DATA_PREFIX}${cacheKey}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.isValidCache(parsed.timestamp)) {
          // Restore Date objects for messages and phone records
          const restoredMessages = this.restoreMessageDates(parsed.messages);
          const restoredPhoneRecords = this.restorePhoneRecordDates(parsed.phoneRecords);
          
          const restoredEntry = {
            ...parsed,
            messages: restoredMessages,
            phoneRecords: restoredPhoneRecords
          };
          
          // Restore to memory cache
          this.conversationDataCache.set(cacheKey, restoredEntry);
          console.log(`💾 Cache HIT: Retrieved ${restoredMessages.length} messages and ${restoredPhoneRecords.length} phone records from localStorage`);
          return { messages: restoredMessages, phoneRecords: restoredPhoneRecords };
        }
      }
    } catch (error) {
      console.warn('Failed to read conversation data from localStorage cache:', error);
    }

    console.log(`❌ Cache MISS: No valid conversation data cache for ${cacheKey}`);
    return null;
  }

  /**
   * Cache conversation data (messages and phone records)
   */
  setConversationData(tenantId: string, conversationId: string, messages: UIMessage[], phoneRecords: UIPhoneRecord[]): void {
    if (!tenantId || !conversationId) return;

    const cacheKey = `${tenantId}_${conversationId}`;
    const cacheEntry = {
      messages,
      phoneRecords,
      timestamp: Date.now(),
      tenantId,
      conversationId
    };

    // Update memory cache
    this.conversationDataCache.set(cacheKey, cacheEntry);

    // Update localStorage backup
    try {
      const storageKey = `${this.CONVERSATION_DATA_PREFIX}${cacheKey}`;
      localStorage.setItem(storageKey, JSON.stringify(cacheEntry));
      console.log(`💾 Cached ${messages.length} messages and ${phoneRecords.length} phone records for conversation ${conversationId}`);
    } catch (error) {
      console.warn('Failed to write conversation data to localStorage cache:', error);
    }

    // Notify listeners
    this.notifyListeners(tenantId);
  }

  /**
   * Invalidate conversation data cache for a specific conversation
   */
  invalidateConversationData(tenantId: string, conversationId: string): void {
    if (!tenantId || !conversationId) return;

    const cacheKey = `${tenantId}_${conversationId}`;
    this.conversationDataCache.delete(cacheKey);

    try {
      const storageKey = `${this.CONVERSATION_DATA_PREFIX}${cacheKey}`;
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Invalidated conversation data cache for ${conversationId}`);
    } catch (error) {
      console.warn('Failed to clear conversation data from localStorage:', error);
    }

    // Notify listeners
    this.notifyListeners(tenantId);
  }

  /**
   * Restore Date objects for messages after localStorage deserialization
   */
  private restoreMessageDates(messages: any[]): UIMessage[] {
    return messages.map(message => ({
      ...message,
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
    }));
  }

  /**
   * Restore Date objects for phone records after localStorage deserialization
   */
  private restorePhoneRecordDates(phoneRecords: any[]): UIPhoneRecord[] {
    return phoneRecords.map(record => ({
      ...record,
      timestamp: record.timestamp ? new Date(record.timestamp) : new Date()
    }));
  }

  /**
   * Get last selected conversation for a tenant
   */
  getLastSelectedConversation(tenantId: string): string | null {
    if (!tenantId) return null;

    try {
      const storageKey = `${this.LAST_SELECTED_PREFIX}${tenantId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Check if the selection is not too old (24 hours max)
        const age = Date.now() - parsed.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
          console.log(`📦 Last selected conversation: ${parsed.contactId} (${Math.round(age / 1000 / 60)} minutes ago)`);
          return parsed.contactId;
        } else {
          // Remove stale selection
          localStorage.removeItem(storageKey);
          console.log(`🗑️ Removed stale conversation selection (${Math.round(age / 1000 / 60 / 60)} hours old)`);
        }
      }
    } catch (error) {
      console.warn('Failed to read last selected conversation:', error);
    }

    return null;
  }

  /**
   * Set last selected conversation for a tenant
   */
  setLastSelectedConversation(tenantId: string, contactId: string): void {
    if (!tenantId || !contactId) return;

    try {
      const storageKey = `${this.LAST_SELECTED_PREFIX}${tenantId}`;
      const data = {
        contactId,
        timestamp: Date.now(),
        tenantId
      };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`💾 Saved last selected conversation: ${contactId}`);
    } catch (error) {
      console.warn('Failed to save last selected conversation:', error);
    }
  }

  /**
   * Clear last selected conversation for a tenant
   */
  clearLastSelectedConversation(tenantId: string): void {
    if (!tenantId) return;

    try {
      const storageKey = `${this.LAST_SELECTED_PREFIX}${tenantId}`;
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Cleared last selected conversation for tenant ${tenantId}`);
    } catch (error) {
      console.warn('Failed to clear last selected conversation:', error);
    }
  }
}

export const contactCacheService = new ContactCacheService();