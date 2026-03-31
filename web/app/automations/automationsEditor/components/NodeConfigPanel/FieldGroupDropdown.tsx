'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { groupFields, FieldDefinition } from '@/lib/fieldGroupConfig';

interface FieldGroupDropdownProps {
  fields: FieldDefinition[];
  onSelectField: (field: FieldDefinition) => void;
}

export function FieldGroupDropdown({ fields, onSelectField }: FieldGroupDropdownProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['inboundWebhook']));
  const groupedFields = groupFields(fields);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  if (groupedFields.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        No fields available. Send a test webhook to capture fields.
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {groupedFields.map(({ group, fields: groupFields }) => {
        const isExpanded = expandedGroups.has(group.name);

        return (
          <div key={group.name} className="border-b border-gray-200 last:border-b-0">
            {/* Group Header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{group.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {group.displayName}
                  </div>
                  {group.description && (
                    <div className="text-xs text-gray-500">{group.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {groupFields.length}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </button>

            {/* Group Fields */}
            {isExpanded && (
              <div className="bg-gray-50">
                {groupFields.map((field) => (
                  <button
                    key={`${field.sourceNodeName}-${field.path}`}
                    type="button"
                    onClick={() => onSelectField(field)}
                    className="w-full text-left px-6 py-2 hover:bg-blue-50 transition-colors border-t border-gray-200"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-gray-900 truncate">
                          {field.displayName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {field.path}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {field.type}
                          {field.value !== undefined && field.value !== null && (
                            <span className="ml-2">
                              • {String(field.value).substring(0, 40)}
                              {String(field.value).length > 40 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
