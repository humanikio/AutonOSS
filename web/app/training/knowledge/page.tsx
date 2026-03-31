'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { listDocuments, loadDocument, createBaselineDocument, createDocument, deleteDocument, KBDocument } from '@/lib/api/kbDocuments';
import { Search, Filter, Calendar, Tag, Plus, FileText, Book, ChevronRight, X, Edit2, MoreVertical, Trash2 } from 'lucide-react';
import BaselineDocumentModal from '../../../components/modals/BaselineDocumentModal';

// Type definitions - using KBDocument from API

// Asset type configurations
const ASSET_TYPES = {
  policy: { label: 'Policy', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700' },
  procedure: { label: 'Procedure', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-700' },
  guide: { label: 'Guide', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700' },
  script: { label: 'Script', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700' },
  reference: { label: 'Reference', color: 'bg-gray-500', lightColor: 'bg-gray-50', textColor: 'text-gray-700' },
};

export default function KnowledgeHub() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Document states
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [baselineDocument, setBaselineDocument] = useState<KBDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBaseline, setIsCreatingBaseline] = useState(false);
  
  // Modal states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  
  // Menu states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load documents from API
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      try {
        // Load all documents
        const allDocs = await listDocuments();
        
        // Separate baseline from other documents
        const baseline = allDocs.find(doc => doc.id === 'baseline');
        const otherDocs = allDocs.filter(doc => doc.id !== 'baseline');
        
        setBaselineDocument(baseline || null);
        setDocuments(otherDocs);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Get all unique tags from documents
  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags)));

  // Filter documents based on search and filters
  const filteredAssets = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => doc.tags.includes(tag));
    
    const matchesTypes = selectedTypes.length === 0 || 
      selectedTypes.includes(doc.type);
    
    // Date filtering logic
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const assetDate = new Date(doc.updatedAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = assetDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          matchesDate = assetDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          matchesDate = assetDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesTags && matchesTypes && matchesDate;
  });

  const handleCreateAsset = () => {
    setNewAssetName('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateNewDocument = async () => {
    if (!newAssetName.trim()) return;
    
    setIsCreating(true);
    try {
      // Create the document with the given name
      const newDocument = await createDocument({
        title: newAssetName.trim(),
        description: '',
        content: '',
        type: 'guide', // Default type
        tags: []
      });
      
      console.log('Document created:', newDocument);
      
      // Close dialog and redirect to workshop
      setIsCreateDialogOpen(false);
      setNewAssetName('');
      router.push(`/training/knowledge/workshop/${newDocument.id}`);
      
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setIsDeleting(true);
    try {
      await deleteDocument(docId);
      console.log('Document deleted successfully');
      
      // Remove from local state
      setDocuments(docs => docs.filter(d => d.id !== docId));
      
      // Close confirmation dialog
      setDeleteConfirmId(null);
      setOpenMenuId(null);
      
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle baseline document creation
  const handleCreateBaseline = async () => {
    setIsCreatingBaseline(true);
    
    try {
      const newBaselineDocument = await createBaselineDocument();
      setBaselineDocument(newBaselineDocument);
      console.log('Baseline document created successfully');
      
      // Redirect to workshop to edit the new baseline document
      router.push('/training/knowledge/workshop/baseline');
    } catch (error) {
      console.error('Error creating baseline document:', error);
    } finally {
      setIsCreatingBaseline(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(tags =>
      tags.includes(tag)
        ? tags.filter(t => t !== tag)
        : [...tags, tag]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(types =>
      types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">Knowledge Hub</h1>
          <p className="mt-2 text-gray-500">Centralized training resources for your AI agents</p>
        </div>

        {/* Baseline Document Section */}
        <div className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Company Baseline</h2>
            <p className="text-sm text-gray-500">Core information accessible to all agents</p>
          </div>
          
          {isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gray-200 rounded-lg h-12 w-12"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded mb-2 w-48"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3 w-64"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-18"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : baselineDocument ? (
            <div 
              onClick={() => router.push('/training/knowledge/workshop/baseline')}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Book className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{baselineDocument.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{baselineDocument.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {baselineDocument.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Last updated: {new Date(baselineDocument.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          ) : (
            <div 
              onClick={handleCreateBaseline}
              className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    {isCreatingBaseline ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                    ) : (
                      <Plus className="h-6 w-6 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-700">Create Company Baseline</h3>
                    <p className="text-sm text-gray-500 mt-1">Set up essential company information for your AI agents</p>
                    <p className="text-xs text-gray-400 mt-2">This document will help your agents provide consistent, accurate responses</p>
                  </div>
                </div>
                {isCreatingBaseline && (
                  <div className="text-sm text-gray-500">Creating...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Training Assets Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900">Training Assets</h2>
            <p className="text-sm text-gray-500">Policies, procedures, and guides for specific situations</p>
          </div>

          {/* Search and Filters Bar */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 bg-white border rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                  showFilters ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-700'
                }`}
              >
                <Filter className="h-5 w-5" />
                Filters
                {(selectedTags.length > 0 || selectedTypes.length > 0 || dateFilter !== 'all') && (
                  <span className="ml-1 px-2 py-0.5 bg-primary-100 text-primary-600 text-xs rounded-full">
                    {selectedTags.length + selectedTypes.length + (dateFilter !== 'all' ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Date Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Date Modified</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' },
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setDateFilter(option.value)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          dateFilter === option.value
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Document Type</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ASSET_TYPES).map(([type, config]) => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          selectedTypes.includes(type)
                            ? `${config.lightColor} ${config.textColor}`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {(selectedTags.length > 0 || selectedTypes.length > 0 || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedTags([]);
                      setSelectedTypes([]);
                      setDateFilter('all');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Add New Asset Card */}
            <div
              onClick={handleCreateAsset}
              className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer group min-h-[200px] flex flex-col items-center justify-center"
            >
              <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors mb-3">
                <Plus className="h-6 w-6 text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Create New Asset</p>
              <p className="text-xs text-gray-400 mt-1">Add a training document</p>
            </div>

            {/* Asset Cards */}
            {filteredAssets.map(asset => {
              const typeConfig = ASSET_TYPES[asset.type];
              return (
                <div
                  key={asset.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all group min-h-[200px] flex flex-col relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 ${typeConfig.lightColor} rounded-lg`}>
                      <FileText className={`h-5 w-5 ${typeConfig.textColor}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-md ${typeConfig.lightColor} ${typeConfig.textColor}`}>
                        {typeConfig.label}
                      </span>
                      
                      {/* 3-dot Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === asset.id ? null : asset.id);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openMenuId === asset.id && (
                          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(asset.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Clickable content area */}
                  <div 
                    onClick={() => router.push(`/training/knowledge/workshop/${asset.id}`)}
                    className="flex-1 cursor-pointer"
                  >
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{asset.title}</h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">{asset.description}</p>
                    
                    <div className="space-y-2">
                      {asset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          {asset.tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              +{asset.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{asset.author}</span>
                        <span>{new Date(asset.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No assets found matching your criteria</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTags([]);
                  setSelectedTypes([]);
                  setDateFilter('all');
                }}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Document Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Document</h3>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Name
              </label>
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Enter document name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newAssetName.trim()) {
                    handleCreateNewDocument();
                  }
                }}
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewDocument}
                disabled={!newAssetName.trim() || isCreating}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteConfirmId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <BaselineDocumentModal
        isOpen={isBaselineModalOpen}
        onClose={() => setIsBaselineModalOpen(false)}
        document={baselineDocument as any}
        onSave={(updatedDoc) => {
          setBaselineDocument({ ...updatedDoc, lastUpdated: new Date().toISOString().split('T')[0] } as any);
          setIsBaselineModalOpen(false);
        }}
      />
    </div>
  );
}