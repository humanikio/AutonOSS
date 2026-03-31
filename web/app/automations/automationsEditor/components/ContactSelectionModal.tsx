'use client';

import { useState } from 'react';
import { X, Search, User, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendeeContacts } from '@/hooks/useAttendeeContacts';

interface ContactSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  }) => void;
}

export default function ContactSelectionModal({
  isOpen,
  onClose,
  onSelectContact
}: ContactSelectionModalProps) {
  const { currentTenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Get contacts for selection with pagination and search
  const {
    contacts,
    loading,
    error,
    currentPageSize,
    changePageSize,
    isChangingPageSize,
    isSearching,
    setSearchQuery: setSearchQueryInHook,
    clearSearch
  } = useAttendeeContacts(currentTenantId || '');

  if (!isOpen) return null;

  // Update search query in hook when local searchQuery changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSearchQueryInHook(value);
  };

  const handleSelectContact = (contact: typeof contacts[0]) => {
    const selectedContact = {
      id: contact.id,
      name: contact.name,
      email: contact.email || undefined,
      phone: contact.phone || undefined,
    };

    onSelectContact(selectedContact);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    clearSearch();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-light text-gray-900">Select Contact</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && !contacts.length ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Loading contacts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">No contacts found</p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    clearSearch();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                <span>
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                  {isSearching && ' (searching...)'}
                </span>
                <select
                  value={currentPageSize}
                  onChange={(e) => changePageSize(parseInt(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSearching || loading || isChangingPageSize}
                >
                  <option value={20}>Show 20</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                </select>
              </div>

              {/* Contact Cards */}
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
                  >
                    {/* Avatar */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 ${contact.avatarColor}`}
                    >
                      {contact.initials}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-0.5">
                        {contact.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        {contact.email && (
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Select Indicator */}
                    <div className="flex-shrink-0">
                      <div className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        Select
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {contacts.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <p className="text-xs text-gray-500 text-center">
              Click on a contact to select for testing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
