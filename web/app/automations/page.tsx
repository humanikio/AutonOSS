'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createAutomation, getAutomations, createFolder, getFolders, addAutomationToFolder, getFolderContents, deleteAutomation, batchDeleteAutomations, updateFolder, deleteFolder, Automation, Folder } from '@/lib/api/automations';
import { setTokenGetter } from '@/lib/api/client';
import {
  Plus,
  Search,
  MoreHorizontal,
  FolderPlus,
  RefreshCw,
  List,
  Info,
  Trash2,
  ArrowLeft,
  Home,
  Edit
} from 'lucide-react';

// Remove old Workflow interface since we're using the API types now

export default function AutomationsPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'deleted' | 'smart-list'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAutomations, setSelectedAutomations] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'folders' | 'automations'>('all');
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderContents, setFolderContents] = useState<Automation[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Filter items based on search and view filter
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAutomations = automations.filter(automation =>
    automation.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !automation.folderId  // Only show workflows not in folders
  );

  // Combined filtered items based on view filter
  const getFilteredItems = () => {
    switch (viewFilter) {
      case 'folders':
        return { folders: filteredFolders, automations: [] };
      case 'automations':
        return { folders: [], automations: filteredAutomations };
      default:
        return { folders: filteredFolders, automations: filteredAutomations };
    }
  };

  const { folders: displayFolders, automations: displayAutomations } = getFilteredItems();


  // Set up token getter for API calls
  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken);
    }
  }, [getToken]);

  // Load automations and folders
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [automationsData, foldersData] = await Promise.all([
        getAutomations(),
        getFolders()
      ]);
      setAutomations(automationsData);
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  // Load data when user is available
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  // Handle creating new automation
  const handleCreateAutomation = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      const newAutomation = await createAutomation();
      console.log('Created automation:', newAutomation);
      
      // Reload data to show the new automation
      await loadData();
      
      // Navigate to the automation editor
      router.push(`/automations/automationsEditor/${newAutomation.id}`);
    } catch (error) {
      console.error('Error creating automation:', error);
      setError('Failed to create automation');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle creating new folder
  const handleCreateFolder = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const folderName = prompt('Enter folder name:');
    if (!folderName || folderName.trim() === '') {
      return;
    }

    setIsCreatingFolder(true);
    try {
      const newFolder = await createFolder({ name: folderName.trim() });
      console.log('Created folder:', newFolder);
      
      // Add to local state
      setFolders(prev => [...prev, newFolder]);
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAutomation = (automationId: string, checked: boolean) => {
    if (checked) {
      setSelectedAutomations(prev => [...prev, automationId]);
    } else {
      setSelectedAutomations(prev => prev.filter(id => id !== automationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAutomations(displayAutomations.map(a => a.id));
    } else {
      setSelectedAutomations([]);
    }
  };

  const handleAddToFolder = async (folderId: string) => {
    if (selectedAutomations.length === 0) return;

    try {
      // Add each automation to the folder one by one
      for (const workflowId of selectedAutomations) {
        await addAutomationToFolder(folderId, workflowId);
      }
      console.log('Successfully added automations to folder:', { folderId, automationIds: selectedAutomations });

      // Reload data to reflect changes
      await loadData();

      // If we're currently in a folder, reload its contents
      if (currentFolder) {
        await loadFolderContents(currentFolder.id);
      }

      // Clear selection after action
      setSelectedAutomations([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error adding automations to folder:', error);
      setError('Failed to add automations to folder');
    }
  };

  // Navigate to folder
  const openFolder = async (folder: Folder) => {
    setLoading(true);
    try {
      const contents = await getFolderContents(folder.id);
      setCurrentFolder(folder);
      setFolderContents(contents);
      setSelectedAutomations([]);
      setViewFilter('all'); // Reset filter when entering folder
    } catch (error) {
      console.error('Error loading folder contents:', error);
      setError('Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  };

  // Load folder contents
  const loadFolderContents = async (folderId: string) => {
    try {
      const contents = await getFolderContents(folderId);
      setFolderContents(contents);
    } catch (error) {
      console.error('Error reloading folder contents:', error);
    }
  };

  // Go back to main view
  const goBack = () => {
    setCurrentFolder(null);
    setFolderContents([]);
    setSelectedAutomations([]);
  };

  // Handle batch delete automation
  const handleBatchDeleteAutomations = async () => {
    if (selectedAutomations.length === 0) return;

    // Create custom modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl';
    modal.innerHTML = `
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete ${selectedAutomations.length} Automation${selectedAutomations.length !== 1 ? 's' : ''}</h3>
        <p class="text-gray-600 mb-4">
          Are you sure you want to permanently delete <strong>${selectedAutomations.length} automation${selectedAutomations.length !== 1 ? 's' : ''}</strong>?
          This action cannot be undone.
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Type "confirm" to delete:
          </label>
          <input
            type="text"
            id="confirmInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="confirm"
          />
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button
          id="cancelBtn"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          id="deleteBtn"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Delete All
        </button>
      </div>
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    const confirmInput = document.getElementById('confirmInput') as HTMLInputElement;
    const deleteBtn = document.getElementById('deleteBtn') as HTMLButtonElement;
    const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;

    // Enable delete button only when "confirm" is typed
    confirmInput?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      deleteBtn.disabled = value !== 'confirm';
    });

    // Handle cancel
    const handleCancel = () => {
      document.body.removeChild(modalOverlay);
    };

    cancelBtn?.addEventListener('click', handleCancel);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) handleCancel();
    });

    // Handle delete
    deleteBtn?.addEventListener('click', async () => {
      document.body.removeChild(modalOverlay);

      setIsBatchDeleting(true);
      try {
        const result = await batchDeleteAutomations(selectedAutomations);
        console.log('Batch delete result:', result);

        // Show result notification
        if (result.failed > 0) {
          setError(`Deleted ${result.succeeded} of ${result.total} automations. ${result.failed} failed.`);
        }

        // Reload data to reflect changes
        if (currentFolder) {
          await loadFolderContents(currentFolder.id);
        } else {
          await loadData();
        }

        // Clear selection
        setSelectedAutomations([]);
      } catch (error) {
        console.error('Error batch deleting automations:', error);
        setError('Failed to delete automations');
      } finally {
        setIsBatchDeleting(false);
      }
    });
  };

  // Handle delete automation with custom modal
  const handleDeleteAutomation = async (automationId: string, automationName: string) => {
    // Create custom modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl';
    modal.innerHTML = `
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Automation</h3>
        <p class="text-gray-600 mb-4">
          Are you sure you want to permanently delete "<strong>${automationName}</strong>"?
          This action cannot be undone.
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Type "confirm" to delete:
          </label>
          <input
            type="text"
            id="confirmInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="confirm"
          />
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button
          id="cancelBtn"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          id="deleteBtn"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Delete
        </button>
      </div>
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    const confirmInput = document.getElementById('confirmInput') as HTMLInputElement;
    const deleteBtn = document.getElementById('deleteBtn') as HTMLButtonElement;
    const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;

    // Enable delete button only when "confirm" is typed
    confirmInput?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      deleteBtn.disabled = value !== 'confirm';
    });

    // Handle cancel
    const handleCancel = () => {
      document.body.removeChild(modalOverlay);
    };

    cancelBtn?.addEventListener('click', handleCancel);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) handleCancel();
    });

    // Handle delete
    deleteBtn?.addEventListener('click', async () => {
      document.body.removeChild(modalOverlay);

      setDeletingId(automationId);
      try {
        await deleteAutomation(automationId);

        // Reload data to reflect changes
        if (currentFolder) {
          await loadFolderContents(currentFolder.id);
        } else {
          await loadData();
        }

        setOpenDropdown(null);
      } catch (error) {
        console.error('Error deleting automation:', error);
        setError('Failed to delete automation');
      } finally {
        setDeletingId(null);
      }
    });
  };

  // Handle rename folder
  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const newName = prompt('Enter new folder name:', currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) {
      return;
    }

    try {
      await updateFolder(folderId, { name: newName.trim() });

      // Update local state
      setFolders(prev => prev.map(f =>
        f.id === folderId ? { ...f, name: newName.trim() } : f
      ));

      // If we're currently in this folder, update currentFolder state
      if (currentFolder && currentFolder.id === folderId) {
        setCurrentFolder({ ...currentFolder, name: newName.trim() });
      }

      setOpenDropdown(null);
    } catch (error) {
      console.error('Error renaming folder:', error);
      setError('Failed to rename folder');
    }
  };

  // Handle delete folder
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    // Create custom modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl';
    modal.innerHTML = `
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Folder</h3>
        <p class="text-gray-600 mb-4">
          Are you sure you want to delete the folder "<strong>${folderName}</strong>"?
          Workflows inside this folder will be moved to the main view.
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Type "confirm" to delete:
          </label>
          <input
            type="text"
            id="confirmInput"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="confirm"
          />
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button
          id="cancelBtn"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          id="deleteBtn"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Delete Folder
        </button>
      </div>
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    const confirmInput = document.getElementById('confirmInput') as HTMLInputElement;
    const deleteBtn = document.getElementById('deleteBtn') as HTMLButtonElement;
    const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;

    // Enable delete button only when "confirm" is typed
    confirmInput?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      deleteBtn.disabled = value !== 'confirm';
    });

    // Handle cancel
    const handleCancel = () => {
      document.body.removeChild(modalOverlay);
    };

    cancelBtn?.addEventListener('click', handleCancel);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) handleCancel();
    });

    // Handle delete
    deleteBtn?.addEventListener('click', async () => {
      document.body.removeChild(modalOverlay);

      setDeletingFolderId(folderId);
      try {
        await deleteFolder(folderId);

        // Reload data to reflect changes
        await loadData();

        // If we're currently in this folder, go back to main view
        if (currentFolder && currentFolder.id === folderId) {
          goBack();
        }

        setOpenDropdown(null);
      } catch (error) {
        console.error('Error deleting folder:', error);
        setError('Failed to delete folder');
      } finally {
        setDeletingFolderId(null);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'draft':
        return 'text-gray-600 bg-gray-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-4">
            {currentFolder ? (
              <>
                <button 
                  onClick={goBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <Home className="h-4 w-4" />
                  <span className="text-sm">Back</span>
                </button>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-medium text-gray-900">{currentFolder.name}</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Automations</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {currentFolder ? currentFolder.name : 'Automations'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {currentFolder 
                  ? `${folderContents.length} automation${folderContents.length !== 1 ? 's' : ''} in this folder`
                  : 'Organize and manage your automated workflows'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCreateFolder}
                disabled={isCreatingFolder}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderPlus className="h-4 w-4" />
                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
              <button 
                onClick={handleCreateAutomation}
                disabled={isCreating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                {isCreating ? 'Creating...' : 'Create Workflow'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Workflows
              </button>
            </nav>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* View Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">View:</span>
                <select
                  value={viewFilter}
                  onChange={(e) => setViewFilter(e.target.value as 'all' | 'folders' | 'automations')}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All ({displayFolders.length + displayAutomations.length})</option>
                  <option value="folders">Folders ({displayFolders.length})</option>
                  <option value="automations">Automations ({displayAutomations.length})</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={loadData} 
              className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}


        {/* Actions Header */}
        {displayAutomations.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={displayAutomations.length > 0 && selectedAutomations.length === displayAutomations.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Select all automations
                  </span>
                </div>
                {selectedAutomations.length > 0 && (
                  <span className="text-blue-800 font-medium">
                    {selectedAutomations.length} selected
                  </span>
                )}
              </div>
              {selectedAutomations.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => e.target.value && handleAddToFolder(e.target.value)}
                    value=""
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm"
                  >
                    <option value="">Add to folder...</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBatchDeleteAutomations}
                    disabled={isBatchDeleting}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isBatchDeleting ? 'Deleting...' : 'Delete Selected'}
                  </button>
                  <button
                    onClick={() => setSelectedAutomations([])}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Area - File Manager Style */}
        <div className="bg-white border border-gray-200 rounded-lg">
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : currentFolder ? (
            /* Folder Contents View */
            <div>
              {folderContents.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-2">This folder is empty</p>
                  <p className="text-sm text-gray-400">Add automations to this folder to organize your work</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {folderContents.map((automation) => (
                    <div
                      key={automation.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/automations/automationsEditor/${automation.id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <RefreshCw className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{automation.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(automation.status)}`}>
                              {automation.status}
                            </span>
                            <span className="text-xs text-gray-500">{automation.totalEnrolled} enrolled</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(automation.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === automation.id ? null : automation.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                          </button>
                          {openDropdown === automation.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAutomation(automation.id, automation.name);
                                }}
                                disabled={deletingId === automation.id}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingId === automation.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Main View - Folders and Unfoldered Automations */
            <div>
              {displayFolders.length === 0 && displayAutomations.length === 0 ? (
                <div className="p-12 text-center">
                  <List className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-2">
                    {searchQuery ? 'No items found matching your search' : 'No items found'}
                  </p>
                  <p className="text-sm text-gray-400">Create folders and automations to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {/* Folders First */}
                  {displayFolders.map((folder) => (
                    <div 
                      key={`folder-${folder.id}`} 
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openFolder(folder)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FolderPlus className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {folder.automationCount} automation{folder.automationCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </span>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === `folder-${folder.id}` ? null : `folder-${folder.id}`);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                          </button>
                          {openDropdown === `folder-${folder.id}` && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameFolder(folder.id, folder.name);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                              >
                                <Edit className="h-4 w-4" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id, folder.name);
                                }}
                                disabled={deletingFolderId === folder.id}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingFolderId === folder.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Unfoldered Automations */}
                  {displayAutomations.map((automation) => (
                    <div
                      key={`automation-${automation.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedAutomations.includes(automation.id)}
                          onChange={(e) => handleSelectAutomation(automation.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <RefreshCw className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => router.push(`/automations/automationsEditor/${automation.id}`)}
                        >
                          <p className="text-sm font-medium text-gray-900 truncate hover:text-primary-600 transition-colors">
                            {automation.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(automation.status)}`}>
                              {automation.status}
                            </span>
                            <span className="text-xs text-gray-500">{automation.totalEnrolled} enrolled</span>
                            <span className="text-xs text-gray-500">{automation.activeEnrolled} active</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(automation.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === automation.id ? null : automation.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                          </button>
                          {openDropdown === automation.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAutomation(automation.id, automation.name);
                                }}
                                disabled={deletingId === automation.id}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingId === automation.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty State for other tabs */}

        {activeTab === 'deleted' && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Deleted Workflows</h3>
            <p className="text-gray-500">No deleted workflows to show.</p>
          </div>
        )}

        {activeTab === 'smart-list' && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <List className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create Smart List</h3>
            <p className="text-gray-500 mb-4">Smart lists automatically organize workflows based on criteria you set.</p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Create Smart List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}