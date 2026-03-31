'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useContactManagementCached } from '@/hooks/useContactManagementCached';
import { Search, Filter, ChevronDown, Phone, Mail, MessageSquare, MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, X, User, Upload, Trash2, AlertTriangle, Zap } from 'lucide-react';
import BulkUpload from '@/components/contacts/BulkUpload';
import EnrollWorkflowModal from './components/EnrollWorkflowModal';

export default function ContactsPage() {
  const router = useRouter();
  const { tenant, isAuthenticated, getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortFilter, setSortFilter] = useState<string>('recent');
  const [contactTypeFilter, setContactTypeFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEnrollWorkflowModal, setShowEnrollWorkflowModal] = useState(false);
  
  // Get contacts for management with pagination, search and caching
  const {
    contacts,
    loading: contactsLoading,
    error,
    refreshContacts,
    currentPageSize,
    changePageSize,
    isChangingPageSize,
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
    setSearchQuery: setSearchQueryInHook,
    clearSearch,
    // Cache info
    cacheHit
  } = useContactManagementCached(tenant?.id || '');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Update search query in hook when local searchQuery changes
  useEffect(() => {
    setSearchQueryInHook(searchQuery);
  }, [searchQuery, setSearchQueryInHook]);

  // Filter and sort contacts differently based on whether we're searching
  const filteredAndSortedContacts = isSearching 
    ? // When searching, only sort (don't filter - search already found matching contacts)
      contacts.sort((a, b) => {
        if (sortFilter === 'recent') {
          const aTime = a.lastActivityTimestamp instanceof Date ? a.lastActivityTimestamp.getTime() : new Date(a.lastActivityTimestamp).getTime();
          const bTime = b.lastActivityTimestamp instanceof Date ? b.lastActivityTimestamp.getTime() : new Date(b.lastActivityTimestamp).getTime();
          return bTime - aTime;
        } else if (sortFilter === 'oldest') {
          const aTime = a.lastActivityTimestamp instanceof Date ? a.lastActivityTimestamp.getTime() : new Date(a.lastActivityTimestamp).getTime();
          const bTime = b.lastActivityTimestamp instanceof Date ? b.lastActivityTimestamp.getTime() : new Date(b.lastActivityTimestamp).getTime();
          return aTime - bTime;
        } else if (sortFilter === 'name_asc') {
          return a.name.localeCompare(b.name);
        } else if (sortFilter === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      })
    : // When not searching, apply filters AND sorting to the current page
      contacts.filter(contact => {
        // Contact type filter (only applied when not searching)
        let matchesType = true;
        if (contactTypeFilter === 'has_phone') {
          matchesType = !!(contact.phone && contact.phone.trim() !== '');
        } else if (contactTypeFilter === 'has_email') {
          matchesType = !!(contact.email && contact.email.trim() !== '');
        } else if (contactTypeFilter === 'has_both') {
          matchesType = !!(contact.phone && contact.phone.trim() !== '' && contact.email && contact.email.trim() !== '');
        }
        
        return matchesType;
      }).sort((a, b) => {
        // Sort filter
        if (sortFilter === 'recent') {
          const aTime = a.lastActivityTimestamp instanceof Date ? a.lastActivityTimestamp.getTime() : new Date(a.lastActivityTimestamp).getTime();
          const bTime = b.lastActivityTimestamp instanceof Date ? b.lastActivityTimestamp.getTime() : new Date(b.lastActivityTimestamp).getTime();
          return bTime - aTime;
        } else if (sortFilter === 'oldest') {
          const aTime = a.lastActivityTimestamp instanceof Date ? a.lastActivityTimestamp.getTime() : new Date(a.lastActivityTimestamp).getTime();
          const bTime = b.lastActivityTimestamp instanceof Date ? b.lastActivityTimestamp.getTime() : new Date(b.lastActivityTimestamp).getTime();
          return aTime - bTime;
        } else if (sortFilter === 'name_asc') {
          return a.name.localeCompare(b.name);
        } else if (sortFilter === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });

  // Use filtered contacts directly (no client-side pagination)
  const displayContacts = filteredAndSortedContacts;

  // Format time ago for last activity
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - timestamp.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '1 hour ago';
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedContacts.length === displayContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(displayContacts.map(c => c.id));
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    console.log(`📄 UI: Page size changing from ${currentPageSize} to ${newSize}`);
    changePageSize(newSize);
  };

  // Handle create contact form submission
  const handleCreateContact = async () => {
    if (!tenant?.id || !createFormData.phoneNumber.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const token = await getToken();
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: createFormData.phoneNumber.trim(),
          name: createFormData.name.trim() || undefined,
          email: createFormData.email.trim() || undefined,
          notes: createFormData.notes.trim() || undefined
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const result = await response.json();
        console.log('Contact created successfully:', result);
        setShowCreateModal(false);
        setCreateFormData({ name: '', phoneNumber: '', email: '', notes: '' });
        
        // Wait a moment then refresh
        console.log('Refreshing contacts...');
        setTimeout(() => {
          refreshContacts();
        }, 1000);
      } else {
        console.error('Response not ok. Status:', response.status);
        try {
          const error = await response.json();
          console.error('Failed to create contact:', error);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('Failed to parse error response:', parseError);
          console.error('Raw error response:', errorText);
        }
        // You might want to show an error toast here
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      // You might want to show an error toast here
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreateFormData({ name: '', phoneNumber: '', email: '', notes: '' });
  };

  // Handle enroll in workflow with validation
  const handleEnrollClick = () => {
    if (selectedContacts.length > 50) {
      alert('You can only enroll up to 50 contacts at a time. Please select 50 or fewer contacts.');
      return;
    }
    setShowEnrollWorkflowModal(true);
  };

  // Handle bulk delete contacts
  const handleBulkDelete = async () => {
    if (!tenant?.id || selectedContacts.length === 0) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contactIds: selectedContacts
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Successfully deleted ${result.deleted} contacts`);
        
        // Clear selection and refresh contacts
        setSelectedContacts([]);
        setShowBulkDeleteModal(false);
        refreshContacts();
      } else {
        const error = await response.json();
        console.error('Failed to delete contacts:', error);
        // You might want to show an error toast here
      }
    } catch (error) {
      console.error('Error deleting contacts:', error);
      // You might want to show an error toast here
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading state (but not if we have cache data)
  if (contactsLoading && !cacheHit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-48">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-full bg-black overflow-hidden mb-4">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/loading/loadingVideo.mp4" type="video/mp4" />
            </video>
          </div>
          <span className="text-gray-600 text-lg">{cacheHit ? 'Loading from cache...' : 'Loading contacts...'}</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={refreshContacts}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Contacts</h1>
            <p className="mt-2 text-gray-500">Manage your contact database</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-primary-200 text-primary-500 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <Upload className="h-5 w-5 text-primary-500" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-5 w-5 text-white" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-500" />
            <input
              type="text"
              placeholder="Quick search"
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white border border-primary-200 rounded-lg flex items-center gap-2 hover:bg-primary-50 text-sm text-primary-500"
          >
            Filters
            <Filter className="h-4 w-4 text-primary-500" />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="recent">Most Recent Activity</option>
                  <option value="oldest">Oldest Activity</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Contact Type:</label>
                <select
                  value={contactTypeFilter}
                  onChange={(e) => setContactTypeFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Contacts</option>
                  <option value="has_phone">Has Phone Number</option>
                  <option value="has_email">Has Email</option>
                  <option value="has_both">Has Both</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  setSortFilter('recent');
                  setContactTypeFilter('all');
                  setSearchQuery('');
                }}
                className="px-3 py-1 text-sm text-primary-500 hover:text-primary-600 border border-primary-200 rounded hover:bg-primary-50 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar - Sticky */}
        {selectedContacts.length > 0 && (
          <div className="sticky top-0 z-40 mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between shadow-md backdrop-blur-sm bg-primary-50/95">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                <span className="text-sm font-medium text-primary-700">{selectedContacts.length}</span>
              </div>
              <span className="text-sm font-medium text-primary-900">
                {selectedContacts.length === 1 ? '1 contact selected' : `${selectedContacts.length} contacts selected`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedContacts([])}
                className="px-3 py-1 text-sm text-primary-500 hover:text-primary-600 border border-primary-200 rounded hover:bg-primary-50 transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleEnrollClick}
                className="px-3 py-1 text-sm text-primary-500 hover:text-primary-600 border border-primary-200 rounded hover:bg-primary-50 transition-colors flex items-center gap-1"
              >
                <Zap className="h-4 w-4 text-primary-500" />
                Add to Workflow
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Results count and pagination info */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              Showing <strong>{displayContacts.length}</strong> of <strong>{totalContactsCount}</strong> contacts
              {isSearching ? ' (search results)' : ` (Page ${currentPage} of ${totalPages})`}
            </span>

            {/* Search status indicator */}
            {isSearching && (
              <span className="text-primary-500 text-sm">
                🔍 Searching all contacts
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Loading animation for page size changes */}
            {(contactsLoading || isChangingPageSize || loadingPage) && (
              <div className="flex items-center gap-2 text-sm text-primary-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                <span>
                  {isChangingPageSize ? 'Updating page size...' : loadingPage ? 'Loading page...' : 'Loading contacts...'}
                </span>
              </div>
            )}

            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span>Page Size:</span>
              <select
                value={currentPageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={isSearching || contactsLoading || isChangingPageSize || loadingPage} // Disable during search, loading, or page operations
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === displayContacts.length && displayContacts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayContacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/contacts/details/${contact.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContacts([...selectedContacts, contact.id]);
                        } else {
                          setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium bg-primary-600">
                        {contact.initials}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-primary-500">
                      <Phone className="h-4 w-4 mr-2 text-primary-500" />
                      {contact.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-primary-500">
                      <Mail className="h-4 w-4 mr-2 text-primary-500" />
                      {contact.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{contact.date}</div>
                    <div className="text-xs text-primary-500">{contact.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-primary-500">
                      <MessageSquare className="h-4 w-4 mr-2 text-primary-500" />
                      {formatTimeAgo(contact.lastActivityTimestamp)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === contact.id ? null : contact.id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5 text-primary-500" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === contact.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/contacts/details/${contact.id}`);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4 text-primary-500" />
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isSearching && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1 || loadingPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || loadingPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 7;

                  if (totalPages <= maxVisiblePages) {
                    // Show all pages if total is small
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Smart pagination with ellipsis
                    if (currentPage <= 4) {
                      // Near start: 1 2 3 4 5 ... 20
                      for (let i = 1; i <= 5; i++) pages.push(i);
                      pages.push(-1); // ellipsis
                      pages.push(totalPages);
                    } else if (currentPage >= totalPages - 3) {
                      // Near end: 1 ... 16 17 18 19 20
                      pages.push(1);
                      pages.push(-1); // ellipsis
                      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                    } else {
                      // Middle: 1 ... 8 9 10 ... 20
                      pages.push(1);
                      pages.push(-1); // ellipsis
                      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                      pages.push(-2); // ellipsis
                      pages.push(totalPages);
                    }
                  }

                  return pages.map((page, index) => {
                    if (page === -1 || page === -2) {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        disabled={loadingPage}
                        className={`px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:cursor-not-allowed ${
                          currentPage === page
                            ? 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600'
                            : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Next Page */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages || loadingPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages || loadingPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAndSortedContacts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mt-4">
            <p className="text-gray-500">No contacts found</p>
            {(searchQuery || contactTypeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setContactTypeFilter('all');
                  setSortFilter('recent');
                }}
                className="mt-4 text-sm text-primary-500 hover:text-primary-600"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Create Contact Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-full">
                    <User className="h-5 w-5 text-primary-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Add New Contact</h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isCreating}
                >
                  <X className="h-6 w-6 text-primary-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Name Field */}
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

                {/* Phone Number Field */}
                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={createFormData.phoneNumber}
                    onChange={(e) => setCreateFormData({ ...createFormData, phoneNumber: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="contact@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isCreating}
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateContact}
                  disabled={isCreating || !createFormData.phoneNumber.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 text-white" />
                      Create Contact
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <BulkUpload
            onClose={() => setShowBulkUpload(false)}
            onSuccess={() => {
              refreshContacts();
              setShowBulkUpload(false);
            }}
          />
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Modal Header */}
              <div className="flex items-center gap-3 p-6 border-b border-gray-200">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Delete Contacts</h2>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-gray-700">
                  Are you sure you want to delete{' '}
                  <strong className="text-red-600">
                    {selectedContacts.length === 1 
                      ? '1 contact' 
                      : `${selectedContacts.length} contacts`
                    }
                  </strong>
                  ? This will permanently remove {selectedContacts.length === 1 ? 'this contact' : 'these contacts'} and all associated conversation history.
                </p>
                
                {selectedContacts.length <= 3 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">Contacts to be deleted:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {selectedContacts.map(contactId => {
                        const contact = contacts.find(c => c.id === contactId);
                        return (
                          <li key={contactId} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            {contact?.name || 'Unknown Contact'}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 text-white" />
                      Delete {selectedContacts.length === 1 ? 'Contact' : 'Contacts'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Enroll in Workflow Modal */}
      {showEnrollWorkflowModal && (
        <EnrollWorkflowModal
          isOpen={showEnrollWorkflowModal}
          onClose={() => setShowEnrollWorkflowModal(false)}
          selectedContactIds={selectedContacts}
          onComplete={() => {
            setSelectedContacts([]);
            setShowEnrollWorkflowModal(false);
          }}
        />
      )}
      </div>
    </div>
  );
}