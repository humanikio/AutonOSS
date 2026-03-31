'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, Loader2, Plus, Trash2, UserCircle } from 'lucide-react';
import { INodeProperties, IDisplayOptions, INodeTypeDescription, INodePropertyCollection } from '@/lib/api/nodeRegistry';
import { FieldGroupDropdown } from './FieldGroupDropdown';
import { FieldDefinition } from '@/lib/fieldGroupConfig';
import { useAuth } from '@/contexts/AuthContext';
import { customFieldsAPI, CustomFieldDefinition } from '@/lib/api/customFields';

export interface NodeParameterRendererProps {
  property: INodeProperties;
  value: any;
  allParameters: Record<string, any>;
  onChange: (name: string, value: any) => void;
  availableFields?: FieldDefinition[];
  nodeConfig?: INodeTypeDescription;
}

/**
 * Checks if a parameter should be displayed based on displayOptions
 */
function shouldDisplayParameter(
  displayOptions: IDisplayOptions | undefined,
  allParameters: Record<string, any>
): boolean {
  if (!displayOptions) return true;

  // Check 'show' conditions
  if (displayOptions.show) {
    for (const [paramName, expectedValues] of Object.entries(displayOptions.show)) {
      const currentValue = allParameters[paramName];

      // Handle wildcard: ['*'] means "show if parameter has any non-empty value"
      if (expectedValues.includes('*')) {
        if (!currentValue || currentValue === '') {
          return false;
        }
      } else {
        // If current value doesn't match any expected value, hide the parameter
        if (!expectedValues.includes(currentValue)) {
          return false;
        }
      }
    }
  }

  // Check 'hide' conditions
  if (displayOptions.hide) {
    for (const [paramName, expectedValues] of Object.entries(displayOptions.hide)) {
      const currentValue = allParameters[paramName];
      // If current value matches any expected value, hide the parameter
      if (expectedValues.includes(currentValue)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if a parameter should be required based on requiredOptions
 */
function shouldBeRequired(
  property: INodeProperties,
  allParameters: Record<string, any>
): boolean {
  // If no requiredOptions, use default required value
  if (!property.requiredOptions) {
    return property.required || false;
  }

  // Check 'hide' conditions - if matched, NOT required
  if (property.requiredOptions.hide) {
    for (const [paramName, expectedValues] of Object.entries(property.requiredOptions.hide)) {
      const currentValue = allParameters[paramName];
      if (expectedValues.includes(currentValue)) {
        return false; // Not required
      }
    }
  }

  // Check 'show' conditions - if NOT matched, NOT required
  if (property.requiredOptions.show) {
    for (const [paramName, expectedValues] of Object.entries(property.requiredOptions.show)) {
      const currentValue = allParameters[paramName];
      if (!expectedValues.includes(currentValue)) {
        return false; // Not required
      }
    }
  }

  // Default to property.required
  return property.required || false;
}

/**
 * Checks if a parameter should be disabled based on disabledOptions
 */
function shouldBeDisabled(
  property: INodeProperties,
  allParameters: Record<string, any>
): boolean {
  if (!property.disabledOptions) {
    return false;
  }

  // Check 'show' conditions - if matched, disabled
  if (property.disabledOptions.show) {
    for (const [paramName, expectedValues] of Object.entries(property.disabledOptions.show)) {
      const currentValue = allParameters[paramName];
      if (expectedValues.includes(currentValue)) {
        return true; // Disabled
      }
    }
  }

  // Check 'hide' conditions - if matched, NOT disabled
  if (property.disabledOptions.hide) {
    for (const [paramName, expectedValues] of Object.entries(property.disabledOptions.hide)) {
      const currentValue = allParameters[paramName];
      if (expectedValues.includes(currentValue)) {
        return false; // Not disabled
      }
    }
  }

  return false;
}

export function NodeParameterRenderer({
  property,
  value,
  allParameters,
  onChange,
  availableFields = [],
  nodeConfig,
}: NodeParameterRendererProps) {
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [showContactFieldMenu, setShowContactFieldMenu] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const [dynamicOptions, setDynamicOptions] = useState<Array<{ name: string; value: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const { getToken, currentTenantId } = useAuth();

  // Contact fields loaded dynamically from API
  const [contactFields, setContactFields] = useState<Array<{ name: string; displayName: string; description?: string; isSystemField: boolean }>>([]);
  const [loadingContactFields, setLoadingContactFields] = useState(false);

  // Local state for text inputs (blur-based saving) - MUST be declared before any conditional logic
  const [localValue, setLocalValue] = useState(value);

  // Calculate dynamic required/disabled states based on allParameters
  const isRequired = shouldBeRequired(property, allParameters);
  const isDisabled = shouldBeDisabled(property, allParameters);

  // Auto-populate field when switching to tagCheck mode (for IF node's "field" parameter)
  useEffect(() => {
    // Only apply to "field" parameter when conditionType switches to "tagCheck"
    if (property.name === 'field' && allParameters.conditionType === 'tagCheck') {
      // If field is empty or was previously set, auto-populate with contact tags reference
      if (!value || value === '') {
        console.log('[NodeParameterRenderer] Auto-populating field for tagCheck mode');
        onChange('field', '={{$contact.tags}}');
      }
    }
  }, [allParameters.conditionType, property.name]);

  // Update local state when prop changes (external updates)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Load contact fields from API
  useEffect(() => {
    async function loadContactFields() {
      try {
        setLoadingContactFields(true);
        const token = await getToken();
        if (!token) {
          console.error('[NodeParameterRenderer] No auth token available');
          return;
        }

        // Fetch all contact fields (system + custom) from backend
        const response = await customFieldsAPI.getAllFields(token, {
          entityScope: 'contact',
          includeSystem: true,
          // excludeInternal defaults to true on backend, so we get user-facing fields only
        });

        console.log('[NodeParameterRenderer] Loaded contact fields:', response.fields.length);

        // Separate and format fields
        const standardFields: typeof contactFields = [];
        const customFieldsList: typeof contactFields = [];

        response.fields.forEach((field: CustomFieldDefinition) => {
          const contactField = {
            name: field.name,
            displayName: field.displayName,
            description: field.description,
            isSystemField: field.isSystemField
          };

          if (field.isSystemField) {
            standardFields.push(contactField);
          } else {
            customFieldsList.push(contactField);
          }
        });

        // Combine: system fields first, then custom fields
        setContactFields([...standardFields, ...customFieldsList]);
      } catch (error) {
        console.error('[NodeParameterRenderer] Error loading contact fields:', error);
      } finally {
        setLoadingContactFields(false);
      }
    }

    loadContactFields();
  }, [getToken]);

  // Load dynamic options if property has loadOptionsMethod
  useEffect(() => {
    const loadOptionsMethod = property.typeOptions?.loadOptionsMethod;

    // Only log for 'options' type properties (to reduce noise)
    if (property.type === 'options') {
      console.log('[NodeParameterRenderer] Checking loadOptionsMethod for options field:', {
        propertyName: property.name,
        propertyType: property.type,
        loadOptionsMethod,
        typeOptions: property.typeOptions,
        hasNodeConfig: !!nodeConfig,
        nodeConfigName: nodeConfig?.name,
        hasPulselineMetadata: !!nodeConfig?._pulseline,
        hasLoadOptionsMethods: !!nodeConfig?._pulseline?.loadOptionsMethods,
        loadOptionsMethodsKeys: nodeConfig?._pulseline?.loadOptionsMethods ? Object.keys(nodeConfig._pulseline.loadOptionsMethods) : [],
      });
    }

    if (!loadOptionsMethod || !nodeConfig?._pulseline?.loadOptionsMethods) {
      if (property.type === 'options' && loadOptionsMethod) {
        console.warn('[NodeParameterRenderer] ⚠️ Options field has loadOptionsMethod but no loadOptionsMethods config:', {
          propertyName: property.name,
          loadOptionsMethod,
          hasLoadOptionsMethods: !!nodeConfig?._pulseline?.loadOptionsMethods,
        });
      }
      return;
    }

    const loadOptionsConfig = nodeConfig._pulseline.loadOptionsMethods[loadOptionsMethod];
    console.log('[NodeParameterRenderer] Found loadOptionsConfig:', loadOptionsConfig);

    if (!loadOptionsConfig) {
      console.warn('[NodeParameterRenderer] No loadOptionsConfig found for method:', loadOptionsMethod);
      return;
    }

    // Check dependencies - only load if all dependent parameters have values
    if (loadOptionsConfig.dependsOn) {
      const hasAllDependencies = loadOptionsConfig.dependsOn.every(
        (dep) => allParameters[dep] !== undefined && allParameters[dep] !== ''
      );
      if (!hasAllDependencies) {
        setDynamicOptions([]);
        return;
      }
    }

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const token = await getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        if (!currentTenantId) {
          console.error('❌ No currentTenantId available for loading options');
          setDynamicOptions([]);
          setLoadingOptions(false);
          return;
        }

        // Replace parameter placeholders in endpoint
        let endpoint = loadOptionsConfig.endpoint;
        const paramRegex = /\{\{\$parameter\["([^"]+)"\]\}\}/g;
        endpoint = endpoint.replace(paramRegex, (_, paramName) => {
          return allParameters[paramName] || '';
        });

        // Add tenantId query parameter
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint = `${endpoint}${separator}tenantId=${currentTenantId}`;

        const fullUrl = `${apiUrl}${endpoint}`;
        console.log('🔵 Loading dynamic options from:', fullUrl);

        const response = await fetch(fullUrl, {
          method: loadOptionsConfig.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to load options:', {
            url: fullUrl,
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          throw new Error(`Failed to load options: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Received data:', data);
        let items = data.data || data;

        // Handle nested data path if specified (e.g., data.actions)
        if (loadOptionsConfig.responseMapping.dataPath && items && typeof items === 'object') {
          items = items[loadOptionsConfig.responseMapping.dataPath];
        }

        console.log('📋 Extracted items:', items);

        // Ensure items is an array
        if (!Array.isArray(items)) {
          console.error('❌ Items is not an array:', items);
          setDynamicOptions([]);
          return;
        }

        // Transform response using mapping config
        const options = items.map((item: any) => {
          const value = item[loadOptionsConfig.responseMapping.valueField];
          const label = item[loadOptionsConfig.responseMapping.labelField];
          return {
            name: label,
            value: String(value),
          };
        });

        setDynamicOptions(options);
      } catch (error) {
        console.error('Error loading dynamic options:', error);
        setDynamicOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [property.typeOptions?.loadOptionsMethod, nodeConfig, allParameters, getToken, currentTenantId]);

  // Close field menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowFieldMenu(false);
      }
    }

    if (showFieldMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFieldMenu]);

  // Close contact field menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setShowContactFieldMenu(false);
      }
    }

    if (showContactFieldMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContactFieldMenu]);

  const insertFieldAtCursor = (field: FieldDefinition) => {
    let expression: string;

    if (!field?.sourceNodeName) {
      // Fallback if no source node info (shouldn't happen with proper setup)
      expression = `{{$json.${field.path}}}`;
    } else if (field.group === 'inboundWebhook') {
      // Webhook trigger data is nested under .body
      expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
    } else {
      // Previous node response is at top level
      expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
    }

    if (inputRef) {
      const start = inputRef.selectionStart || 0;
      const end = inputRef.selectionEnd || 0;
      const currentValue = value || '';
      const newValue = currentValue.substring(0, start) + expression + currentValue.substring(end);
      onChange(property.name, newValue);

      // Set cursor position after insertion
      setTimeout(() => {
        inputRef.focus();
        const newPosition = start + expression.length;
        inputRef.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // No cursor position, just append
      const newValue = (value || '') + expression;
      onChange(property.name, newValue);
    }

    setShowFieldMenu(false);
  };

  const insertContactFieldAtCursor = (fieldName: string) => {
    const expression = `{{$contact.${fieldName}}}`;

    if (inputRef) {
      const start = inputRef.selectionStart || 0;
      const end = inputRef.selectionEnd || 0;
      const currentValue = value || '';
      const newValue = currentValue.substring(0, start) + expression + currentValue.substring(end);
      onChange(property.name, newValue);

      // Set cursor position after insertion
      setTimeout(() => {
        inputRef.focus();
        const newPosition = start + expression.length;
        inputRef.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // No cursor position, just append
      const newValue = (value || '') + expression;
      onChange(property.name, newValue);
    }

    setShowContactFieldMenu(false);
  };

  // Check if parameter should be displayed
  if (!shouldDisplayParameter(property.displayOptions, allParameters)) {
    return null;
  }

  const handleChange = (newValue: any) => {
    onChange(property.name, newValue);
  };

  // Handle local change for text inputs (no parent onChange)
  const handleLocalChange = (newValue: any) => {
    setLocalValue(newValue);
  };

  // Handle blur - save to parent only if value changed
  const handleBlur = () => {
    if (localValue !== value) {
      onChange(property.name, localValue);
    }
  };

  // Render based on type
  switch (property.type) {
    case 'string':
      // Check if this should be rendered as a textarea
      const isTextarea = property.typeOptions?.rows && property.typeOptions.rows > 1;
      const hasUnsavedChanges = localValue !== value;

      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <div className="relative">
            {isTextarea ? (
              <textarea
                ref={(el) => setInputRef(el as any)}
                value={localValue || ''}
                onChange={(e) => handleLocalChange(e.target.value)}
                onBlur={handleBlur}
                rows={property.typeOptions?.rows || 6}
                placeholder={property.placeholder}
                disabled={isDisabled}
                className={`w-full px-3 py-2 pr-12 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${
                  hasUnsavedChanges ? 'border-yellow-400' : 'border-gray-300'
                } ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
              />
            ) : (
              <input
                ref={(el) => setInputRef(el)}
                type="text"
                value={localValue || ''}
                onChange={(e) => handleLocalChange(e.target.value)}
                onBlur={handleBlur}
                placeholder={property.placeholder}
                disabled={isDisabled}
                className={`w-full px-3 py-2 pr-20 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  hasUnsavedChanges ? 'border-yellow-400' : 'border-gray-300'
                } ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
              />
            )}
            <div className={`absolute right-2 flex gap-1 ${isTextarea ? 'top-2' : 'top-1/2 -translate-y-1/2'}`}>
              {/* Contact Fields Button */}
              <button
                type="button"
                onClick={() => {
                  setShowContactFieldMenu(!showContactFieldMenu);
                  setShowFieldMenu(false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Insert contact field"
              >
                <UserCircle className="h-4 w-4 text-purple-600" />
              </button>

              {/* Available Fields Button (from webhook/previous nodes) */}
              {availableFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldMenu(!showFieldMenu);
                    setShowContactFieldMenu(false);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Insert field from previous steps"
                >
                  <Zap className="h-4 w-4 text-blue-600" />
                </button>
              )}
            </div>

            {/* Field mapping dropdown (webhook/previous nodes) */}
            {showFieldMenu && availableFields.length > 0 && (
              <div
                ref={menuRef}
                className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg"
              >
                <div className="p-2 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Available Fields
                  </div>
                </div>
                <FieldGroupDropdown
                  fields={availableFields}
                  onSelectField={insertFieldAtCursor}
                />
              </div>
            )}

            {/* Contact fields dropdown */}
            {showContactFieldMenu && (
              <div
                ref={contactMenuRef}
                className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
              >
                {loadingContactFields ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Loading fields...
                  </div>
                ) : (
                  <>
                    {/* System Fields Section */}
                    {contactFields.filter(f => f.isSystemField).length > 0 && (
                      <div>
                        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Standard Contact Fields
                          </div>
                        </div>
                        <div className="py-1">
                          {contactFields.filter(f => f.isSystemField).map((field) => (
                            <button
                              key={field.name}
                              onClick={() => insertContactFieldAtCursor(field.name)}
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
                    {contactFields.filter(f => !f.isSystemField).length > 0 && (
                      <div>
                        <div className="px-3 py-2 border-b border-gray-200 bg-purple-50">
                          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                            Custom Fields
                          </div>
                        </div>
                        <div className="py-1">
                          {contactFields.filter(f => !f.isSystemField).map((field) => (
                            <button
                              key={field.name}
                              onClick={() => insertContactFieldAtCursor(field.name)}
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

                    {contactFields.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No contact fields available
                      </div>
                    )}

                    <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 mt-1">
                      Contact fields are automatically resolved from the contact adapter
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {property.hint && (
            <p className="text-xs text-gray-500 italic">{property.hint}</p>
          )}
        </div>
      );

    case 'number':
      const hasUnsavedNumberChanges = localValue !== value;

      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <input
            type="number"
            value={localValue ?? ''}
            onChange={(e) => handleLocalChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
            onBlur={handleBlur}
            min={property.typeOptions?.minValue}
            max={property.typeOptions?.maxValue}
            step={property.typeOptions?.numberStepSize}
            placeholder={property.placeholder}
            disabled={isDisabled}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasUnsavedNumberChanges ? 'border-yellow-400' : 'border-gray-300'
            } ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
          />
          {property.hint && (
            <p className="text-xs text-gray-500 italic">{property.hint}</p>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                {property.displayName}
              </label>
              {property.description && (
                <p className="text-xs text-gray-600 mt-1">{property.description}</p>
              )}
            </div>
            <button
              onClick={() => handleChange(!value)}
              disabled={isDisabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-blue-500' : 'bg-gray-300'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {property.hint && (
            <p className="text-xs text-gray-500 italic">{property.hint}</p>
          )}
        </div>
      );

    case 'options':
      // Use dynamic options if available, otherwise use static options
      const optionsToUse = dynamicOptions.length > 0 ? dynamicOptions : (property.options || []);
      const hasDynamicOptions = property.typeOptions?.loadOptionsMethod;

      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <div className="relative">
            <select
              value={value || ''}
              onChange={(e) => handleChange(e.target.value)}
              disabled={loadingOptions || isDisabled}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingOptions ? 'Loading...' : 'Select...'}
              </option>
              {optionsToUse.map((option: any) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.name}
                </option>
              ))}
            </select>
            {loadingOptions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
          {hasDynamicOptions && dynamicOptions.length === 0 && !loadingOptions && (
            <p className="text-xs text-amber-600">No options available. Check your configuration.</p>
          )}
          {property.hint && (
            <p className="text-xs text-gray-500 italic">{property.hint}</p>
          )}
        </div>
      );

    case 'multiOptions':
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <div className="space-y-2">
            {property.options?.map((option: any) => {
              const optionValue = String(option.value);
              const isSelected = Array.isArray(value) && value.includes(optionValue);
              return (
                <label
                  key={optionValue}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newValue = Array.isArray(value) ? [...value] : [];
                      if (e.target.checked) {
                        newValue.push(optionValue);
                      } else {
                        const index = newValue.indexOf(optionValue);
                        if (index > -1) newValue.splice(index, 1);
                      }
                      handleChange(newValue);
                    }}
                    className="w-4 h-4 text-blue-500 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{option.name}</span>
                </label>
              );
            })}
          </div>
          {property.hint && (
            <p className="text-xs text-gray-500 italic">{property.hint}</p>
          )}
        </div>
      );

    case 'collection':
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-4">
            {property.options?.map((subProperty) => {
              if ('type' in subProperty) {
                return (
                  <NodeParameterRenderer
                    key={subProperty.name}
                    property={subProperty as INodeProperties}
                    value={value?.[subProperty.name]}
                    allParameters={{ ...allParameters, ...(value || {}) }}
                    onChange={(name, newValue) => {
                      handleChange({ ...(value || {}), [name]: newValue });
                    }}
                    availableFields={availableFields}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      );

    case 'json':
      const hasUnsavedJsonChanges = localValue !== value;
      const displayJsonValue = typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2);

      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <textarea
            value={displayJsonValue}
            onChange={(e) => {
              // Just update local state while typing - don't parse yet
              handleLocalChange(e.target.value);
            }}
            onBlur={() => {
              // On blur, try to parse JSON and save
              try {
                const parsed = JSON.parse(localValue as string);
                handleLocalChange(parsed); // Update local with parsed version
                if (parsed !== value) {
                  onChange(property.name, parsed);
                }
              } catch {
                // If not valid JSON, keep as string
                if (localValue !== value) {
                  onChange(property.name, localValue);
                }
              }
            }}
            rows={6}
            placeholder={property.placeholder}
            disabled={isDisabled}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 placeholder-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasUnsavedJsonChanges ? 'border-yellow-400' : 'border-gray-300'
            } ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
          />
          {property.hint && (
            <p className="text-xs text-gray-500 italic">{property.hint}</p>
          )}
        </div>
      );

    case 'notice':
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">{property.displayName}</p>
        </div>
      );

    case 'fixedCollection':
      // Fixed collection allows adding multiple instances of a set of fields
      // Used for dynamic key-value pairs (like payload fields, headers, etc.)
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-900">
              {property.displayName}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <button
              type="button"
              onClick={() => {
                const currentValue = value || {};
                const collection = property.options?.[0] as INodePropertyCollection;
                const collectionName = collection?.name || 'field';
                const currentItems = currentValue[collectionName] || [];

                // Create empty item with all fields from the collection
                const emptyItem: any = {};
                collection?.values?.forEach((field) => {
                  emptyItem[field.name] = field.default || '';
                });

                handleChange({
                  ...currentValue,
                  [collectionName]: [...currentItems, emptyItem],
                });
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Plus className="h-3 w-3" />
              {property.placeholder || 'Add Field'}
            </button>
          </div>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}

          <div className="space-y-2">
            {(() => {
              const collection = property.options?.[0] as INodePropertyCollection;
              const collectionName = collection?.name || 'field';
              const items = value?.[collectionName] || [];

              if (items.length === 0) {
                return (
                  <div className="bg-gray-50 border border-gray-300 border-dashed rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">
                      No fields added yet. Click "+ {property.placeholder || 'Add Field'}" to add one.
                    </p>
                  </div>
                );
              }

              return items.map((item: any, index: number) => (
                <div key={index} className="bg-white border border-gray-300 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {collection?.displayName || 'Field'} {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentValue = value || {};
                        const currentItems = [...(currentValue[collectionName] || [])];
                        currentItems.splice(index, 1);
                        handleChange({
                          ...currentValue,
                          [collectionName]: currentItems,
                        });
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {collection?.values?.map((field) => (
                    <NodeParameterRenderer
                      key={field.name}
                      property={field}
                      value={item[field.name]}
                      allParameters={allParameters}
                      onChange={(fieldName, fieldValue) => {
                        const currentValue = value || {};
                        const currentItems = [...(currentValue[collectionName] || [])];
                        currentItems[index] = {
                          ...currentItems[index],
                          [fieldName]: fieldValue,
                        };
                        handleChange({
                          ...currentValue,
                          [collectionName]: currentItems,
                        });
                      }}
                      availableFields={availableFields}
                      nodeConfig={nodeConfig}
                    />
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      );

    // Placeholder for complex types
    case 'filter':
    case 'dateTime':
    case 'color':
    case 'resourceLocator':
    case 'credentialsSelect':
    case 'resourceMapper':
    case 'assignmentCollection':
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {property.description && (
            <p className="text-xs text-gray-600">{property.description}</p>
          )}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              {property.type} type not yet implemented
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Coming soon: Advanced {property.type} editor
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            {property.displayName}
          </label>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Unknown property type: {property.type}
            </p>
          </div>
        </div>
      );
  }
}
