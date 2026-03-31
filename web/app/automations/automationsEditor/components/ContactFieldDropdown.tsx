/**
 * Contact Field Dropdown Component
 *
 * Provides a dropdown of available contact fields (standard + custom).
 * When selected, inserts the {{$contact.fieldName}} placeholder syntax
 * which will be resolved by the backend custom field resolver.
 *
 * This component can be embedded in any parameter input to allow
 * users to easily reference contact fields.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle } from 'lucide-react';
import { customFieldsAPI, CustomFieldDefinition } from '@/lib/api/customFields';

interface ContactField {
  name: string;
  displayName: string;
  type: string;
  description?: string;
  isSystemField: boolean;
}

interface ContactFieldDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ContactFieldDropdown({ value, onChange, placeholder }: ContactFieldDropdownProps) {
  const { getToken } = useAuth();
  const [standardFields, setStandardFields] = useState<ContactField[]>([]);
  const [customFields, setCustomFields] = useState<ContactField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

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

        console.log('[ContactFieldDropdown] API Response:', {
          totalFields: response.fields.length,
          fields: response.fields
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

        console.log('[ContactFieldDropdown] Separated fields:', {
          systemFieldsCount: systemFields.length,
          customFieldsCount: userCustomFields.length,
          systemFields: systemFields.map(f => f.name),
          customFields: userCustomFields.map(f => f.name)
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
    onChange(placeholder);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      {/* Main input field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Enter value or select contact field'}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Button to show contact field picker */}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center gap-2"
          title="Insert contact field"
        >
          <UserCircle className="w-4 h-4 text-gray-700" />
          <span className="text-gray-700">Contact Fields</span>
        </button>
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading fields...
                </div>
              ) : (
                <>
                  {/* Standard Contact Fields Section */}
                  {standardFields.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                        Standard Contact Fields
                      </div>
                      <div className="py-1">
                        {standardFields.map((field) => (
                          <button
                            key={field.name}
                            onClick={() => handleFieldSelect(field.name)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {field.displayName}
                            </div>
                            {field.description && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {field.description}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 mt-1 font-mono">
                              {`{{$contact.${field.name}}}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Fields Section */}
                  {customFields.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-purple-600 uppercase tracking-wide border-b border-gray-200">
                        Custom Fields
                      </div>
                      <div className="py-1">
                        {customFields.map((field) => (
                          <button
                            key={field.name}
                            onClick={() => handleFieldSelect(field.name)}
                            className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {field.displayName}
                            </div>
                            {field.description && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {field.description}
                              </div>
                            )}
                            <div className="text-xs text-purple-600 mt-1 font-mono">
                              {`{{$contact.${field.name}}}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No fields available */}
                  {standardFields.length === 0 && customFields.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No contact fields available
                    </div>
                  )}
                </>
              )}

              {/* Helper text */}
              <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 mt-1">
                Contact fields are automatically resolved from the contact adapter.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
