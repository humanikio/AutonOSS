/**
 * DocumentBrowser
 *
 * Modal for browsing and selecting documents from the knowledge base.
 */

'use client';

import { useState } from 'react';
import {
  X,
  Search,
  CheckCircle,
  FileText,
  Book,
  ClipboardList,
  Scroll,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { KBDocument } from '@/lib/api/kbDocuments';

interface DocumentBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  availableDocuments: KBDocument[];
  filteredDocuments: KBDocument[];
  selectedDocuments: KBDocument[];
  isLoading: boolean;
  isUpdating: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleDocument: (document: KBDocument) => void;
  isDocumentSelected: (documentId: string) => boolean;
  getDocumentTypeConfig: (type: string) => {
    label: string;
    color: string;
    lightColor: string;
    textColor: string;
    icon: string;
  };
}

// Icon mapping
const ICON_MAP: Record<string, any> = {
  ClipboardList,
  FileText,
  BookOpen,
  Scroll,
  Book,
};

export default function DocumentBrowser({
  isOpen,
  onClose,
  onSave,
  availableDocuments,
  filteredDocuments,
  selectedDocuments,
  isLoading,
  isUpdating,
  searchQuery,
  onSearchChange,
  onToggleDocument,
  isDocumentSelected,
  getDocumentTypeConfig,
}: DocumentBrowserProps) {
  const [displayLimit, setDisplayLimit] = useState(8);

  if (!isOpen) return null;

  const displayedDocuments = filteredDocuments.slice(0, displayLimit);
  const hasMoreDocuments = filteredDocuments.length > displayLimit;

  const handleSave = async () => {
    await onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Select Knowledge Base Documents
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Choose documents to include in your agent's knowledge
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by title, description, or type..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin mr-3" />
              <span className="text-sm text-slate-600">Loading documents...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">
                {availableDocuments.length === 0 ? 'No documents found' : 'No matching documents'}
              </h4>
              <p className="text-slate-600">
                {availableDocuments.length === 0
                  ? 'Go to Training → Knowledge to create documents.'
                  : 'Try adjusting your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedDocuments.map((doc) => {
                const isSelected = isDocumentSelected(doc.id);
                const typeConfig = getDocumentTypeConfig(doc.type);
                const IconComponent = ICON_MAP[typeConfig.icon];

                return (
                  <button
                    key={doc.id}
                    onClick={() => onToggleDocument(doc)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all border-2 text-left ${
                      isSelected
                        ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-0.5">
                      {isSelected ? (
                        <CheckCircle className="h-5 w-5 text-primary-600" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-slate-300 rounded-full"></div>
                      )}
                    </div>

                    {/* Document Icon */}
                    <div className={`p-2 ${typeConfig.lightColor} rounded-lg flex-shrink-0`}>
                      <IconComponent className={`h-5 w-5 ${typeConfig.textColor}`} />
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {doc.title}
                        </p>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-md ${typeConfig.lightColor} ${typeConfig.textColor} flex-shrink-0`}
                        >
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mb-1">
                        {doc.description || 'No description'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* View More Button */}
          {hasMoreDocuments && (
            <div className="text-center mt-6">
              <button
                onClick={() => setDisplayLimit((prev) => prev + 8)}
                className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                View More ({filteredDocuments.length - displayLimit} remaining)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''}{' '}
            selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUpdating ? 'Updating...' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
