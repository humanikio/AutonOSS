/**
 * RemoveDocumentModal
 *
 * Confirmation modal for removing a document from the agent's knowledge base.
 */

'use client';

import { Database, Loader2, Trash2 } from 'lucide-react';
import { AgentKnowledgeBaseDocument } from '@/lib/services/agentService';

interface RemoveDocumentModalProps {
  isOpen: boolean;
  document: AgentKnowledgeBaseDocument | null;
  isRemoving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RemoveDocumentModal({
  isOpen,
  document,
  isRemoving,
  onConfirm,
  onCancel,
}: RemoveDocumentModalProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Remove Document</h3>
              <p className="text-sm text-slate-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-slate-700">
              Are you sure you want to remove{' '}
              <span className="font-semibold">"{document.internalDocumentTitle}"</span> from this
              agent's knowledge base?
            </p>
          </div>

          {/* Document Info */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Database className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {document.internalDocumentTitle}
                </p>
                <p className="text-xs text-slate-500">
                  Type: {document.elevenLabsDocType} • Attached:{' '}
                  {new Date(document.attachedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-1 flex-shrink-0">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Impact:</span> The agent will no longer have access
                  to this document's information and may provide different responses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onCancel}
            disabled={isRemoving}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isRemoving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRemoving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRemoving ? 'Removing...' : 'Remove Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
