'use client';

import { useState, useEffect } from 'react';
import { Edit2, ChevronDown, ChevronRight } from 'lucide-react';

interface MergedField {
  name: string;
  displayName: string;
  type: string;
  value: any;
  isSystemField: boolean;
  hideFromUI?: boolean;
  group?: string;
  groupDisplayName?: string;
  groupOrder?: number;
  order: number;
}

interface ContactFieldsEditorProps {
  contactId: string;
  tenantId: string;
  getToken: () => Promise<string | null>;
  onFieldUpdate?: (fieldName: string, value: any) => Promise<void>;
}

interface GroupedFields {
  groupName: string;
  groupDisplayName: string;
  isSystemGroup: boolean;
  fields: MergedField[];
}

export default function ContactFieldsEditor({
  contactId,
  tenantId,
  getToken,
  onFieldUpdate
}: ContactFieldsEditorProps) {
  const [fields, setFields] = useState<MergedField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [saving, setSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Fetch contact with all fields
  useEffect(() => {
    if (!contactId || !tenantId) return;

    const fetchContactFields = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/contacts/${contactId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch contact');
        }

        const data = await response.json();
        if (data.success && data.contact && data.contact.fields) {
          setFields(data.contact.fields);
        }
      } catch (error) {
        console.error('Error fetching contact fields:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactFields();
  }, [contactId, tenantId, getToken]);

  // Group fields by group (exclude tenant_id, filter read-only system fields)
  const groupedFields: GroupedFields[] = [];
  const fieldsByGroup = new Map<string, MergedField[]>();

  // Fields that should not be shown at all
  const hiddenFields = ['tenant_id', 'notes'];

  // Fields that should be read-only (not editable)
  const readOnlyFields = ['id', 'created_at', 'updated_at'];

  fields.forEach((field) => {
    // Skip fields marked as hideFromUI
    if (field.hideFromUI) {
      return;
    }

    // Skip hidden fields
    if (hiddenFields.includes(field.name)) {
      return;
    }

    const groupKey = field.group || '__ungrouped__';
    if (!fieldsByGroup.has(groupKey)) {
      fieldsByGroup.set(groupKey, []);
    }
    fieldsByGroup.get(groupKey)!.push(field);
  });

  // Convert to array and sort
  fieldsByGroup.forEach((groupFields, groupKey) => {
    const firstField = groupFields[0];
    groupedFields.push({
      groupName: groupKey,
      groupDisplayName: firstField.groupDisplayName || (groupKey === '__ungrouped__' ? 'Other Fields' : groupKey),
      isSystemGroup: firstField.isSystemField,
      fields: groupFields.sort((a, b) => a.order - b.order),
    });
  });

  // Sort groups: system groups first, then by group order
  groupedFields.sort((a, b) => {
    if (a.isSystemGroup && !b.isSystemGroup) return -1;
    if (!a.isSystemGroup && b.isSystemGroup) return 1;
    const orderA = a.fields[0]?.groupOrder ?? 9999;
    const orderB = b.fields[0]?.groupOrder ?? 9999;
    return orderA - orderB;
  });

  const handleStartEdit = (field: MergedField) => {
    // Prevent editing fields marked as hideFromUI (client-side protection)
    if (field.hideFromUI) {
      console.warn('Cannot edit hideFromUI field:', field.name);
      return;
    }

    setEditingField(field.name);
    setEditValue(field.value ?? '');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveField = async (fieldName: string) => {
    if (!onFieldUpdate) {
      console.warn('No onFieldUpdate handler provided');
      return;
    }

    // Additional protection: prevent saving hideFromUI fields
    const field = fields.find(f => f.name === fieldName);
    if (field?.hideFromUI) {
      console.error('Cannot save hideFromUI field:', fieldName);
      alert('This field cannot be edited');
      return;
    }

    try {
      setSaving(true);
      await onFieldUpdate(fieldName, editValue);

      // Update local state
      setFields((prev) =>
        prev.map((f) => (f.name === fieldName ? { ...f, value: editValue } : f))
      );

      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Failed to save field. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Format field value for display
  const formatFieldValue = (field: MergedField): string => {
    const value = field.value;

    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Handle Firestore Timestamp objects (they have seconds and nanoseconds)
    if (value && typeof value === 'object' && ('seconds' in value || '_seconds' in value)) {
      const seconds = value.seconds || value._seconds;
      if (seconds) {
        const date = new Date(seconds * 1000);
        if (field.type === 'date') {
          return date.toLocaleDateString();
        } else if (field.type === 'datetime') {
          return date.toLocaleString();
        }
        return date.toLocaleString();
      }
    }

    // Handle Date objects
    if (value instanceof Date) {
      if (field.type === 'date') {
        return value.toLocaleDateString();
      } else if (field.type === 'datetime') {
        return value.toLocaleString();
      }
      return value.toLocaleString();
    }

    // Handle ISO date strings
    if (typeof value === 'string' && (field.type === 'date' || field.type === 'datetime')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          if (field.type === 'date') {
            return date.toLocaleDateString();
          }
          return date.toLocaleString();
        }
      } catch (e) {
        // Fall through to default
      }
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Default: convert to string
    return String(value);
  };

  const renderFieldInput = (field: MergedField) => {
    const isEditing = editingField === field.name;
    const isReadOnly = readOnlyFields.includes(field.name);
    const displayValue = isEditing ? editValue : formatFieldValue(field);

    // Determine input type based on field type
    let inputType = 'text';
    if (field.type === 'email') inputType = 'email';
    else if (field.type === 'phone') inputType = 'tel';
    else if (field.type === 'date') inputType = 'date';
    else if (field.type === 'datetime') inputType = 'datetime-local';
    else if (field.type === 'number') inputType = 'number';

    // Read-only fields (cannot be edited)
    if (isReadOnly) {
      return (
        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm">
          {displayValue || '-'}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          {field.type === 'textarea' ? (
            <textarea
              value={displayValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              autoFocus
            />
          ) : field.type === 'boolean' ? (
            <select
              value={displayValue === true ? 'true' : displayValue === false ? 'false' : ''}
              onChange={(e) => setEditValue(e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            >
              <option value="">Not set</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              type={inputType}
              value={displayValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveField(field.name)}
              disabled={saving}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative group">
        <input
          type="text"
          value={displayValue || ''}
          placeholder={`Add ${field.displayName.toLowerCase()}`}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
          onClick={() => handleStartEdit(field)}
        />
        <button
          onClick={() => handleStartEdit(field)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedFields.map((group) => {
        const isCollapsed = collapsedGroups.has(group.groupName);

        return (
          <div key={group.groupName} className="mb-6">
            <button
              onClick={() => toggleGroup(group.groupName)}
              className="flex items-center gap-2 mb-4 w-full text-left hover:opacity-70 transition-opacity"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-primary-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-primary-600" />
              )}
              <h3 className="text-sm font-medium text-primary-600">
                {group.groupDisplayName}
              </h3>
              <span className="text-xs text-gray-500">({group.fields.length})</span>
            </button>

            {!isCollapsed && (
              <div className="space-y-6 pl-6">
                {group.fields.map((field) => {
                  const isReadOnly = readOnlyFields.includes(field.name);
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.displayName}
                        {!field.isSystemField && (
                          <span className="ml-2 text-xs text-gray-500">(custom)</span>
                        )}
                        {isReadOnly && (
                          <span className="ml-2 text-xs text-gray-400">(read-only)</span>
                        )}
                      </label>
                      {renderFieldInput(field)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
