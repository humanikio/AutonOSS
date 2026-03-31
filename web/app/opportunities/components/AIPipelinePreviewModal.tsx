'use client';

import { useState, useEffect } from 'react';
import { Eye, X, Save, Edit2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AIStage {
  id: string;
  name: string;
  order: number;
  dateCreated: string;
  lastModified: string;
  color?: string;
}

interface SessionPipelineData {
  pipeline: {
    id: string;
    name: string;
    isNew: boolean;
    dateCreated?: string;
    lastModified?: string;
  };
  stages: AIStage[];
}

interface AIPipelinePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onApplyStages?: (stages: AIStage[]) => void;
  isApplying?: boolean;
}

export default function AIPipelinePreviewModal({ 
  isOpen, 
  onClose, 
  sessionId,
  onApplyStages,
  isApplying = false
}: AIPipelinePreviewModalProps) {
  const { getToken } = useAuth();
  const [sessionData, setSessionData] = useState<SessionPipelineData | null>(null);
  const [editedStages, setEditedStages] = useState<AIStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch session data when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionData();
    }
  }, [isOpen, sessionId]);

  // Update editedStages when sessionData changes
  useEffect(() => {
    if (sessionData) {
      setEditedStages([...sessionData.stages]);
    }
  }, [sessionData]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai-assistant/sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch session data: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Session data:', data);
      
      // Extract pipeline and stages data from session
      if (data.data && data.data.pipeline && data.data.stages) {
        setSessionData({
          pipeline: data.data.pipeline,
          stages: data.data.stages
        });
      } else {
        throw new Error('Invalid session data structure');
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const updateStageName = (id: string, name: string) => {
    setEditedStages(prev => prev.map(stage => 
      stage.id === id ? { ...stage, name } : stage
    ));
  };

  const handleApplyStages = () => {
    if (onApplyStages && editedStages.length > 0) {
      onApplyStages(editedStages);
    }
    onClose();
  };

  const handleCancel = () => {
    // Reset edited stages to original
    if (sessionData) {
      setEditedStages([...sessionData.stages]);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] m-4 flex flex-col">
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary-600" />
            AI Generated Pipeline Preview
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading pipeline data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={fetchSessionData}
                className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : sessionData ? (
            <div className="space-y-6">
              
              {/* Pipeline Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Pipeline Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{sessionData.pipeline.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="font-medium">{sessionData.pipeline.isNew ? 'New Pipeline' : 'Existing Pipeline'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Stages:</span>
                    <p className="font-medium">{editedStages.length}</p>
                  </div>
                </div>
              </div>

              {/* Stages Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Generated Pipeline Stages</h3>
                  <span className="text-sm text-gray-500">You can edit stage names before applying</span>
                </div>

                <div className="space-y-3">
                  {editedStages
                    .sort((a, b) => a.order - b.order)
                    .map((stage, index) => (
                    <div 
                      key={stage.id} 
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      {/* Stage Order */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                             style={{ backgroundColor: stage.color || '#3B82F6' }}>
                          {index + 1}
                        </div>
                      </div>

                      {/* Stage Name (Editable) */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => updateStageName(stage.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Stage Name"
                        />
                      </div>

                      {/* Stage Info */}
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Edit2 className="h-3 w-3" />
                          Editable
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {editedStages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No stages found in this session.
                  </div>
                )}
              </div>

              {/* AI Generation Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🤖 AI Generated</h4>
                <p className="text-sm text-blue-700">
                  These stages were created by AI based on your business process description. 
                  You can edit the stage names above and then apply them to create a new pipeline or update your existing one.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Note:</strong> These stages are currently saved in your AI session and won't affect your production pipelines until you apply them.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No session data available.
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        {sessionData && editedStages.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyStages}
              disabled={isApplying}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Apply Stages
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}