'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { loadDocument, updateDocument, KBDocument } from '@/lib/api/kbDocuments';
import { ArrowLeft, Save, FileText, Upload, CheckCircle } from 'lucide-react';
import ChatInterface from '../components/ChatInterface';
import DocumentEditor from '../components/DocumentEditor';
import DocumentLibrary from '../components/DocumentLibrary';
import DocumentAnalysisModal from '../components/DocumentAnalysisModal';
import { UploadedDocument } from '@/lib/services/documentUpload';
import { analyzeUploadedDocument, DocumentAnalysisResult, AnalyzeDocumentOptions } from '@/lib/api/documentAnalysis';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export default function DocumentWorkshop() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { user, isAuthenticated, tenant } = useAuth();
  
  // State
  const [document, setDocument] = useState<KBDocument | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [savedContent, setSavedContent] = useState(''); // Track the last saved version
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showDocumentLibrary, setShowDocumentLibrary] = useState(false);
  const [analyzingDocument, setAnalyzingDocument] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserUpdateRef = useRef<string>('');

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, router]);

  // Load document data
  useEffect(() => {
    const loadDocumentData = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      
      try {
        const loadedDocument = await loadDocument(documentId);
        
        if (loadedDocument) {
          setDocument(loadedDocument);
          setDocumentContent(loadedDocument.content);
          setSavedContent(loadedDocument.content); // Initialize saved content
        } else {
          // Document not found
          console.error(`Document ${documentId} not found`);
          router.push('/training/knowledge');
          return;
        }
      } catch (error) {
        console.error('Error loading document:', error);
        router.push('/training/knowledge');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId && isAuthenticated) {
      loadDocumentData();
    }
  }, [documentId, isAuthenticated, router]);

  // Real-time document updates listener
  useEffect(() => {
    if (!documentId || !isAuthenticated || !user?.uid || !tenant?.id) {
      return;
    }

    console.log('Setting up real-time document listener for:', documentId);

    // Set up Firestore listener for real-time document updates
    const documentRef = doc(db, 'tenants', tenant?.id, 'kbDocs', documentId);
    
    const unsubscribe = onSnapshot(
      documentRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log('Document updated in real-time:', data.updatedAt);
          
          // Update document content if it changed
          if (data.content !== undefined && data.content !== documentContent) {
            // Check if this is a backend-initiated change (different from last user update)
            const isBackendChange = data.content !== lastUserUpdateRef.current;
            
            // Don't override user changes with empty content from database
            const isOverridingUserContentWithEmpty = isUserEditing && documentContent && !data.content;
            
            // Update if user is not currently editing OR if this is a backend-initiated change
            // BUT don't override user content with empty database content
            if ((!isUserEditing || isBackendChange) && !isOverridingUserContentWithEmpty) {
              console.log('Document content updated in real-time:', { 
                isBackendChange, 
                isUserEditing, 
                updatedBy: data.updatedBy,
                isOverridingUserContentWithEmpty
              });
              setDocumentContent(data.content);
              setSavedContent(data.content); // Update saved content when auto-updated
              setLastAutoSaveTime(data.updatedAt || new Date().toISOString());
              
              // If this was a backend change, clear the user editing state
              if (isBackendChange && isUserEditing) {
                setIsUserEditing(false);
                if (editingTimeoutRef.current) {
                  clearTimeout(editingTimeoutRef.current);
                }
              }
            } else if (isOverridingUserContentWithEmpty) {
              console.log('Prevented overriding user content with empty database content');
            }
          }
          
          // Update full document object
          setDocument(prev => prev ? {
            ...prev,
            content: data.content || '',
            updatedAt: data.updatedAt || prev.updatedAt,
            updatedBy: data.updatedBy || prev.updatedBy
          } : null);
        }
      },
      (error) => {
        console.error('Error listening to document updates:', error);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up document listener');
      unsubscribe();
      // Clean up editing timeout
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, [documentId, isAuthenticated, user?.uid, tenant?.id, documentContent, isUserEditing]);

  // Handle content change with editing state management
  const handleContentChange = useCallback((newContent: string) => {
    setIsUserEditing(true);
    setDocumentContent(newContent);
    setLastAutoSaveTime(null); // Clear auto-save status since this is a manual change
    
    // Track this as a user-initiated change
    lastUserUpdateRef.current = newContent;
    
    // Clear any existing timeout
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }
    
    // Set new timeout to clear editing state
    editingTimeoutRef.current = setTimeout(() => {
      setIsUserEditing(false);
    }, 3000); // Increased to 3 seconds to give more time for typing
  }, []);

  // Handle save
  const handleSave = async (contentToSave?: string) => {
    if (!document) return;
    
    // Use provided content or fall back to current state
    const content = contentToSave || documentContent;
    
    console.log('Starting manual save...', { 
      documentId, 
      contentLength: content.length,
      contentPreview: content.substring(0, 100),
      fullContent: content,
      isProvidedContent: !!contentToSave
    });
    setIsSaving(true);
    
    try {
      const updatePayload = {
        content: content
      };
      console.log('Sending update payload:', updatePayload);
      
      const updatedDocument = await updateDocument(documentId, updatePayload);
      
      console.log('Document saved successfully:', {
        id: updatedDocument.id,
        contentLength: updatedDocument.content.length,
        contentPreview: updatedDocument.content.substring(0, 100)
      });
      setDocument(updatedDocument);
      setSavedContent(content); // Update saved content after manual save
      setLastAutoSaveTime(null); // Clear auto-save time since this was a manual save
      
      // Track this save as user-initiated to prevent conflicts
      lastUserUpdateRef.current = content;
      // You could add a toast notification here
    } catch (error) {
      console.error('Error saving document:', error);
      // You could add error notification here
    } finally {
      setIsSaving(false);
    }
  };


  // Handle document selection from library
  const handleSelectDocument = async (uploadedDoc: UploadedDocument) => {
    console.log('Selected document for analysis:', uploadedDoc);
    setShowDocumentLibrary(false);
    setAnalyzingDocument(true);

    try {
      const result = await analyzeUploadedDocument(uploadedDoc, {
        autoIntegrate: true,
        targetDocumentId: documentId
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error('Error analyzing document:', error);
      alert('Failed to analyze document. Please try again.');
    } finally {
      setAnalyzingDocument(false);
    }
  };

  // Handle content integration from analysis
  const handleIntegrateContent = (content: string) => {
    // Append the integrated content to the current document
    const currentContent = documentContent || '';
    const newContent = currentContent ? `${currentContent}\n\n${content}` : content;
    setDocumentContent(newContent);
    setLastAutoSaveTime(null); // Clear auto-save status since this is a manual change
    setAnalysisResult(null);
  };

  // Helper functions for save button state
  const hasUnsavedChanges = documentContent !== savedContent;
  const isAutoSaved = lastAutoSaveTime !== null && !hasUnsavedChanges;
  
  const getSaveButtonContent = () => {
    if (isSaving) {
      return { 
        text: 'Saving...', 
        disabled: true, 
        className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2 opacity-50',
        icon: <Save className="h-4 w-4" />
      };
    }
    
    if (isAutoSaved) {
      return { 
        text: 'Autosaved!', 
        disabled: true, 
        className: 'px-4 py-2 bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 opacity-75',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    
    if (hasUnsavedChanges) {
      return { 
        text: 'Save', 
        disabled: false, 
        className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2',
        icon: <Save className="h-4 w-4" />
      };
    }
    
    return { 
      text: 'Saved', 
      disabled: true, 
      className: 'px-4 py-2 bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 opacity-75',
      icon: <CheckCircle className="h-4 w-4" />
    };
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/training/knowledge');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }



  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Document not found</p>
          <button 
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Knowledge Hub
          </button>
        </div>
      </div>
    );
  }

  const documentTitle = document?.title || 'Loading...';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Fixed to top */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">{documentTitle}</h1>
                <p className="text-sm text-gray-500">
                  {document ? `${document.type} • ${document.description}` : 'Loading document...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDocumentLibrary(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Document
            </button>
            <button
              onClick={() => handleSave()}
              disabled={getSaveButtonContent().disabled}
              className={getSaveButtonContent().className}
            >
              {getSaveButtonContent().icon}
              {getSaveButtonContent().text}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative pt-20">
        {/* Chat Interface */}
        <ChatInterface
          documentId={documentId}
          isMinimized={isChatMinimized}
          onToggleMinimized={() => setIsChatMinimized(!isChatMinimized)}
        />

        {/* Document Editor */}
        <DocumentEditor
          content={documentContent}
          onChange={handleContentChange}
          onSave={handleSave}
          isMinimized={isChatMinimized}
        />
      </div>

      {/* Document Library Modal */}
      {showDocumentLibrary && (
        <DocumentLibrary
          onSelectDocument={handleSelectDocument}
          onClose={() => setShowDocumentLibrary(false)}
        />
      )}

      {/* Document Analysis Loading */}
      {analyzingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Document</h3>
              <p className="text-gray-600">
                Our AI is analyzing the document content and extracting key information...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Analysis Results Modal */}
      {analysisResult && (
        <DocumentAnalysisModal
          result={analysisResult}
          onClose={() => setAnalysisResult(null)}
          onIntegrate={handleIntegrateContent}
        />
      )}
    </div>
  );
}