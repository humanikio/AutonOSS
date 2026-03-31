import { useState, useEffect, useCallback, useRef } from 'react';
import { attendeeContactService, UIContactForAttendee } from '../lib/services/attendeeContactService';

export function useAttendeeContacts(tenantId: string) {
  const [contacts, setContacts] = useState<UIContactForAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page size state
  const [currentPageSize, setCurrentPageSize] = useState(20);
  const [isChangingPageSize, setIsChangingPageSize] = useState(false);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UIContactForAttendee[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`📞 Loading ${currentPageSize} contacts for attendee selection`);

        const result = await attendeeContactService.getAllContactsForAttendees(tenantId, currentPageSize);
        setContacts(result.contacts);

        console.log(`📊 Loaded ${result.contacts.length} contacts for attendee selection`);
      } catch (err) {
        console.error('Error loading contacts for attendees:', err);
        setError('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      loadContacts();
    }
  }, [tenantId, currentPageSize]);

  // Handle search with debouncing
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
        console.log(`🔍 Searching attendee contacts for: "${currentSearchQuery}"`);

        const results = await attendeeContactService.searchContacts(tenantId, currentSearchQuery);
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
        // Wait a bit to ensure UI is fully rendered
        const timeoutId = setTimeout(() => {
          console.log(`📄 UI fully updated with ${contacts.length} contacts (expected ${expectedCount}), hiding loading animation`);
          setIsChangingPageSize(false);
          pageOperationRef.current = null;
        }, 500);

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

      // Update page size first
      setCurrentPageSize(newPageSize);

      // Set expected count for loading animation monitoring
      pageOperationRef.current = { pageSize: newPageSize, expectedCount: newPageSize };

      // Fetch fresh data for the new page size
      const result = await attendeeContactService.getAllContactsForAttendees(tenantId, newPageSize);

      console.log(`📄 Page size change: Fetched ${result.contacts.length} contacts, replacing all ${currentContactCount} existing contacts`);

      // Update expected count with actual result
      pageOperationRef.current.expectedCount = result.contacts.length;

      // Update contacts
      setContacts(result.contacts);

      console.log(`📄 Page size change completed: Now showing ${result.contacts.length} contacts`);

    } catch (err) {
      console.error('Error changing page size:', err);
      setError('Failed to change page size');
      setIsChangingPageSize(false);
    }
  }, [tenantId, currentPageSize, contacts.length]);

  const refreshContacts = useCallback(async () => {
    try {
      console.log('🔄 Refreshing contacts for attendee selection, tenant:', tenantId);
      setLoading(true);

      const result = await attendeeContactService.getAllContactsForAttendees(tenantId, currentPageSize);
      setContacts(result.contacts);

      console.log('📞 Refreshed contacts for attendee selection:', result.contacts.length);
    } catch (err) {
      console.error('Error refreshing contacts:', err);
      setError('Failed to refresh contacts');
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentPageSize]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setIsSearching(false);
    setSearchResults([]);
    setCurrentSearchQuery('');
  }, []);

  // Get the contacts to display (search results if searching, otherwise regular contacts)
  const displayContacts = isSearching ? searchResults : contacts;

  return {
    contacts: displayContacts,
    loading,
    error,
    refreshContacts,
    currentPageSize,
    changePageSize,
    isChangingPageSize,
    // Search
    isSearching,
    setSearchQuery,
    clearSearch
  };
}
