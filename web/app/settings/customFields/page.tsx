'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  customFieldsAPI,
  CustomFieldDefinition,
  CreateCustomFieldRequest,
  UpdateCustomFieldRequest,
  CreateFieldGroupRequest,
  UpdateFieldGroupRequest,
  FieldType,
  EntityScope,
  FieldGroup,
} from '@/lib/api/customFields';
import {
  Plus,
  Edit,
  Trash2,
  X,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Tag,
  Database,
  Folder,
} from 'lucide-react';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'string', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'boolean', label: 'True/False' },
  { value: 'select', label: 'Dropdown (Single)' },
  { value: 'multiselect', label: 'Dropdown (Multiple)' },
];

const ENTITY_SCOPES: { value: EntityScope; label: string }[] = [
  { value: 'contact', label: 'Contact' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'company', label: 'Company' },
  { value: 'deal', label: 'Deal' },
];

type ViewMode = 'fields' | 'groups';

export default function CustomFieldsPage() {
  const router = useRouter();
  const { currentTenantId, getToken } = useAuth();

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('fields');

  // Field Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomFieldDefinition | null>(null);

  // Group Modals
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FieldGroup | null>(null);

  // Filter
  const [filterEntityScope, setFilterEntityScope] = useState<EntityScope>('contact');

  // Forms
  const [createForm, setCreateForm] = useState<CreateCustomFieldRequest>({
    name: '',
    displayName: '',
    description: '',
    type: 'string',
    entityScope: 'contact',
    group: '',
    placeholder: '',
  });

  const [editForm, setEditForm] = useState<UpdateCustomFieldRequest>({
    displayName: '',
    description: '',
  });

  // Group Forms
  const [createGroupForm, setCreateGroupForm] = useState<CreateFieldGroupRequest>({
    name: '',
    displayName: '',
    description: '',
    entityScope: 'contact',
  });

  const [editGroupForm, setEditGroupForm] = useState<UpdateFieldGroupRequest>({
    displayName: '',
    description: '',
  });

  // Validation errors
  const [fieldNameError, setFieldNameError] = useState('');
  const [groupNameError, setGroupNameError] = useState('');

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load fields and groups on mount
  useEffect(() => {
    if (currentTenantId) {
      loadFields();
      loadGroups();
    }
  }, [currentTenantId, filterEntityScope]);

  const loadFields = async () => {
    if (!currentTenantId) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await customFieldsAPI.getAllFields(token, {
        entityScope: filterEntityScope,
      });

      setFields(result.fields);
    } catch (error) {
      console.error('Error loading custom fields:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load custom fields');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!currentTenantId) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await customFieldsAPI.getAllGroups(token, {
        entityScope: filterEntityScope,
      });

      setGroups(result.groups);
    } catch (error) {
      console.error('Error loading field groups:', error);
      // Don't set error message for groups - it's not critical
    }
  };

  const handleCreateField = async () => {
    if (!currentTenantId) return;

    // Validate field name
    const nameError = validateFieldName(createForm.name);
    if (nameError) {
      setFieldNameError(nameError);
      setErrorMessage(nameError);
      return;
    }

    // Validate display name
    if (!createForm.displayName) {
      setErrorMessage('Display name is required');
      return;
    }

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await customFieldsAPI.createField(createForm, token);

      setSuccessMessage('Custom field created successfully!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      await loadFields();
    } catch (error) {
      console.error('Error creating custom field:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create custom field');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleUpdateField = async () => {
    if (!currentTenantId || !selectedField) return;

    if (!editForm.displayName) {
      setErrorMessage('Display name is required');
      return;
    }

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await customFieldsAPI.updateField(selectedField.id, editForm, token);

      setSuccessMessage('Field updated successfully!');
      setIsEditModalOpen(false);
      setSelectedField(null);
      await loadFields();
    } catch (error) {
      console.error('Error updating field:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update field');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleDeleteField = async () => {
    if (!currentTenantId || !selectedField) return;

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await customFieldsAPI.deleteField(selectedField.id, token);

      setSuccessMessage('Field deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedField(null);
      await loadFields();
    } catch (error) {
      console.error('Error deleting field:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete field');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const openEditModal = (field: CustomFieldDefinition) => {
    setSelectedField(field);
    setEditForm({
      displayName: field.displayName,
      description: field.description || '',
      group: field.group || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (field: CustomFieldDefinition) => {
    setSelectedField(field);
    setIsDeleteModalOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      displayName: '',
      description: '',
      type: 'string',
      entityScope: filterEntityScope,
      group: '',
      placeholder: '',
    });
    setFieldNameError('');
  };

  // Validation functions
  const validateFieldName = (name: string): string => {
    if (!name) {
      return 'Field name is required';
    }
    if (!/^[a-z0-9_]+$/.test(name)) {
      if (/\s/.test(name)) {
        return 'Spaces are not allowed. Use underscores (_) instead';
      }
      if (/[A-Z]/.test(name)) {
        return 'Uppercase letters are not allowed. Use lowercase only';
      }
      if (/[^a-z0-9_]/.test(name)) {
        return 'Only lowercase letters, numbers, and underscores (_) are allowed';
      }
      return 'Field name must be lowercase alphanumeric with underscores only';
    }
    return '';
  };

  const validateGroupName = (name: string): string => {
    if (!name) {
      return 'Group name is required';
    }
    if (!/^[a-z0-9_]+$/.test(name)) {
      if (/\s/.test(name)) {
        return 'Spaces are not allowed. Use underscores (_) instead';
      }
      if (/[A-Z]/.test(name)) {
        return 'Uppercase letters are not allowed. Use lowercase only';
      }
      if (/[^a-z0-9_]/.test(name)) {
        return 'Only lowercase letters, numbers, and underscores (_) are allowed';
      }
      return 'Group name must be lowercase alphanumeric with underscores only';
    }
    return '';
  };

  const handleFieldNameChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setCreateForm({ ...createForm, name: lowerValue });
    const error = validateFieldName(lowerValue);
    setFieldNameError(error);
  };

  const handleGroupNameChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setCreateGroupForm({ ...createGroupForm, name: lowerValue });
    const error = validateGroupName(lowerValue);
    setGroupNameError(error);
  };

  // ==================== Group Handlers ====================

  const handleCreateGroup = async () => {
    if (!currentTenantId) return;

    // Validate group name
    const nameError = validateGroupName(createGroupForm.name);
    if (nameError) {
      setGroupNameError(nameError);
      setErrorMessage(nameError);
      return;
    }

    // Validate display name
    if (!createGroupForm.displayName) {
      setErrorMessage('Display name is required');
      return;
    }

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await customFieldsAPI.createGroup(
        {
          ...createGroupForm,
          entityScope: filterEntityScope,
        },
        token
      );

      setSuccessMessage('Field group created successfully!');
      setIsCreateGroupModalOpen(false);
      resetCreateGroupForm();
      await loadGroups();
    } catch (error) {
      console.error('Error creating field group:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create field group');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!currentTenantId || !selectedGroup) return;

    if (!editGroupForm.displayName) {
      setErrorMessage('Display name is required');
      return;
    }

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await customFieldsAPI.updateGroup(selectedGroup.id, editGroupForm, token);

      setSuccessMessage('Group updated successfully!');
      setIsEditGroupModalOpen(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update group');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentTenantId || !selectedGroup) return;

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await customFieldsAPI.deleteGroup(selectedGroup.id, token);

      setSuccessMessage('Group deleted successfully!');
      setIsDeleteGroupModalOpen(false);
      setSelectedGroup(null);
      await loadGroups();
      await loadFields(); // Reload fields in case any were using this group
    } catch (error) {
      console.error('Error deleting group:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete group');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const openEditGroupModal = (group: FieldGroup) => {
    setSelectedGroup(group);
    setEditGroupForm({
      displayName: group.displayName,
      description: group.description || '',
      icon: group.icon,
      color: group.color,
      order: group.order,
    });
    setIsEditGroupModalOpen(true);
  };

  const openDeleteGroupModal = (group: FieldGroup) => {
    setSelectedGroup(group);
    setIsDeleteGroupModalOpen(true);
  };

  const resetCreateGroupForm = () => {
    setCreateGroupForm({
      name: '',
      displayName: '',
      description: '',
      entityScope: filterEntityScope,
    });
    setGroupNameError('');
  };

  const customFieldsList = fields.filter((f) => !f.isSystemField);
  const systemFieldsList = fields.filter((f) => f.isSystemField);
  const customGroupsList = groups.filter((g) => !g.isSystemGroup);
  const systemGroupsList = groups.filter((g) => g.isSystemGroup);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Custom Fields</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage custom fields and groups for your entities
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (viewMode === 'fields') {
                resetCreateForm();
                setIsCreateModalOpen(true);
                setErrorMessage('');
              } else {
                resetCreateGroupForm();
                setIsCreateGroupModalOpen(true);
                setErrorMessage('');
              }
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {viewMode === 'fields' ? 'Add Custom Field' : 'Add Field Group'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 border-t border-gray-200 -mx-6 px-6">
          <div className="flex gap-6 mt-4">
            <button
              onClick={() => setViewMode('fields')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                viewMode === 'fields'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Fields
              </div>
            </button>
            <button
              onClick={() => setViewMode('groups')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                viewMode === 'groups'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Groups
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Filter */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Entity Type:</label>
          <select
            value={filterEntityScope}
            onChange={(e) => setFilterEntityScope(e.target.value as EntityScope)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ENTITY_SCOPES.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : viewMode === 'fields' ? (
          <div className="space-y-6">
            {/* System Fields */}
            {systemFieldsList.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Database className="h-5 w-5 text-gray-500" />
                  System Fields ({systemFieldsList.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Display Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Group
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {systemFieldsList.map((field) => (
                        <tr key={field.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {field.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {field.displayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {field.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {field.group || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Custom Fields */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary-600" />
                Custom Fields ({customFieldsList.length})
              </h2>
              {customFieldsList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No custom fields yet</p>
                  <button
                    onClick={() => {
                      resetCreateForm();
                      setIsCreateModalOpen(true);
                      setErrorMessage('');
                    }}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Custom Field
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Display Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Group
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customFieldsList.map((field) => (
                        <tr key={field.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {field.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {field.displayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {field.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {field.group || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(field)}
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(field)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          // ==================== GROUPS VIEW ====================
          <div className="space-y-6">
            {/* System Groups */}
            {systemGroupsList.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Database className="h-5 w-5 text-gray-500" />
                  System Groups ({systemGroupsList.length})
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Group Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Display Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {systemGroupsList.map((group) => (
                        <tr key={group.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {group.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.displayName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {group.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {group.order}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Custom Groups */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary-600" />
                Custom Groups ({customGroupsList.length})
              </h2>
              {customGroupsList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No custom groups yet</p>
                  <button
                    onClick={() => {
                      resetCreateGroupForm();
                      setIsCreateGroupModalOpen(true);
                      setErrorMessage('');
                    }}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Group
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Group Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Display Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customGroupsList.map((group) => (
                        <tr key={group.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {group.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.displayName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {group.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {group.order}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditGroupModal(group)}
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteGroupModal(group)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Custom Field</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFieldNameError('');
                  setErrorMessage('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => handleFieldNameChange(e.target.value)}
                  placeholder="e.g., lead_score"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm transition-colors ${
                    fieldNameError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                />
                {fieldNameError ? (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldNameError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Lowercase letters, numbers, and underscores only
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="e.g., Lead Score"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as FieldType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  value={createForm.group || ''}
                  onChange={(e) => setCreateForm({ ...createForm, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- No Group --</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.name}>
                      {group.displayName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {groups.length === 0
                    ? 'No groups available. Fields will be ungrouped.'
                    : 'Optional: Organize this field into a group'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                <input
                  type="text"
                  value={createForm.placeholder}
                  onChange={(e) => setCreateForm({ ...createForm, placeholder: e.target.value })}
                  placeholder="e.g., Enter score 0-100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFieldNameError('');
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateField}
                disabled={isOperationLoading || !!fieldNameError || !createForm.name || !createForm.displayName}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isOperationLoading ? 'Creating...' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Field</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name (Read-only)
                </label>
                <input
                  type="text"
                  value={selectedField.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Field name cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  value={editForm.group || ''}
                  onChange={(e) => setEditForm({ ...editForm, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- No Group --</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.name}>
                      {group.displayName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {groups.length === 0
                    ? 'No groups available. Field will be ungrouped.'
                    : 'Optional: Change the group for this field'}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateField}
                disabled={isOperationLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isOperationLoading ? 'Updating...' : 'Update Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Delete Field</h2>
              </div>

              <p className="text-gray-600 mb-2">
                Are you sure you want to delete the field <strong>{selectedField.displayName}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All data in this field will be lost.
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteField}
                disabled={isOperationLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isOperationLoading ? 'Deleting...' : 'Delete Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GROUP MODALS ==================== */}

      {/* Create Group Modal */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Field Group</h2>
              <button
                onClick={() => {
                  setIsCreateGroupModalOpen(false);
                  setGroupNameError('');
                  setErrorMessage('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createGroupForm.name}
                  onChange={(e) => handleGroupNameChange(e.target.value)}
                  placeholder="e.g., sales_info"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm transition-colors ${
                    groupNameError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                />
                {groupNameError ? (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {groupNameError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Lowercase letters, numbers, and underscores only
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createGroupForm.displayName}
                  onChange={(e) =>
                    setCreateGroupForm({ ...createGroupForm, displayName: e.target.value })
                  }
                  placeholder="e.g., Sales Information"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createGroupForm.description}
                  onChange={(e) =>
                    setCreateGroupForm({ ...createGroupForm, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={createGroupForm.order || ''}
                  onChange={(e) =>
                    setCreateGroupForm({
                      ...createGroupForm,
                      order: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Display order (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first. Leave empty to add at the end.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateGroupModalOpen(false);
                  setGroupNameError('');
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isOperationLoading || !!groupNameError || !createGroupForm.name || !createGroupForm.displayName}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isOperationLoading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {isEditGroupModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Group</h2>
              <button
                onClick={() => setIsEditGroupModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name (Read-only)
                </label>
                <input
                  type="text"
                  value={selectedGroup.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Group name cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editGroupForm.displayName}
                  onChange={(e) => setEditGroupForm({ ...editGroupForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editGroupForm.description}
                  onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={editGroupForm.order || ''}
                  onChange={(e) =>
                    setEditGroupForm({
                      ...editGroupForm,
                      order: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsEditGroupModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={isOperationLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isOperationLoading ? 'Updating...' : 'Update Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {isDeleteGroupModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Delete Group</h2>
              </div>

              <p className="text-gray-600 mb-2">
                Are you sure you want to delete the group <strong>{selectedGroup.displayName}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. Fields using this group will become ungrouped.
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteGroupModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={isOperationLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isOperationLoading ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
