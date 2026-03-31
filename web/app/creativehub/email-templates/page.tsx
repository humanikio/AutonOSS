'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Mail,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  FileText,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';

interface EmailTemplate {
  id: string;
  name: string;
  htmlContent: string;
  aiPrompt?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const { user, currentTenantId, getToken } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [user, currentTenantId]);

  const loadTemplates = async () => {
    if (!user || !currentTenantId) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/email-templates?tenantId=${currentTenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user || !currentTenantId) return;

    setIsCreating(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          name: 'Untitled Template',
          htmlContent: '',
          aiPrompt: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to editor with new template ID
        router.push(`/creativehub/email-templates/editor/${data.template.id}`);
      } else {
        console.error('Failed to create template');
        alert('Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Error creating template');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete || !currentTenantId) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/email-templates/${templateToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId
        })
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
        setTemplateToDelete(null);
        setDeleteConfirmText('');
      } else {
        console.error('Failed to delete template');
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setTemplateToDelete(null);
    setDeleteConfirmText('');
  };

  const handleStartEdit = (template: EmailTemplate) => {
    setEditingTemplateId(template.id);
    setEditedName(template.name);
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditedName('');
  };

  const handleSaveEdit = async (templateId: string) => {
    if (!currentTenantId || !editedName.trim()) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          name: editedName.trim()
        })
      });

      if (response.ok) {
        // Update local state
        setTemplates(prev => prev.map(t =>
          t.id === templateId ? { ...t, name: editedName.trim() } : t
        ));
        setEditingTemplateId(null);
        setEditedName('');
      } else {
        console.error('Failed to update template name');
        alert('Failed to update template name');
      }
    } catch (error) {
      console.error('Error updating template name:', error);
      alert('Error updating template name');
    }
  };

  const handleToggleStatus = async (template: EmailTemplate) => {
    if (!currentTenantId) return;

    const newStatus = template.status === 'published' ? 'draft' : 'published';

    try {
      const token = await getToken();
      const response = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentTenantId,
          status: newStatus
        })
      });

      if (response.ok) {
        // Update local state
        setTemplates(prev => prev.map(t =>
          t.id === template.id ? { ...t, status: newStatus } : t
        ));
      } else {
        console.error('Failed to update template status');
        alert('Failed to update template status');
      }
    } catch (error) {
      console.error('Error updating template status:', error);
      alert('Error updating template status');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 bg-gray-50 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 via-blue-50/15 to-primary-50/10"></div>
      </div>

      <div className="relative min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/creativehub"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Creative Hub</span>
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light text-gray-900">Email Templates</h1>
                <p className="mt-2 text-gray-500">Create and manage email templates for your campaigns</p>
              </div>
              <button
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>New Template</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Loading templates...</span>
            </div>
          ) : (
            <>
              {/* Templates Grid */}
              {filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="group relative backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl p-6 hover:bg-white/80 transition-all duration-300 hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="backdrop-blur-lg bg-primary-50/80 border border-primary-100/60 rounded-xl p-3 shadow-md">
                            <Mail className="h-6 w-6 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingTemplateId === template.id ? (
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(template.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="w-full px-2 py-1 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-gray-900"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {template.status === 'published' ? 'Published' : 'Draft'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(template);
                                }}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                  template.status === 'published'
                                    ? 'bg-green-500'
                                    : 'bg-gray-300'
                                }`}
                                title={`Click to ${template.status === 'published' ? 'unpublish' : 'publish'}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    template.status === 'published' ? 'translate-x-5' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {editingTemplateId === template.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEdit(template.id);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-gray-50"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-50"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(template);
                                }}
                                className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-50"
                                title="Edit name"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToDelete(template);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-50"
                                title="Delete template"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">
                          <span>Updated: {new Date(template.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        {template.htmlContent && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>Has HTML content</span>
                          </div>
                        )}
                      </div>

                      {/* Click to edit - disabled when editing name */}
                      {editingTemplateId !== template.id && (
                        <button
                          onClick={() => router.push(`/creativehub/email-templates/editor/${template.id}`)}
                          className="absolute inset-0 w-full h-full rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Edit template"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'No templates found' : 'No templates yet'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreateTemplate}
                      disabled={isCreating}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Create your first template
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-red-100/50 px-6 py-4 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Template</h3>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  You are about to permanently delete:
                </p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="font-semibold text-gray-900">{templateToDelete.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {new Date(templateToDelete.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-800 font-medium">⚠️ Warning</p>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone. All template data, including HTML content and associated images, will be permanently deleted.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono font-bold text-red-600">confirm</span> to delete:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type 'confirm' here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isDeleting}
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'confirm'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Forever</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
