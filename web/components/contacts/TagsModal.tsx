'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { contactTagsAPI, ContactTag, CreateContactTagRequest } from '@/lib/api/contactTags';
import { contactsAPI } from '@/lib/api/contacts';
import { X, Search, Tag, Check, AlertCircle, Plus } from 'lucide-react';

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  currentTags?: string[]; // Array of tag IDs currently assigned to the contact
  onTagsUpdated?: () => void; // Callback when tags are successfully updated
}

export default function TagsModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  currentTags = [],
  onTagsUpdated,
}: TagsModalProps) {
  const { getToken } = useAuth();
  const [allTags, setAllTags] = useState<ContactTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(currentTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load all tags when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTags();
      setSelectedTagIds(currentTags);
      setSearchQuery('');
      setErrorMessage('');
      setShowCreateForm(false);
      setNewTagName('');
    }
  }, [isOpen, currentTags]);

  const loadTags = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await contactTagsAPI.getAllTags(token);
      setAllTags(result.tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setErrorMessage('Tag name is required');
      return;
    }

    setIsCreating(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const newTag = await contactTagsAPI.createTag({ tagName: newTagName.trim() }, token);

      // Add new tag to list and select it
      setAllTags(prev => [newTag, ...prev]);
      setSelectedTagIds(prev => [...prev, newTag.tagId]);

      // Reset form
      setNewTagName('');
      setShowCreateForm(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating tag:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create tag');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      await contactsAPI.updateContactTags(contactId, selectedTagIds, token);

      console.log(`✅ Successfully updated tags for contact ${contactId}`);

      // Call the callback to refresh parent component
      if (onTagsUpdated) {
        onTagsUpdated();
      }

      onClose();
    } catch (error) {
      console.error('Error saving tags:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save tags');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter tags based on search query
  const filteredTags = allTags.filter(tag =>
    tag.tagName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Tags</h2>
            <p className="mt-1 text-sm text-gray-600">{contactName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Search & Create */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {showCreateForm ? (
            <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter new tag name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTag();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTag}
                  disabled={isCreating || !newTagName.trim()}
                  className="flex-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                    setErrorMessage('');
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Tag
            </button>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Tags List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchQuery ? 'No tags match your search' : 'No tags available'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-gray-500 mt-1">
                  Create tags in Settings to get started
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.tagId);
                return (
                  <button
                    key={tag.tagId}
                    onClick={() => handleToggleTag(tag.tagId)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className={`h-4 w-4 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${isSelected ? 'text-primary-900' : 'text-gray-700'}`}>
                        {tag.tagName}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary-600" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-gray-600">
            {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Tags'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
