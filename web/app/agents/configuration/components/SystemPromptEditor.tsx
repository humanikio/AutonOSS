'use client';

/**
 * System Prompt Editor Component
 *
 * Provides a rich textarea for editing agent system prompts with support for:
 * - Custom field expression insertion ({{$contact.fieldName}})
 * - Multi-line editing
 * - Expression quick-insert menu
 * - Real-time validation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle, ChevronDown } from 'lucide-react';
import { customFieldsAPI, CustomFieldDefinition } from '@/lib/api/customFields';

interface ContactField {
  name: string;
  displayName: string;
  type: string;
  description?: string;
  isSystemField: boolean;
}

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  placeholder?: string;
  error?: string | null;
}

export function SystemPromptEditor({
  value,
  onChange,
  onSave,
  isSaving,
  hasChanges,
  placeholder,
  error
}: SystemPromptEditorProps) {
  const { getToken } = useAuth();
  const [standardFields, setStandardFields] = useState<ContactField[]>([]);
  const [customFields, setCustomFields] = useState<ContactField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all contact fields (system + custom) from backend
  useEffect(() => {
    async function loadContactFields() {
      try {
        const token = await getToken();
        if (!token) {
          console.error('[SystemPromptEditor] No auth token available');
          setLoading(false);
          return;
        }

        console.log('[SystemPromptEditor] Fetching contact fields...');

        // Fetch all contact fields (system + custom) from backend
        const response = await customFieldsAPI.getAllFields(token, {
          entityScope: 'contact',
          includeSystem: true
        });

        console.log('[SystemPromptEditor] API Response:', {
          totalFields: response.fields.length,
          fields: response.fields.map((f: CustomFieldDefinition) => ({
            name: f.name,
            displayName: f.displayName,
            isSystem: f.isSystemField
          }))
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

        console.log('[SystemPromptEditor] Separated fields:', {
          systemFieldsCount: systemFields.length,
          customFieldsCount: userCustomFields.length,
          systemFields: systemFields.map(f => f.name),
          customFields: userCustomFields.map(f => f.name)
        });

        setStandardFields(systemFields);
        setCustomFields(userCustomFields);
      } catch (error) {
        console.error('[SystemPromptEditor] Error loading contact fields:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContactFields();
  }, [getToken]);

  // Click outside handler to close dropdown while allowing page scroll
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const handleFieldInsert = (fieldName: string) => {
    // Get current cursor position
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    // Insert expression at cursor position
    const expression = `{{$contact.${fieldName}}}`;
    const newValue = textBeforeCursor + expression + textAfterCursor;

    onChange(newValue);
    setShowDropdown(false);

    // Set cursor position after the inserted expression
    setTimeout(() => {
      const newCursorPosition = cursorPosition + expression.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  return (
    <div className="space-y-2">
      {/* Header with label and insert button */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          System Prompt
          <span className="text-xs text-gray-500 ml-2">(Define agent persona and behavior)</span>
        </label>

        <div className="flex items-center gap-2">
          {/* Insert Contact Field Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors flex items-center gap-2 shadow-sm"
              title="Insert contact field expression"
            >
              <UserCircle className="w-3.5 h-3.5 text-primary-600" />
              <span className="text-gray-700 font-medium">Insert Field</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
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
                            <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
                              Standard Contact Fields
                            </div>
                            <div className="py-1">
                              {standardFields.map((field) => (
                                <button
                                  key={field.name}
                                  onClick={() => handleFieldInsert(field.name)}
                                  className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors rounded-md"
                                >
                                  <div className="text-sm font-medium text-gray-900">
                                    {field.displayName}
                                  </div>
                                  {field.description && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {field.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-50 px-2 py-0.5 rounded inline-block">
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
                            <div className="px-3 py-2 text-xs font-semibold text-purple-600 uppercase tracking-wide border-b border-gray-200 bg-purple-50">
                              Custom Fields
                            </div>
                            <div className="py-1">
                              {customFields.map((field) => (
                                <button
                                  key={field.name}
                                  onClick={() => handleFieldInsert(field.name)}
                                  className="w-full px-3 py-2.5 text-left hover:bg-purple-50 transition-colors rounded-md"
                                >
                                  <div className="text-sm font-medium text-gray-900">
                                    {field.displayName}
                                  </div>
                                  {field.description && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {field.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-purple-600 mt-1 font-mono bg-purple-50 px-2 py-0.5 rounded inline-block">
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
                    <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 mt-1 bg-gray-50 rounded-b-lg">
                      <p className="font-medium text-gray-700 mb-1">💡 How to use expressions:</p>
                      <p>Contact field values are automatically populated at runtime when making calls.</p>
                    </div>
                  </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={isSaving || !hasChanges}
            className={`px-4 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
              hasChanges
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isSaving ? 'Saving...' : hasChanges ? 'Save Prompt' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'e.g. You are a helpful customer support agent for ElevenLabs. You are friendly, professional, and knowledgeable about voice AI technology...'}
        rows={6}
        disabled={isSaving}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-normal text-sm ${
          isSaving ? 'bg-gray-100 border-gray-200' : 'border-gray-300'
        }`}
      />

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          Error: {error}
        </div>
      )}

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="text-sm text-orange-600 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
          Unsaved changes
        </div>
      )}
    </div>
  );
}
