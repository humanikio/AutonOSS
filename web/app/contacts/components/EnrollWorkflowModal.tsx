'use client';

import { useState, useEffect } from 'react';
import { X, Search, Zap, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAutomations, Automation } from '@/lib/api/automations';
import { setTokenGetter } from '@/lib/api/client';
import apiClient from '@/lib/api/client';

interface EnrollWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  onComplete: () => void;
}

export default function EnrollWorkflowModal({
  isOpen,
  onClose,
  selectedContactIds,
  onComplete
}: EnrollWorkflowModalProps) {
  const { getToken } = useAuth();
  const [workflows, setWorkflows] = useState<Automation[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  if (!isOpen) return null;

  // Set up token getter for API calls
  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken);
    }
  }, [getToken]);

  // Fetch workflows on mount
  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const allWorkflows = await getAutomations();
      // Only show workflows that are synced to n8n (isPublic = true)
      // These are the ones that can actually be triggered
      const publishedWorkflows = allWorkflows.filter((w) => w.isPublic === true);
      setWorkflows(publishedWorkflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedWorkflowId || selectedContactIds.length === 0) return;

    setIsEnrolling(true);

    try {
      const response = await apiClient.post('/api/workflows/workflows/batch-trigger', {
        workflowId: selectedWorkflowId,
        contactIds: selectedContactIds
      });

      const data = response.data;
      console.log(`✅ Enrolled ${data.data.succeeded} contacts successfully`);

      setResult({
        total: data.data.total,
        succeeded: data.data.succeeded,
        failed: data.data.failed
      });
      setEnrollmentComplete(true);

      // Auto-close after 3 seconds
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (error: any) {
      console.error('Error enrolling contacts:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to enroll contacts';
      alert(errorMessage);
    } finally {
      setIsEnrolling(false);
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-light text-gray-900">Enroll in Workflow</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a workflow to enroll {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isEnrolling}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Enrollment Complete State */}
        {enrollmentComplete && result ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Enrollment Complete!
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p> {result.succeeded} contacts enrolled successfully</p>
                {result.failed > 0 && (
                  <p className="text-red-600">❌ {result.failed} contacts failed</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-4">Closing automatically...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  disabled={isEnrolling}
                />
              </div>
            </div>

            {/* Workflow List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingWorkflows ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Loading workflows...</p>
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Zap className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No workflows available</p>
                  <p className="text-sm text-gray-500 mt-1">Only workflows synced to n8n can be used for enrollment</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => !isEnrolling && setSelectedWorkflowId(workflow.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedWorkflowId === workflow.id
                          ? 'bg-blue-50 border-blue-400 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      } ${isEnrolling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{workflow.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                              Synced
                            </span>
                          </div>
                        </div>
                        {selectedWorkflowId === workflow.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolling State */}
            {isEnrolling && (
              <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900">
                      Enrolling {selectedContactIds.length} contacts...
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      This may take up to {selectedContactIds.length} seconds (1 second per contact)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                {selectedWorkflow ? (
                  <span>
                    Selected: <strong>{selectedWorkflow.name}</strong>
                  </span>
                ) : (
                  <span>Please select a workflow</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isEnrolling}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={!selectedWorkflowId || isEnrolling}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Enroll {selectedContactIds.length} Contact{selectedContactIds.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
