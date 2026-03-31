'use client';

import { useState } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { FieldMapping, DataSource } from '../../../../types';

interface FieldMappingSectionProps {
  dataSource: DataSource;
  onUpdate: (dataSource: DataSource) => void;
  fieldMappings?: FieldMapping[];
  onFieldMappingsUpdate?: (mappings: FieldMapping[]) => void;
}

export default function FieldMappingSection({ 
  dataSource, 
  onUpdate, 
  fieldMappings = [], 
  onFieldMappingsUpdate 
}: FieldMappingSectionProps) {
  const [newMapping, setNewMapping] = useState<Partial<FieldMapping>>({
    internalField: '',
    externalField: '',
    transformation: ''
  });

  const internalFields = [
    'contact.name',
    'contact.firstName',
    'contact.lastName',
    'contact.phone',
    'contact.email',
    'contact.address',
    'contact.city',
    'contact.state',
    'contact.zip',
    'appointment.startTime',
    'appointment.endTime',
    'appointment.type',
    'appointment.notes',
    'vehicle.vin',
    'vehicle.make',
    'vehicle.model',
    'vehicle.year',
    'workorder.number',
    'workorder.status',
    'workorder.total'
  ];

  const transformations = [
    { value: '', label: 'None' },
    { value: 'lowercase', label: 'Lowercase' },
    { value: 'uppercase', label: 'Uppercase' },
    { value: 'e164', label: 'E.164 Phone Format' },
    { value: 'trim', label: 'Trim Whitespace' },
    { value: 'split_name', label: 'Split Full Name' },
    { value: 'format_date', label: 'Format Date' }
  ];

  const handleAddMapping = () => {
    if (newMapping.internalField && newMapping.externalField && onFieldMappingsUpdate) {
      const mapping: FieldMapping = {
        internalField: newMapping.internalField,
        externalField: newMapping.externalField,
        transformation: newMapping.transformation || ''
      };
      onFieldMappingsUpdate([...fieldMappings, mapping]);
      setNewMapping({ internalField: '', externalField: '', transformation: '' });
    }
  };

  const handleRemoveMapping = (index: number) => {
    if (onFieldMappingsUpdate) {
      const updated = fieldMappings.filter((_, i) => i !== index);
      onFieldMappingsUpdate(updated);
    }
  };

  const handleUpdateMapping = (index: number, field: keyof FieldMapping, value: string) => {
    if (onFieldMappingsUpdate) {
      const updated = fieldMappings.map((mapping, i) => 
        i === index ? { ...mapping, [field]: value } : mapping
      );
      onFieldMappingsUpdate(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Field Mappings</h3>
          <p className="text-gray-500">Map external fields to internal data structure</p>
        </div>
        <div className="text-sm text-gray-500">
          {fieldMappings.length} mapping{fieldMappings.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Existing Mappings */}
      <div className="space-y-4">
        {fieldMappings.map((mapping, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Internal Field
                </label>
                <select
                  value={mapping.internalField}
                  onChange={(e) => handleUpdateMapping(index, 'internalField', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {internalFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  External Field
                </label>
                <input
                  type="text"
                  value={mapping.externalField}
                  onChange={(e) => handleUpdateMapping(index, 'externalField', e.target.value)}
                  placeholder="customer.full_name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Transformation
                  </label>
                  <select
                    value={mapping.transformation}
                    onChange={(e) => handleUpdateMapping(index, 'transformation', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {transformations.map(transform => (
                      <option key={transform.value} value={transform.value}>
                        {transform.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleRemoveMapping(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Mapping */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Internal Field
            </label>
            <select
              value={newMapping.internalField || ''}
              onChange={(e) => setNewMapping({ ...newMapping, internalField: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select field...</option>
              {internalFields
                .filter(field => !fieldMappings.some(m => m.internalField === field))
                .map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              External Field
            </label>
            <input
              type="text"
              value={newMapping.externalField || ''}
              onChange={(e) => setNewMapping({ ...newMapping, externalField: e.target.value })}
              placeholder="customer.full_name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Transformation
              </label>
              <select
                value={newMapping.transformation || ''}
                onChange={(e) => setNewMapping({ ...newMapping, transformation: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {transformations.map(transform => (
                  <option key={transform.value} value={transform.value}>
                    {transform.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddMapping}
              disabled={!newMapping.internalField || !newMapping.externalField}
              className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Mapping Preview</h4>
        <div className="text-sm text-blue-700">
          <p>When data is synced, external fields will be transformed and mapped to internal fields:</p>
          <div className="mt-2 space-y-1 font-mono text-xs">
            {fieldMappings.slice(0, 3).map((mapping, index) => (
              <div key={index}>
                <code>{mapping.externalField}</code>
                {mapping.transformation && (
                  <span className="text-blue-500"> → {mapping.transformation}</span>
                )}
                <span className="text-blue-500"> → </span>
                <code>{mapping.internalField}</code>
              </div>
            ))}
            {fieldMappings.length > 3 && (
              <div className="text-blue-600">... and {fieldMappings.length - 3} more</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}