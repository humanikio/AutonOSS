'use client';

import { useState, useEffect } from 'react';
import { Upload, Search, FileText, Trash2, Download, Eye, X, Loader2 } from 'lucide-react';
import { DocumentUploadService, UploadedDocument } from '@/lib/services/documentUpload';
import { useAuth } from '@/contexts/AuthContext';
import DocumentUpload from './DocumentUpload';

interface DocumentLibraryProps {
  onSelectDocument: (document: UploadedDocument) => void;
  onClose: () => void;
}

export default function DocumentLibrary({ onSelectDocument, onClose }: DocumentLibraryProps) {
  const { user, tenant } = useAuth();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDocuments = async () => {
    if (!user?.uid || !tenant?.id) return;
    
    try {
      setLoading(true);
      const docs = await DocumentUploadService.listDocuments(tenant?.id || '');
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.uid, tenant?.id]);

  const filteredDocuments = documents.filter(doc =>
    doc.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUploadComplete = (newDocument: UploadedDocument) => {
    setDocuments(prev => [newDocument, ...prev]);
    setShowUpload(false);
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    if (!user?.uid || !tenant?.id) return;
    
    setDeleting(doc.id);
    try {
      await DocumentUploadService.deleteDocument(tenant?.id || '', doc.id, doc.fileName);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadDocument = async (doc: UploadedDocument) => {
    try {
      const blob = await DocumentUploadService.getDocument(doc.downloadUrl);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  if (showUpload) {
    return (
      <DocumentUpload
        onUploadComplete={handleUploadComplete}
        onClose={() => setShowUpload(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Document Library</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading documents...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'No documents uploaded yet' : 'No documents found'}
              </h4>
              <p className="text-gray-500 mb-6">
                {documents.length === 0 
                  ? 'Upload documents to analyze and integrate content into your knowledge base.'
                  : 'Try adjusting your search criteria.'
                }
              </p>
              {documents.length === 0 && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Upload First Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-2xl flex-shrink-0">
                      {DocumentUploadService.getFileIcon(doc.fileType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate" title={doc.originalName}>
                        {doc.originalName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {DocumentUploadService.formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(doc.uploadedAt).toLocaleDateString()} at{' '}
                    {new Date(doc.uploadedAt).toLocaleTimeString()}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDocument(doc)}
                      className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Analyze
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deleting === doc.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === doc.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}