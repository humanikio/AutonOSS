'use client';

import { useState } from 'react';
import { X, CheckCircle, FileText, Lightbulb, Target, Copy } from 'lucide-react';
import { DocumentAnalysisResult } from '@/lib/api/documentAnalysis';

interface DocumentAnalysisModalProps {
  result: DocumentAnalysisResult;
  onClose: () => void;
  onIntegrate: (content: string) => void;
}

export default function DocumentAnalysisModal({ result, onClose, onIntegrate }: DocumentAnalysisModalProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [integrationText, setIntegrationText] = useState('');

  const toggleSection = (sectionTitle: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionTitle) 
        ? prev.filter(t => t !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const handleIntegrateSelected = () => {
    if (!result.analysis?.relevantSections) return;

    const selectedContent = result.analysis.relevantSections
      .filter(section => selectedSections.includes(section.title))
      .map(section => `## ${section.title}\n\n${section.content}`)
      .join('\n\n');

    const finalContent = integrationText 
      ? `${integrationText}\n\n${selectedContent}`
      : selectedContent;

    onIntegrate(finalContent);
    onClose();
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.8) return 'bg-green-100 text-green-800';
    if (relevance >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Document Analysis Results</h3>
            <p className="text-sm text-gray-600 mt-1">{result.fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {result.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-red-800 font-medium">Analysis Error</h4>
              <p className="text-red-700 text-sm mt-1">{result.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Classification */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Classification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Category:</span>
                    <p className="font-medium capitalize">{result.classification.category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Extraction Method:</span>
                    <p className="font-medium capitalize">{result.classification.extractionMethod}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(result.classification.confidence)}`}>
                      {(result.classification.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {result.analysis && (
                <>
                  {/* Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
                    <p className="text-gray-700">{result.analysis.summary}</p>
                  </div>

                  {/* Key Points */}
                  {result.analysis.keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Key Points
                      </h4>
                      <ul className="space-y-2">
                        {result.analysis.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Auto-Integration Status */}
                  {result.analysis.documentUpdateResult && (
                    <div className={`rounded-lg p-4 ${result.analysis.documentUpdateResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        {result.analysis.documentUpdateResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                        Auto-Integration Status
                      </h4>
                      <p className={`text-sm ${result.analysis.documentUpdateResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.analysis.documentUpdateResult.message}
                      </p>
                      {result.analysis.documentUpdateResult.success && (
                        <p className="text-xs text-green-600 mt-1">
                          Updated at: {new Date(result.analysis.documentUpdateResult.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Integration Suggestions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Integration Suggestions
                    </h4>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                      {result.analysis.suggestedIntegration}
                    </p>
                  </div>

                  {/* Relevant Sections */}
                  {result.analysis.relevantSections.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Content Sections</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Select sections to integrate into your document:
                      </p>
                      
                      <div className="space-y-3">
                        {result.analysis.relevantSections.map((section, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg">
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedSections.includes(section.title)}
                                    onChange={() => toggleSection(section.title)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <h5 className="font-medium text-gray-900">{section.title}</h5>
                                </label>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(section.relevance)}`}>
                                    {(section.relevance * 100).toFixed(0)}% relevance
                                  </span>
                                  <button
                                    onClick={() => handleCopyContent(section.content)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Copy content"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {section.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Integration Text */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Custom Integration Notes</h4>
                    <textarea
                      value={integrationText}
                      onChange={(e) => setIntegrationText(e.target.value)}
                      placeholder="Add any custom notes or instructions for how to integrate this content..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Raw Content Preview */}
              {result.extractedContent && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Extracted Content Preview</h4>
                    <button
                      onClick={() => handleCopyContent(result.extractedContent!)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Copy full content"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {result.extractedContent.substring(0, 1000)}
                      {result.extractedContent.length > 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {selectedSections.length > 0 && (
              <span>{selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleIntegrateSelected}
              disabled={selectedSections.length === 0 && !integrationText}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Integrate Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}