'use client';

import { useState, useEffect } from 'react';
import { UserCircle, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { customFieldsAPI, CustomFieldDefinition } from '@/lib/api/customFields';

interface ContactField {
  name: string;
  displayName: string;
  type: string;
  description?: string;
  isSystemField: boolean;
}

interface ContactFieldInserterProps {
  onInsertField: (fieldPlaceholder: string) => void;
}

export default function ContactFieldInserter({ onInsertField }: ContactFieldInserterProps) {
  const { getToken } = useAuth();
  const [standardFields, setStandardFields] = useState<ContactField[]>([]);
  const [customFields, setCustomFields] = useState<ContactField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load all contact fields (system + custom) from backend
  useEffect(() => {
    async function loadContactFields() {
      try {
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          setLoading(false);
          return;
        }

        // Fetch all contact fields (system + custom) from backend
        const response = await customFieldsAPI.getAllFields(token, {
          entityScope: 'contact',
          includeSystem: true
        });

        // Separate system fields from custom fields
        const systemFields: ContactField[] = [];
        const userCustomFields: ContactField[] = [];

        response.fields.forEach((field: CustomFieldDefinition) => {
          const contactField: ContactField = {
            name: field.name,
            displayName: field.displayName,
            type: field.type,
            description: field.description,
            isSystemField: field.isSystemField
          };

          if (field.isSystemField) {
            systemFields.push(contactField);
          } else {
            userCustomFields.push(contactField);
          }
        });

        setStandardFields(systemFields);
        setCustomFields(userCustomFields);
      } catch (error) {
        console.error('Error loading contact fields:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContactFields();
  }, [getToken]);

  const handleFieldSelect = (fieldName: string) => {
    // Insert contact field placeholder syntax
    const placeholder = `{{$contact.${fieldName}}}`;
    onInsertField(placeholder);
    setShowDropdown(false);
    setSearchQuery('');
  };

  // Filter fields based on search query
  const filteredStandardFields = standardFields.filter(field =>
    field.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomFields = customFields.filter(field =>
    field.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Insert Field Button */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
        title="Insert contact field"
      >
        <UserCircle className="w-4 h-4" />
        <span className="font-medium">Insert Field</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Insert Contact Field
              </h3>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Fields List */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading fields...
                </div>
              ) : (
                <>
                  {/* Standard Contact Fields Section */}
                  {filteredStandardFields.length > 0 && (
                    <div className="mb-3">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Standard Fields
                      </div>
                      <div className="space-y-1">
                        {filteredStandardFields.map((field) => (
                          <button
                            key={field.name}
                            onClick={() => handleFieldSelect(field.name)}
                            className="w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-md transition-colors group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {field.displayName}
                                </div>
                                {field.description && (
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {field.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-blue-600 mt-1.5 font-mono bg-blue-50 px-2 py-1 rounded inline-block">
                              {`{{$contact.${field.name}}}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Fields Section */}
                  {filteredCustomFields.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-purple-600 uppercase tracking-wide">
                        Custom Fields
                      </div>
                      <div className="space-y-1">
                        {filteredCustomFields.map((field) => (
                          <button
                            key={field.name}
                            onClick={() => handleFieldSelect(field.name)}
                            className="w-full px-3 py-2.5 text-left hover:bg-purple-50 rounded-md transition-colors group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {field.displayName}
                                </div>
                                {field.description && (
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {field.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-purple-600 mt-1.5 font-mono bg-purple-50 px-2 py-1 rounded inline-block">
                              {`{{$contact.${field.name}}}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No results */}
                  {filteredStandardFields.length === 0 && filteredCustomFields.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchQuery ? 'No fields match your search' : 'No contact fields available'}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with helper text */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                Contact fields will be automatically replaced when sending emails
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
