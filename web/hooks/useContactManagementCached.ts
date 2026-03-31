import { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentSnapshot } from 'firebase/firestore';
import { contactManagementService, UIContactForManagement } from '../lib/services/contactManagementService';
import { contactCacheService } from '../lib/services/contactCacheService';

export function useContactManagementCached(tenantId: string) {
  const [contacts, setContacts] = useState<UIContactForManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page size state
  const [currentPageSize, setCurrentPageSize] = useState(20);
  const [isChangingPageSize, setIsChangingPageSize] = useState(false);

  // Page-based pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContactsCount, setTotalContactsCount] = useState<number>(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [pageCursors, setPageCursors] = useState<Map<number, DocumentSnapshot>>(new Map());
  const loadingPageRef = useRef(false);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UIContactForManagement[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cache state
  const [cacheHit, setCacheHit] = useState(false);

  // Calculate total pages
  const totalPages = Math.ceil(totalContactsCount / currentPageSize);

  // Load initial contacts with caching
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadContacts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get from cache first
        const cachedContacts = contactCacheService.getManagementContacts(tenantId);
        if (cachedContacts && cachedContacts.length > 0) {
          console.log(`⚡ FAST LOAD: Using cached contacts (${cachedContacts.length} contacts)`);
          setContacts(cachedContacts);
          setCacheHit(true);
          setLoading(false);

          // Fetch total count in background for pagination
          contactManagementService.getTotalContactsCount(tenantId).then(totalCount => {
            setTotalContactsCount(totalCount);
            console.log(`📊 Total contacts count (cached path): ${totalCount}`);
          }).catch(err => {
            console.error('Error fetching total count (cached path):', err);
          });

          // Fetch first page to get cursor for pagination
          contactManagementService.getAllContactsForManagement(tenantId, currentPageSize).then(result => {
            if (result.lastDoc) {
              setPageCursors(new Map([[1, result.lastDoc]]));
              console.log('📄 Set cursor for page 1 (cached path)');
            }
          }).catch(err => {
            console.error('Error fetching page cursor (cached path):', err);
          });

          // Still set up real-time listener for updates
          unsubscribe = contactManagementService.onContactsChange(tenantId, (updatedContacts) => {
            console.log('🔄 Real-time update received, updating cached contacts');
            setContacts(prevContacts => {
              // When using cache, we might have loaded more contacts via pagination
              // Keep any additional contacts that were loaded beyond the real-time scope
              if (prevContacts.length > updatedContacts.length) {
                const additionalContacts = prevContacts.slice(updatedContacts.length);
                const updatedIds = new Set(updatedContacts.map(c => c.id));
                const uniqueAdditionalContacts = additionalContacts.filter(c => !updatedIds.has(c.id));
                const combinedContacts = [...updatedContacts, ...uniqueAdditionalContacts];
                
                console.log(`🔄 Cache real-time: Preserving ${uniqueAdditionalContacts.length} additional paginated contacts`);
                contactCacheService.setManagementContacts(tenantId, combinedContacts);
                return combinedContacts;
              } else {
                // Simple replacement when no additional contacts exist
                contactCacheService.setManagementContacts(tenantId, updatedContacts);
                return updatedContacts;
              }
            });
          });
          
          return;
        }

        console.log(`🐌 SLOW LOAD: No cache, loading from database (page size: ${currentPageSize})`);
        setCacheHit(false);

        // Fetch total count for pagination
        const totalCount = await contactManagementService.getTotalContactsCount(tenantId);
        setTotalContactsCount(totalCount);
        console.log(`📊 Total contacts count: ${totalCount}`);

        // Get initial contacts for management with pagination
        const result = await contactManagementService.getAllContactsForManagement(tenantId, currentPageSize);
        setContacts(result.contacts);

        // Store cursor for page 1
        if (result.lastDoc) {
          setPageCursors(new Map([[1, result.lastDoc]]));
        }

        // Cache the results immediately
        contactCacheService.setManagementContacts(tenantId, result.contacts);

        console.log(`📊 Loaded ${result.contacts.length} contacts`);

        // Set up real-time listener (only for first page)
        unsubscribe = contactManagementService.onContactsChange(tenantId, (updatedContacts) => {
          console.log('🔄 Real-time update received, updating first page contacts');
          setContacts(prevContacts => {
            // Replace first page contacts while keeping any additional loaded contacts
            const additionalContacts = prevContacts.slice(currentPageSize);
            
            // Deduplicate to prevent overlaps between real-time updates and pagination
            const updatedIds = new Set(updatedContacts.map(c => c.id));
            const uniqueAdditionalContacts = additionalContacts.filter(c => !updatedIds.has(c.id));
            const newContacts = [...updatedContacts, ...uniqueAdditionalContacts];
            
            console.log(`🔄 Real-time deduplication: ${additionalContacts.length} additional, ${uniqueAdditionalContacts.length} unique, ${additionalContacts.length - uniqueAdditionalContacts.length} overlaps removed`);
            
            // Update cache
            contactCacheService.setManagementContacts(tenantId, newContacts);
            
            return newContacts;
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


  // Set search query (triggers debounced search via useEffect)
  const setSearchQuery = useCallback((query: string) => {
    setCurrentSearchQuery(query);
  }, []);

  // Monitor contacts changes to turn off page size loading after operation completes
  const contactsRef = useRef(contacts);
  const pageOperationRef = useRef<{pageSize: number, expectedCount: number} | null>(null);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    if (isChangingPageSize && pageOperationRef.current && contacts.length > 0) {
      // Check if we have the expected contacts from the page operation
      const { pageSize, expectedCount } = pageOperationRef.current;
      
      if (contacts.length >= Math.min(pageSize, expectedCount)) {
        // Wait a bit longer to ensure UI is fully rendered
        const timeoutId = setTimeout(() => {
          console.log(`📄 UI fully updated with ${contacts.length} contacts (expected ${expectedCount}), hiding loading animation`);
          setIsChangingPageSize(false);
          pageOperationRef.current = null;
        }, 1000); // Longer delay for safety
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [contacts.length, isChangingPageSize]);

  // Change page size and reload
  const changePageSize = useCallback(async (newPageSize: number) => {
    if (newPageSize === currentPageSize) return;

    try {
      setIsChangingPageSize(true);
      const oldPageSize = currentPageSize;
      const currentContactCount = contacts.length;

      console.log(`📄 Changing page size from ${oldPageSize} to ${newPageSize} (currently showing ${currentContactCount} contacts)`);

      // Reset to page 1 when changing page size
      setCurrentPage(1);
      setPageCursors(new Map());

      // Update page size first
      setCurrentPageSize(newPageSize);

      // Set expected count for loading animation monitoring
      pageOperationRef.current = { pageSize: newPageSize, expectedCount: newPageSize };

      // Fetch fresh data for the new page size
      const result = await contactManagementService.getAllContactsForManagement(tenantId, newPageSize);

      console.log(`📄 Page size change: Fetched ${result.contacts.length} contacts, replacing all ${currentContactCount} existing contacts`);

      // Update expected count with actual result
      pageOperationRef.current.expectedCount = result.contacts.length;

      // Store cursor for page 1
      if (result.lastDoc) {
        setPageCursors(new Map([[1, result.lastDoc]]));
      }

      // Clear cache and update with new data
      contactCacheService.invalidateCache(tenantId);
      contactCacheService.setManagementContacts(tenantId, result.contacts);

      // Update contacts - this will trigger a re-render and the useEffect will handle hiding loading
      setContacts(result.contacts);

      console.log(`📄 Page size change completed: Now showing ${result.contacts.length} contacts on page 1`);

    } catch (err) {
      console.error('Error changing page size:', err);
      setError('Failed to change page size');
      setIsChangingPageSize(false);
    }
  }, [tenantId, currentPageSize, contacts.length]);

  const refreshContacts = useCallback(async () => {
    try {
      console.log('🔄 Refreshing contacts for management, tenant:', tenantId);
      setLoading(true);

      // Invalidate cache first
      contactCacheService.invalidateCache(tenantId);

      // Reset state
      const result = await contactManagementService.getAllContactsForManagement(tenantId, currentPageSize);
      setContacts(result.contacts);
      setCacheHit(false);

      // Cache the fresh results
      contactCacheService.setManagementContacts(tenantId, result.contacts);

      console.log('📞 Refreshed contacts for management:', result.contacts.length, result.contacts.map(c => ({ id: c.id, name: c.name, phone: c.phone })));
    } catch (err) {
      console.error('Error refreshing contacts:', err);
      setError('Failed to refresh contacts');
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentPageSize]);

  const refreshSingleContact = useCallback(async (contactId: string): Promise<UIContactForManagement | null> => {
    try {
      console.log('🔄 Refreshing single contact:', contactId);

      // Fetch the specific contact from backend
      const contact = await contactManagementService.getContactById(tenantId, contactId);

      if (contact) {
        // Update in state - replace if exists, add to beginning if not
        setContacts(prev => {
          const index = prev.findIndex(c => c.id === contactId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = contact;
            console.log('📝 Updated existing contact in state at index', index);
            return updated;
          } else {
            console.log('📝 Added new contact to beginning of state');
            return [contact, ...prev];
          }
        });

        // Update cache with the modified contacts list
        const cachedContacts = contactCacheService.getManagementContacts(tenantId) || [];
        const cacheIndex = cachedContacts.findIndex(c => c.id === contactId);
        if (cacheIndex >= 0) {
          cachedContacts[cacheIndex] = contact;
        } else {
          cachedContacts.push(contact);
        }
        contactCacheService.setManagementContacts(tenantId, cachedContacts);

        console.log('✅ Single contact refreshed successfully');
        return contact;
      }

      return null;
    } catch (err) {
      console.error('Error refreshing single contact:', err);
      return null;
    }
  }, [tenantId]);

  // Clear search function with useCallback to prevent infinite loops
  const clearSearch = useCallback(() => {
    setIsSearching(false);
    setSearchResults([]);
    setCurrentSearchQuery('');
  }, []);

  // Optimized contact finder that uses cache
  const findContactById = useCallback((contactId: string): UIContactForManagement | null => {
    // First check current loaded contacts
    const found = contacts.find(c => c.id === contactId);
    if (found) return found;

    // Then check cache
    const cached = contactCacheService.findContact(tenantId, contactId);
    return cached && 'phone' in cached ? cached as UIContactForManagement : null;
  }, [contacts, tenantId]);

  // Page navigation functions
  const goToPage = useCallback(async (pageNumber: number) => {
    // Prevent concurrent page loads
    if (loadingPageRef.current) {
      console.log('⏭️ Already loading a page, skipping...');
      return;
    }

    if (pageNumber < 1 || pageNumber > totalPages) {
      console.warn(`⚠️ Invalid page number: ${pageNumber} (total pages: ${totalPages})`);
      return;
    }

    if (pageNumber === currentPage) {
      console.log(`⏭️ Already on page ${pageNumber}`);
      return;
    }

    try {
      loadingPageRef.current = true;
      setLoadingPage(true);
      setCurrentPage(pageNumber);
      console.log(`📄 Navigating to page ${pageNumber} of ${totalPages}`);

      // Calculate which cursor to use
      const cursorForPage = pageCursors.get(pageNumber - 1);

      // Fetch the page
      const result = await contactManagementService.getAllContactsForManagement(
        tenantId,
        currentPageSize,
        cursorForPage
      );

      setContacts(result.contacts);

      // Store the cursor for the next page
      if (result.lastDoc) {
        setPageCursors(prev => new Map(prev).set(pageNumber, result.lastDoc!));
      }

      console.log(`📄 Loaded page ${pageNumber}: ${result.contacts.length} contacts`);
    } catch (err) {
      console.error('Error loading page:', err);
      setError('Failed to load page');
    } finally {
      loadingPageRef.current = false;
      setLoadingPage(false);
    }
  }, [tenantId, currentPage, totalPages, currentPageSize, pageCursors]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  // Get the contacts to display (search results if searching, otherwise regular contacts)
  const displayContacts = isSearching ? searchResults : contacts;

  return {
    contacts: displayContacts,
    loading,
    error,
    refreshContacts,
    refreshSingleContact,
    currentPageSize,
    changePageSize,
    isChangingPageSize, // New loading state for page size changes
    // Pagination
    currentPage,
    totalPages,
    totalContactsCount,
    loadingPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    // Search
    isSearching,
    setSearchQuery,
    clearSearch,
    // Cache info
    cacheHit,
    // Optimized finder
    findContactById
  };
}