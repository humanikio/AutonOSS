/**
 * AttachedDocuments
 *
 * Displays currently attached knowledge base documents with remove functionality.
 */

'use client';

import { Database, Loader2, Trash2 } from 'lucide-react';
import { AgentKnowledgeBaseDocument } from '@/lib/services/agentService';

interface AttachedDocumentsProps {
  documents: AgentKnowledgeBaseDocument[];
  isLoading: boolean;
  onRemove: (document: AgentKnowledgeBaseDocument) => void;
}

export default function AttachedDocuments({
  documents,
  isLoading,
  onRemove,
}: AttachedDocumentsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 bg-slate-50 rounded-lg border border-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400 mr-2" />
        <span className="text-sm text-slate-600">Loading attached documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
        <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No knowledge base documents currently attached</p>
        <p className="text-xs text-slate-400 mt-1">Use the selection modal below to add documents</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-slate-700">
          Currently Attached Documents
        </label>
        {documents.length > 0 && (
          <span className="text-xs text-slate-500">
            Last updated:{' '}
            {documents[0]?.attachedAt
              ? new Date(documents[0].attachedAt).toLocaleDateString()
              : 'Unknown'}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.elevenLabsDocId}
            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg group hover:border-green-300 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <Database className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {doc.internalDocumentTitle}
                  </p>
                  <span className="px-2 py-0.5 text-xs rounded-md bg-green-100 text-green-700 flex-shrink-0">
                    {doc.elevenLabsDocType}
                  </span>
                </div>
                <p className="text-xs text-slate-500">11Labs ID: {doc.elevenLabsDocId}</p>
                {doc.internalDocumentId && (
                  <p className="text-xs text-slate-400">Internal ID: {doc.internalDocumentId}</p>
                )}
                <p className="text-xs text-slate-400">
                  Attached: {new Date(doc.attachedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => onRemove(doc)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Remove document from agent"
            >
              <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
