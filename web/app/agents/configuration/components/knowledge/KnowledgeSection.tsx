'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Library, CheckCircle, FileText, Book, ClipboardList, Scroll, BookOpen, Search, Loader, Database, Trash2 } from 'lucide-react';
import { ConfigurationSectionProps } from '../../types';
import { listDocuments, KBDocument } from '@/lib/api/kbDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { AgentKnowledgeBaseDocument, AgentService } from '@/lib/services/agentService';

// Document type configurations
const DOCUMENT_TYPES = {
  policy: { label: 'Policy', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700', icon: ClipboardList },
  procedure: { label: 'Procedure', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-700', icon: FileText },
  guide: { label: 'Guide', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700', icon: BookOpen },
  script: { label: 'Script', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700', icon: Scroll },
  reference: { label: 'Reference', color: 'bg-gray-500', lightColor: 'bg-gray-50', textColor: 'text-gray-700', icon: Book },
};

const getDocumentTypeConfig = (type: string) => {
  return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES] || DOCUMENT_TYPES.reference;
};

const getDocumentIcon = (type: string) => {
  return getDocumentTypeConfig(type).icon;
};

export default function KnowledgeSection({ agentId, config, onUpdate }: ConfigurationSectionProps) {
  const { isAuthenticated, getToken, tenant } = useAuth();
  const [availableDocuments, setAvailableDocuments] = useState<KBDocument[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<KBDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(8);
  const [isUpdatingKnowledgeBase, setIsUpdatingKnowledgeBase] = useState(false);
  const [originalSelectedDocuments, setOriginalSelectedDocuments] = useState<KBDocument[]>([]);
  const [attachedKnowledgeDocuments, setAttachedKnowledgeDocuments] = useState<AgentKnowledgeBaseDocument[]>([]);
  const [loadingAttachedDocuments, setLoadingAttachedDocuments] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [documentToRemove, setDocumentToRemove] = useState<AgentKnowledgeBaseDocument | null>(null);
  const [isRemovingDocument, setIsRemovingDocument] = useState(false);

  // Load available documents from the knowledge base
  useEffect(() => {
    const loadKBDocuments = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoadingDocuments(true);
        const docs = await listDocuments();
        setAvailableDocuments(docs);
      } catch (error) {
        console.error('Error loading KB documents:', error);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadKBDocuments();
  }, [isAuthenticated]);

  // Load attached knowledge base documents from agent
  useEffect(() => {
    const loadAttachedDocuments = async () => {
      if (!tenant?.id || !agentId) return;
      
      try {
        setLoadingAttachedDocuments(true);
        const agent = await AgentService.getAgent(tenant.id, agentId);
        
        if (agent?.knowledgeBaseDocuments) {
          console.log('📚 Loaded attached knowledge base documents:', agent.knowledgeBaseDocuments);
          setAttachedKnowledgeDocuments(agent.knowledgeBaseDocuments);
        } else {
          setAttachedKnowledgeDocuments([]);
        }
      } catch (error) {
        console.error('Error loading attached knowledge base documents:', error);
        setAttachedKnowledgeDocuments([]);
      } finally {
        setLoadingAttachedDocuments(false);
      }
    };

    loadAttachedDocuments();
  }, [tenant?.id, agentId]);

  // Initialize selected documents from config
  useEffect(() => {
    if (config.knowledge?.selectedDocuments) {
      setSelectedDocuments(config.knowledge.selectedDocuments);
      setOriginalSelectedDocuments(config.knowledge.selectedDocuments);
    }
  }, [config.knowledge?.selectedDocuments]);

  const handleKnowledgeUpdate = (knowledgeUpdates: any) => {
    onUpdate({
      knowledge: {
        ...config.knowledge,
        ...knowledgeUpdates
      }
    });
  };

  const addSource = () => {
    const sources = config.knowledge?.sources || [];
    handleKnowledgeUpdate({ sources: [...sources, ''] });
  };

  const updateSource = (index: number, value: string) => {
    const sources = [...(config.knowledge?.sources || [])];
    sources[index] = value;
    handleKnowledgeUpdate({ sources });
  };

  const removeSource = (index: number) => {
    const sources = config.knowledge?.sources?.filter((_, i) => i !== index) || [];
    handleKnowledgeUpdate({ sources });
  };

  const handleDocumentSelection = (document: KBDocument) => {
    const isSelected = selectedDocuments.some(doc => doc.id === document.id);
    let newSelection: KBDocument[];
    
    if (isSelected) {
      newSelection = selectedDocuments.filter(doc => doc.id !== document.id);
    } else {
      newSelection = [...selectedDocuments, document];
    }
    
    setSelectedDocuments(newSelection);
    handleKnowledgeUpdate({ selectedDocuments: newSelection });
  };

  const removeSelectedDocument = (documentId: string) => {
    const newSelection = selectedDocuments.filter(doc => doc.id !== documentId);
    setSelectedDocuments(newSelection);
    handleKnowledgeUpdate({ selectedDocuments: newSelection });
  };

  // Update agent knowledge base via API
  const updateAgentKnowledgeBase = async (action: 'add' | 'remove' | 'replace' = 'replace', specificDocumentIds?: string[]) => {
    if (!agentId) {
      console.error('Agent ID is required');
      return;
    }

    try {
      setIsUpdatingKnowledgeBase(true);
      const token = await getToken();
      
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      console.log(`🔄 ${action === 'remove' ? 'Removing from' : 'Updating'} agent knowledge base...`);
      
      const documentIds = specificDocumentIds || selectedDocuments.map(doc => doc.id);
      console.log('📄 Document IDs:', documentIds);

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentId}/knowledge-base`;
      console.log('🌐 Making API request to:', apiUrl);
      console.log('📦 Request payload:', { documentIds, action });

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentIds,
          action
        })
      });

      console.log('📡 Response status:', response.status, response.statusText);

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        const responseText = await response.text();
        console.error('📄 Raw response:', responseText);
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}...`);
      }
      
      console.log('📋 Knowledge base update response:', {
        status: response.status,
        success: result.success,
        message: result.message,
        data: result.data
      });

      if (response.ok && result.success) {
        console.log('✅ Successfully updated agent knowledge base');
        
        // Log attached documents for debugging
        if (result.data?.attachedDocuments) {
          console.log('📎 Attached documents:', result.data.attachedDocuments);
          result.data.attachedDocuments.forEach((doc: any) => {
            console.log(`  - ${doc.documentTitle} (Internal: ${doc.documentId} → 11Labs: ${doc.elevenLabsDocId})`);
          });
        }

        // Update the original state to match current selection
        setOriginalSelectedDocuments([...selectedDocuments]);
        
        // Update the parent component state
        handleKnowledgeUpdate({ selectedDocuments });
        
        // Reload attached documents to show the latest state
        try {
          const agent = await AgentService.getAgent(tenant!.id, agentId);
          if (agent?.knowledgeBaseDocuments) {
            console.log('🔄 Reloaded attached knowledge base documents after update:', agent.knowledgeBaseDocuments);
            setAttachedKnowledgeDocuments(agent.knowledgeBaseDocuments);
          }
        } catch (error) {
          console.error('Error reloading attached documents:', error);
        }
      } else {
        console.error('❌ Failed to update agent knowledge base:', {
          error: result.error,
          details: result.details
        });
        
        // Show user-friendly error message (you might want to add toast notifications)
        alert(`Failed to update knowledge base: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error updating agent knowledge base:', error);
      alert('Failed to update knowledge base. Please try again.');
    } finally {
      setIsUpdatingKnowledgeBase(false);
    }
  };

  // Handle opening the modal
  const openDocumentModal = () => {
    setOriginalSelectedDocuments([...selectedDocuments]);
    setShowDocumentModal(true);
  };

  // Handle closing the modal (revert changes)
  const closeDocumentModal = () => {
    setSelectedDocuments([...originalSelectedDocuments]);
    setShowDocumentModal(false);
    setSearchQuery('');
    setDisplayLimit(8);
  };

  // Handle saving changes and closing modal
  const handleDoneClick = async () => {
    await updateAgentKnowledgeBase('replace');
    setShowDocumentModal(false);
    setSearchQuery('');
    setDisplayLimit(8);
  };

  // Open remove confirmation modal
  const openRemoveModal = (document: AgentKnowledgeBaseDocument) => {
    setDocumentToRemove(document);
    setShowRemoveModal(true);
  };

  // Close remove confirmation modal
  const closeRemoveModal = () => {
    setDocumentToRemove(null);
    setShowRemoveModal(false);
  };

  // Remove individual document from agent
  const removeDocumentFromAgent = async () => {
    if (!documentToRemove?.internalDocumentId) return;

    try {
      setIsRemovingDocument(true);
      await updateAgentKnowledgeBase('remove', [documentToRemove.internalDocumentId]);
      
      // Reload attached documents to show the latest state
      const agent = await AgentService.getAgent(tenant!.id, agentId);
      if (agent?.knowledgeBaseDocuments) {
        setAttachedKnowledgeDocuments(agent.knowledgeBaseDocuments);
      }
      
      closeRemoveModal();
    } catch (error) {
      console.error('Error removing document:', error);
      alert('Failed to remove document. Please try again.');
    } finally {
      setIsRemovingDocument(false);
    }
  };

  // Filter documents based on search query
  const filteredDocuments = availableDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get documents for current display limit
  const displayedDocuments = filteredDocuments.slice(0, displayLimit);
  const hasMoreDocuments = filteredDocuments.length > displayLimit;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Knowledge Base</h3>
      <p className="text-gray-600">Upload documents and configure your agent's knowledge sources.</p>
      
      {/* Currently Attached Documents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Currently Attached Documents
          </label>
          {attachedKnowledgeDocuments.length > 0 && (
            <span className="text-xs text-gray-500">
              Last updated: {attachedKnowledgeDocuments[0]?.attachedAt ? new Date(attachedKnowledgeDocuments[0].attachedAt).toLocaleDateString() : 'Unknown'}
            </span>
          )}
        </div>
        
        {loadingAttachedDocuments ? (
          <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
            <Loader className="h-5 w-5 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">Loading attached documents...</span>
          </div>
        ) : attachedKnowledgeDocuments.length > 0 ? (
          <div className="space-y-2">
            {attachedKnowledgeDocuments.map((doc, index) => (
              <div key={doc.elevenLabsDocId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <Database className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.internalDocumentTitle}</p>
                      <span className="px-2 py-0.5 text-xs rounded-md bg-green-100 text-green-700">
                        {doc.elevenLabsDocType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      11Labs ID: {doc.elevenLabsDocId}
                    </p>
                    {doc.internalDocumentId && (
                      <p className="text-xs text-gray-400">
                        Internal ID: {doc.internalDocumentId}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Attached: {new Date(doc.attachedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openRemoveModal(doc)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Remove document from agent"
                >
                  <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Database className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No knowledge base documents currently attached</p>
            <p className="text-xs text-gray-400 mt-1">Use the selection modal below to add documents</p>
          </div>
        )}
      </div>
      
      {/* Document Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Documents
          </label>
          <button
            onClick={openDocumentModal}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Library className="h-4 w-4" />
            Select from Knowledge Base
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          Select documents from your knowledge collections to include in this agent's context.
        </p>
      </div>

      {/* Selected Documents */}
      {selectedDocuments.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selected Documents ({selectedDocuments.length})
          </label>
          <div className="space-y-2">
            {selectedDocuments.map((doc) => {
              const typeConfig = getDocumentTypeConfig(doc.type);
              const IconComponent = getDocumentIcon(doc.type);
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${typeConfig.lightColor} rounded-lg flex-shrink-0`}>
                      <IconComponent className={`h-4 w-4 ${typeConfig.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-md ${typeConfig.lightColor} ${typeConfig.textColor}`}>
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {doc.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeSelectedDocument(doc.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Remove document"
                  >
                    <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Context Tokens
        </label>
        <input
          type="number"
          min="1000"
          max="32000"
          step="1000"
          value={config.knowledge?.maxTokens || 4000}
          onChange={(e) => handleKnowledgeUpdate({ maxTokens: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum number of tokens from knowledge base to include in context
        </p>
      </div>

      {/* Document Selection Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Knowledge Base Documents</h3>
              <button
                onClick={closeDocumentModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-2 text-gray-600">Loading documents...</span>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {availableDocuments.length === 0 ? 'No documents found' : 'No matching documents'}
                  </h4>
                  <p className="text-gray-500">
                    {availableDocuments.length === 0 
                      ? 'Go to Training → Knowledge to create documents.'
                      : 'Try adjusting your search criteria.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedDocuments.map((doc) => {
                    const isSelected = selectedDocuments.some(selected => selected.id === doc.id);
                    const typeConfig = getDocumentTypeConfig(doc.type);
                    const IconComponent = getDocumentIcon(doc.type);
                    
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors border ${
                          isSelected 
                            ? 'bg-primary-50 border-primary-200' 
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => handleDocumentSelection(doc)}
                      >
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5 text-primary-600" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                          )}
                        </div>
                        <div className={`p-2 ${typeConfig.lightColor} rounded-lg flex-shrink-0`}>
                          <IconComponent className={`h-5 w-5 ${typeConfig.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.title}
                            </p>
                            <span className={`px-2 py-0.5 text-xs rounded-md ${typeConfig.lightColor} ${typeConfig.textColor}`}>
                              {typeConfig.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mb-1">
                            {doc.description || 'No description'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View More Button */}
              {hasMoreDocuments && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 8)}
                    className="px-4 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    View More ({filteredDocuments.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={handleDoneClick}
                  disabled={isUpdatingKnowledgeBase}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUpdatingKnowledgeBase && <Loader className="h-4 w-4 animate-spin" />}
                  {isUpdatingKnowledgeBase ? 'Updating...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Document Confirmation Modal */}
      {showRemoveModal && documentToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Remove Document</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700">
                  Are you sure you want to remove <span className="font-semibold">"{documentToRemove.internalDocumentTitle}"</span> from this agent's knowledge base?
                </p>
              </div>

              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Database className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {documentToRemove.internalDocumentTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      Type: {documentToRemove.elevenLabsDocType} • Attached: {new Date(documentToRemove.attachedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-1">
                    <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Impact:</span> The agent will no longer have access to this document's information and may provide different responses.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeRemoveModal}
                  disabled={isRemovingDocument}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={removeDocumentFromAgent}
                  disabled={isRemovingDocument}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRemovingDocument && <Loader className="h-4 w-4 animate-spin" />}
                  {isRemovingDocument ? 'Removing...' : 'Remove Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}