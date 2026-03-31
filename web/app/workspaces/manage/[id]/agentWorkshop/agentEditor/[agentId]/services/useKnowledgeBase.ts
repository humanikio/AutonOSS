/**
 * useKnowledgeBase Hook
 *
 * Manages knowledge base documents, attachment to agents, and document selection.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listDocuments, KBDocument } from '@/lib/api/kbDocuments';
import { AgentService, AgentKnowledgeBaseDocument } from '@/lib/services/agentService';

interface UseKnowledgeBaseReturn {
  // Available documents from KB
  availableDocuments: KBDocument[];
  filteredDocuments: KBDocument[];

  // Attached documents on agent
  attachedDocuments: AgentKnowledgeBaseDocument[];

  // Selection state
  selectedDocuments: KBDocument[];

  // Loading states
  isLoadingAvailable: boolean;
  isLoadingAttached: boolean;
  isUpdating: boolean;

  // Error state
  error: string | null;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Document selection
  toggleDocumentSelection: (document: KBDocument) => void;
  clearSelection: () => void;
  isDocumentSelected: (documentId: string) => boolean;

  // Knowledge base operations
  updateKnowledgeBase: (action: 'add' | 'remove' | 'replace', documentIds?: string[]) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
  refreshAttachedDocuments: () => Promise<void>;

  // Utilities
  getDocumentTypeConfig: (type: string) => {
    label: string;
    color: string;
    lightColor: string;
    textColor: string;
    icon: any;
  };
}

// Document type configurations
const DOCUMENT_TYPES = {
  policy: {
    label: 'Policy',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: 'ClipboardList',
  },
  procedure: {
    label: 'Procedure',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    icon: 'FileText',
  },
  guide: {
    label: 'Guide',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: 'BookOpen',
  },
  script: {
    label: 'Script',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    icon: 'Scroll',
  },
  reference: {
    label: 'Reference',
    color: 'bg-gray-500',
    lightColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: 'Book',
  },
};

export function useKnowledgeBase(
  agentId: string,
  tenantId: string
): UseKnowledgeBaseReturn {
  const { getToken } = useAuth();

  // State
  const [availableDocuments, setAvailableDocuments] = useState<KBDocument[]>([]);
  const [attachedDocuments, setAttachedDocuments] = useState<AgentKnowledgeBaseDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<KBDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isLoadingAttached, setIsLoadingAttached] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load available documents from knowledge base
   */
  const loadAvailableDocuments = useCallback(async () => {
    setIsLoadingAvailable(true);
    setError(null);

    try {
      const docs = await listDocuments();
      setAvailableDocuments(docs);
    } catch (err) {
      console.error('Error loading KB documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  /**
   * Load attached documents from agent
   */
  const loadAttachedDocuments = useCallback(async () => {
    if (!tenantId || !agentId) return;

    setIsLoadingAttached(true);
    setError(null);

    try {
      const agent = await AgentService.getAgent(tenantId, agentId);

      if (agent?.knowledgeBaseDocuments) {
        console.log('📚 Loaded attached knowledge base documents:', agent.knowledgeBaseDocuments);
        setAttachedDocuments(agent.knowledgeBaseDocuments);
      } else {
        setAttachedDocuments([]);
      }
    } catch (err) {
      console.error('Error loading attached documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attached documents');
      setAttachedDocuments([]);
    } finally {
      setIsLoadingAttached(false);
    }
  }, [tenantId, agentId]);

  /**
   * Refresh attached documents
   */
  const refreshAttachedDocuments = useCallback(async () => {
    await loadAttachedDocuments();
  }, [loadAttachedDocuments]);

  /**
   * Initial load
   */
  useEffect(() => {
    if (tenantId && agentId) {
      loadAvailableDocuments();
      loadAttachedDocuments();
    }
  }, [tenantId, agentId]);

  /**
   * Filter documents based on search query
   */
  const filteredDocuments = availableDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Toggle document selection
   */
  const toggleDocumentSelection = useCallback((document: KBDocument) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(doc => doc.id === document.id);
      if (isSelected) {
        return prev.filter(doc => doc.id !== document.id);
      } else {
        return [...prev, document];
      }
    });
  }, []);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedDocuments([]);
  }, []);

  /**
   * Check if document is selected
   */
  const isDocumentSelected = useCallback((documentId: string): boolean => {
    return selectedDocuments.some(doc => doc.id === documentId);
  }, [selectedDocuments]);

  /**
   * Update agent knowledge base
   */
  const updateKnowledgeBase = useCallback(
    async (action: 'add' | 'remove' | 'replace', documentIds?: string[]) => {
      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      setIsUpdating(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const idsToUpdate = documentIds || selectedDocuments.map(doc => doc.id);
        console.log(`🔄 ${action} agent knowledge base...`, idsToUpdate);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/agents/${agentId}/knowledge-base`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            documentIds: idsToUpdate,
            action,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update knowledge base');
        }

        const result = await response.json();

        if (result.success) {
          console.log('✅ Successfully updated agent knowledge base');

          // Log attached documents
          if (result.data?.attachedDocuments) {
            console.log('📎 Attached documents:', result.data.attachedDocuments);
          }

          // Refresh attached documents
          await loadAttachedDocuments();

          // Clear selection if it was a replace operation
          if (action === 'replace') {
            setSelectedDocuments([]);
          }
        } else {
          throw new Error(result.error || 'Failed to update knowledge base');
        }
      } catch (err) {
        console.error('❌ Error updating agent knowledge base:', err);
        setError(err instanceof Error ? err.message : 'Failed to update knowledge base');
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [agentId, getToken, selectedDocuments, loadAttachedDocuments]
  );

  /**
   * Remove single document from agent
   */
  const removeDocument = useCallback(
    async (documentId: string) => {
      await updateKnowledgeBase('remove', [documentId]);
    },
    [updateKnowledgeBase]
  );

  /**
   * Get document type configuration
   */
  const getDocumentTypeConfig = useCallback((type: string) => {
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES] || DOCUMENT_TYPES.reference;
  }, []);

  return {
    // Available documents
    availableDocuments,
    filteredDocuments,

    // Attached documents
    attachedDocuments,

    // Selection
    selectedDocuments,

    // Loading states
    isLoadingAvailable,
    isLoadingAttached,
    isUpdating,

    // Error
    error,

    // Search
    searchQuery,
    setSearchQuery,

    // Document selection
    toggleDocumentSelection,
    clearSelection,
    isDocumentSelected,

    // Operations
    updateKnowledgeBase,
    removeDocument,
    refreshAttachedDocuments,

    // Utilities
    getDocumentTypeConfig,
  };
}
