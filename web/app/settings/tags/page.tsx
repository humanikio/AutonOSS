'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  contactTagsAPI,
  ContactTag,
  CreateContactTagRequest,
} from '@/lib/api/contactTags';
import {
  Plus,
  Trash2,
  X,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Tag,
  Search,
} from 'lucide-react';

export default function ContactTagsPage() {
  const router = useRouter();
  const { currentTenantId, getToken } = useAuth();

  const [tags, setTags] = useState<ContactTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<ContactTag | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState<CreateContactTagRequest>({
    tagName: '',
  });

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

  // Load tags on mount
  useEffect(() => {
    if (currentTenantId) {
      loadTags();
    }
  }, [currentTenantId]);

  const loadTags = async () => {
    if (!currentTenantId) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await contactTagsAPI.getAllTags(token);
      setTags(result.tags);
    } catch (error) {
      console.error('Error loading contact tags:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load contact tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!currentTenantId) return;

    // Validate tag name
    if (!createForm.tagName || !createForm.tagName.trim()) {
      setErrorMessage('Tag name is required');
      return;
    }

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await contactTagsAPI.createTag(createForm, token);

      setSuccessMessage('Contact tag created successfully!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      await loadTags();
    } catch (error) {
      console.error('Error creating contact tag:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create contact tag');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!currentTenantId || !selectedTag) return;

    setIsOperationLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await contactTagsAPI.deleteTag(selectedTag.tagId, token);

      setSuccessMessage('Tag deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedTag(null);
      await loadTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete tag');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const openDeleteModal = (tag: ContactTag) => {
    setSelectedTag(tag);
    setIsDeleteModalOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      tagName: '',
    });
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    try {
      let date: Date;

      // Handle Firestore Timestamp object (has toDate method)
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Handle serialized Firestore Timestamp (has _seconds property)
      else if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000);
      }
      // Handle ISO string or timestamp number
      else {
        date = new Date(timestamp);
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return '-';
    }
  };

  // Filter tags based on search query
  const filteredTags = tags.filter(tag =>
    tag.tagName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-2xl font-semibold text-gray-900">Contact Tags</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage tags for organizing and categorizing your contacts
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
              setErrorMessage('');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Tag
          </button>
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

      {/* Search Bar */}
      {tags.length > 0 && (
        <div className="px-6 pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : tags.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No contact tags yet</p>
            <button
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
                setErrorMessage('');
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Tag
            </button>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No tags match your search</p>
            <p className="text-sm text-gray-500">Try adjusting your search query</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-sm text-primary-600 hover:text-primary-700"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredTags.length} of {tags.length} tag{tags.length !== 1 ? 's' : ''}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear search
                </button>
              )}
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTags.map((tag) => (
                  <tr key={tag.tagId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-medium text-gray-900">{tag.tagName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tag.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openDeleteModal(tag)}
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Contact Tag</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
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
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.tagName}
                  onChange={(e) => setCreateForm({ ...createForm, tagName: e.target.value })}
                  placeholder="e.g., VIP Customer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a descriptive name for this tag
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setErrorMessage('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={isOperationLoading || !createForm.tagName.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isOperationLoading ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Delete Tag</h2>
              </div>

              <p className="text-gray-600 mb-2">
                Are you sure you want to delete the tag <strong>{selectedTag.tagName}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. This tag will be removed from all contacts.
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
                onClick={handleDeleteTag}
                disabled={isOperationLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isOperationLoading ? 'Deleting...' : 'Delete Tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
