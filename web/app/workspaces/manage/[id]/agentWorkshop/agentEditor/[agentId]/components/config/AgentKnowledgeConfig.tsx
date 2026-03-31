/**
 * AgentKnowledgeConfig
 *
 * Complete knowledge base configuration with document management.
 */

'use client';

import { useState } from 'react';
import { Brain, Library, FileText } from 'lucide-react';
import { Agent } from '../../types';
import { useAuth } from '@/contexts/AuthContext';
import { useKnowledgeBase } from '../../services/useKnowledgeBase';
import DocumentBrowser from './knowledge/DocumentBrowser';
import AttachedDocuments from './knowledge/AttachedDocuments';
import RemoveDocumentModal from './knowledge/RemoveDocumentModal';
import { AgentKnowledgeBaseDocument } from '@/lib/services/agentService';

interface AgentKnowledgeConfigProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}

export default function AgentKnowledgeConfig({ agent, onUpdate }: AgentKnowledgeConfigProps) {
  const { tenant } = useAuth();
  const [isDocumentBrowserOpen, setIsDocumentBrowserOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [documentToRemove, setDocumentToRemove] = useState<AgentKnowledgeBaseDocument | null>(
    null
  );
  const [isRemovingDocument, setIsRemovingDocument] = useState(false);

  const {
    availableDocuments,
    filteredDocuments,
    attachedDocuments,
    selectedDocuments,
    isLoadingAvailable,
    isLoadingAttached,
    isUpdating,
    error,
    searchQuery,
    setSearchQuery,
    toggleDocumentSelection,
    isDocumentSelected,
    updateKnowledgeBase,
    removeDocument,
    getDocumentTypeConfig,
  } = useKnowledgeBase(agent.id!, tenant?.id || '');

  const ragSettings = agent.ragSettings || {};

  const handleOpenDocumentBrowser = () => {
    setIsDocumentBrowserOpen(true);
  };

  const handleSaveDocuments = async () => {
    try {
      await updateKnowledgeBase('replace');
      setIsDocumentBrowserOpen(false);
    } catch (err) {
      console.error('Error saving documents:', err);
    }
  };

  const handleOpenRemoveModal = (document: AgentKnowledgeBaseDocument) => {
    setDocumentToRemove(document);
    setIsRemoveModalOpen(true);
  };

  const handleCloseRemoveModal = () => {
    setDocumentToRemove(null);
    setIsRemoveModalOpen(false);
  };

  const handleConfirmRemove = async () => {
    if (!documentToRemove?.internalDocumentId) return;

    try {
      setIsRemovingDocument(true);
      await removeDocument(documentToRemove.internalDocumentId);
      handleCloseRemoveModal();
    } catch (err) {
      console.error('Error removing document:', err);
    } finally {
      setIsRemovingDocument(false);
    }
  };

  const handleRagUpdate = (updates: any) => {
    onUpdate({
      ragSettings: {
        ...ragSettings,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Knowledge Base</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure documents and settings for your agent's knowledge
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* RAG Settings */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">RAG Enabled</p>
              <p className="text-xs text-slate-500">
                Retrieve context from knowledge base for responses
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={ragSettings.enabled || false}
              onChange={(e) => handleRagUpdate({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* RAG Settings - Only show when enabled */}
        {ragSettings.enabled && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            {/* Max Retrieved Chunks */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Max Retrieved Chunks
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={ragSettings.max_retrieved_rag_chunks_count || 10}
                onChange={(e) =>
                  handleRagUpdate({ max_retrieved_rag_chunks_count: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Number of relevant chunks to retrieve from knowledge base
              </p>
            </div>

            {/* Max Documents Length */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Max Documents Length
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={ragSettings.max_documents_length || 1000}
                onChange={(e) =>
                  handleRagUpdate({ max_documents_length: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Maximum length of retrieved document context
              </p>
            </div>

            {/* Max Vector Distance */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Max Vector Distance
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={ragSettings.max_vector_distance || 0.5}
                onChange={(e) =>
                  handleRagUpdate({ max_vector_distance: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Maximum distance for vector similarity (0-1, lower is more similar)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Attached Documents */}
      <AttachedDocuments
        documents={attachedDocuments}
        isLoading={isLoadingAttached}
        onRemove={handleOpenRemoveModal}
      />

      {/* Document Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">Manage Documents</label>
          <button
            onClick={handleOpenDocumentBrowser}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1.5 font-medium"
          >
            <Library className="h-4 w-4" />
            Browse Knowledge Base
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Select documents from your knowledge base to include in this agent's context.
        </p>
      </div>

      {/* Selected Documents Preview */}
      {selectedDocuments.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-900">
              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''}{' '}
              selected for next update
            </p>
          </div>
        </div>
      )}

      {/* Last Update */}
      {agent.lastKnowledgeBaseUpdate && (
        <p className="text-xs text-slate-400">
          Last updated: {new Date(agent.lastKnowledgeBaseUpdate).toLocaleString()}
        </p>
      )}

      {/* Modals */}
      <DocumentBrowser
        isOpen={isDocumentBrowserOpen}
        onClose={() => setIsDocumentBrowserOpen(false)}
        onSave={handleSaveDocuments}
        availableDocuments={availableDocuments}
        filteredDocuments={filteredDocuments}
        selectedDocuments={selectedDocuments}
        isLoading={isLoadingAvailable}
        isUpdating={isUpdating}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleDocument={toggleDocumentSelection}
        isDocumentSelected={isDocumentSelected}
        getDocumentTypeConfig={getDocumentTypeConfig}
      />

      <RemoveDocumentModal
        isOpen={isRemoveModalOpen}
        document={documentToRemove}
        isRemoving={isRemovingDocument}
        onConfirm={handleConfirmRemove}
        onCancel={handleCloseRemoveModal}
      />
    </div>
  );
}
