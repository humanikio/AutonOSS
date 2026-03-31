import { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentSnapshot } from 'firebase/firestore';
import { contactManagementService, UIContactForManagement } from '../lib/services/contactManagementService';

export function useContactManagement(tenantId: string) {
  const [contacts, setContacts] = useState<UIContactForManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>();
  const [currentPageSize, setCurrentPageSize] = useState(20);
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UIContactForManagement[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial contacts with pagination
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📄 Loading initial contacts (page size: ${currentPageSize})`);

        // Get initial contacts for management with pagination
        const result = await contactManagementService.getAllContactsForManagement(tenantId, currentPageSize);
        setContacts(result.contacts);
        setHasMore(result.hasMore);
        setLastDoc(result.lastDoc);

        console.log(`📊 Loaded ${result.contacts.length} contacts, hasMore: ${result.hasMore}`);

        // Set up real-time listener (only for first page)
        unsubscribe = contactManagementService.onContactsChange(tenantId, (updatedContacts) => {
          console.log('🔄 Real-time update received, updating first page contacts');
          setContacts(prevContacts => {
            // Replace first page contacts while keeping any additional loaded contacts
            const additionalContacts = prevContacts.slice(currentPageSize);
            return [...updatedContacts, ...additionalContacts];
          });
        });

      } catch (err) {
        console.error('Error loading contacts:', err);
        setError('Failed to load contacts');
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
  }, [tenantId, currentPageSize]);

  // Handle search with debouncing inside the hook
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // If search query is empty, clear search immediately
    if (currentSearchQuery.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    // Set timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        console.log(`🔍 Searching contacts for: "${currentSearchQuery}"`);
        
        const results = await contactManagementService.searchAllContacts(tenantId, currentSearchQuery);
        setSearchResults(results);
        
        console.log(`🔍 Found ${results.length} matching contacts`);
      } catch (err) {
        console.error('Error searching contacts:', err);
        setError('Failed to search contacts');
        setIsSearching(false);
      }
    }, 300);

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [currentSearchQuery, tenantId]);

  // Load more contacts (pagination)
  const loadMoreContacts = useCallback(async () => {
    if (!hasMore || loadingMore || isSearching) return;
    
    try {
      setLoadingMore(true);
      console.log('📄 Loading more contacts...');
      
      const result = await contactManagementService.getAllContactsForManagement(tenantId, currentPageSize, lastDoc);
      
      setContacts(prevContacts => [...prevContacts, ...result.contacts]);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
      
      console.log(`📊 Loaded ${result.contacts.length} additional contacts, hasMore: ${result.hasMore}`);
    } catch (err) {
      console.error('Error loading more contacts:', err);
      setError('Failed to load more contacts');
    } finally {
      setLoadingMore(false);
    }
  }, [tenantId, currentPageSize, lastDoc, hasMore, loadingMore, isSearching]);

  // Set search query (triggers debounced search via useEffect)
  const setSearchQuery = useCallback((query: string) => {
    setCurrentSearchQuery(query);
  }, []);

  // Change page size and reload
  const changePageSize = useCallback(async (newPageSize: number) => {
    if (newPageSize === currentPageSize) return;
    
    try {
      setLoading(true);
      setCurrentPageSize(newPageSize);
      
      console.log(`📄 Changing page size to ${newPageSize}`);
      
      const result = await contactManagementService.getAllContactsForManagement(tenantId, newPageSize);
      setContacts(result.contacts);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
      
    } catch (err) {
      console.error('Error changing page size:', err);
      setError('Failed to change page size');
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentPageSize]);

  const refreshContacts = useCallback(async () => {
    try {
      console.log('🔄 Refreshing contacts for management, tenant:', tenantId);
      setLoading(true);
      
      // Reset pagination state
      const result = await contactManagementService.getAllContactsForManagement(tenantId, currentPageSize);
      setContacts(result.contacts);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
      
      console.log('📞 Refreshed contacts for management:', result.contacts.length, result.contacts.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
    } catch (err) {
      console.error('Error refreshing contacts:', err);
      setError('Failed to refresh contacts');
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentPageSize]);

  // Clear search function with useCallback to prevent infinite loops
  const clearSearch = useCallback(() => {
    setIsSearching(false);
    setSearchResults([]);
  }, []);

  // Get the contacts to display (search results if searching, otherwise regular contacts)
  const displayContacts = isSearching ? searchResults : contacts;

  return {
    contacts: displayContacts,
    loading,
    error,
    refreshContacts,
    // Pagination
    hasMore: isSearching ? false : hasMore, // No pagination for search results
    loadingMore,
    loadMoreContacts,
    currentPageSize,
    changePageSize,
    // Search
    isSearching,
    setSearchQuery,
    clearSearch
  };
}