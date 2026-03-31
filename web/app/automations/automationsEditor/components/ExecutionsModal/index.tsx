'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';
import { getExecutionsList, getExecutionDetails, ExecutionSummary, ExecutionData } from '@/lib/api/executions';

interface ExecutionsModalProps {
  workflowId: string;
  onClose: () => void;
}

interface NodeExecution {
  nodeId: string;
  nodeName: string;
  startTime: number;
  executionTime: number;
  executionStatus: string;
  data: any;
  error?: any;
  source: any[];
}

export default function ExecutionsModal({ workflowId, onClose }: ExecutionsModalProps) {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionData | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch executions list on mount
  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getExecutionsList({
          localWorkflowId: workflowId,
          limit: 50
        });
        setExecutions(result.data);
      } catch (err) {
        console.error('Error fetching executions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load executions');
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [workflowId]);

  // Handle execution click
  const handleExecutionClick = async (executionId: string) => {
    try {
      setLoadingDetails(true);
      setSelectedExecutionId(executionId);
      const details = await getExecutionDetails(executionId);
      console.log('Execution details received:', details);
      setSelectedExecution(details);
    } catch (err) {
      console.error('Error fetching execution details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load execution details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Parse execution data into node executions
  const parseNodeExecutions = (executionData: any): NodeExecution[] => {
    // Try multiple possible locations for runData based on n8n's response structure
    let runData = null;

    // Check if executionData is the raw n8n response (most common)
    if (executionData?.resultData?.runData) {
      runData = executionData.resultData.runData;
    }
    // Check nested in data.resultData (wrapped response)
    else if (executionData?.data?.resultData?.runData) {
      runData = executionData.data.resultData.runData;
    }

    console.log('Parsing execution data:', {
      hasResultData: !!executionData?.resultData,
      hasDataResultData: !!executionData?.data?.resultData,
      runDataKeys: runData ? Object.keys(runData) : [],
      fullData: executionData
    });

    if (!runData || typeof runData !== 'object') {
      console.warn('No valid runData found in execution');
      return [];
    }

    const nodeExecutions: NodeExecution[] = [];

    Object.entries(runData).forEach(([nodeId, executions]: [string, any]) => {
      if (Array.isArray(executions) && executions.length > 0) {
        const exec = executions[0];

        // Extract error from node data if it exists (nested in output json)
        const nodeError = exec.data?.main?.[0]?.[0]?.json?.error || exec.error;

        nodeExecutions.push({
          nodeId,
          nodeName: nodeId.replace(/-\d+$/, ''), // Remove numeric suffix for display
          startTime: exec.startTime || 0,
          executionTime: exec.executionTime || 0,
          executionStatus: exec.executionStatus || 'unknown',
          data: exec.data,
          error: nodeError,
          source: exec.source || []
        });
      }
    });

    // Sort by start time
    const sorted = nodeExecutions.sort((a, b) => a.startTime - b.startTime);
    console.log('Parsed node executions:', sorted.length, 'nodes');
    return sorted;
  };

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Format execution time
  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Get node border color
  const getNodeBorderColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'running':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="flex h-full bg-gray-50 absolute inset-0">
      {/* Left Sidebar - Executions List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Executions</h2>
        </div>

        {/* Executions List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">No executions found</p>
            </div>
          ) : (
            <div className="p-2">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  onClick={() => handleExecutionClick(execution.id)}
                  className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedExecutionId === execution.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-xs font-mono text-gray-600">
                        #{execution.id?.slice(0, 8) || 'N/A'}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        execution.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : execution.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : execution.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {execution.status || 'unknown'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(execution.startedAt)}</p>
                  {execution.stoppedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Finished: {formatDate(execution.stoppedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loadingDetails ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : selectedExecution ? (
          (() => {
            // Get the execution from the list to use its timestamp data
            const executionFromList = executions.find(e => e.id === selectedExecutionId);
            const startedAt = executionFromList?.startedAt || selectedExecution.startedAt;
            const stoppedAt = executionFromList?.stoppedAt || selectedExecution.stoppedAt;
            const mode = selectedExecution.mode || executionFromList?.mode;
            const finished = selectedExecution.finished !== undefined ? selectedExecution.finished : executionFromList?.finished;

            return (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Execution Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(selectedExecution.status)}
                      <h2 className="text-2xl font-semibold text-gray-900">
                        Execution #{selectedExecutionId?.slice(0, 8) || 'N/A'}
                      </h2>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        selectedExecution.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : selectedExecution.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : selectedExecution.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedExecution.status || 'unknown'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Started:</span>
                      <p className="text-gray-900 font-medium">{formatDate(startedAt)}</p>
                    </div>
                    {stoppedAt && (
                      <div>
                        <span className="text-gray-500">Stopped:</span>
                        <p className="text-gray-900 font-medium">{formatDate(stoppedAt)}</p>
                      </div>
                    )}
                    {mode && (
                      <div>
                        <span className="text-gray-500">Mode:</span>
                        <p className="text-gray-900 font-medium">{mode}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Finished:</span>
                      <p className="text-gray-900 font-medium">{finished ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

            {/* Error Display */}
            {selectedExecution.data?.resultData?.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-sm text-red-700">{selectedExecution.data.resultData.error.message}</p>
                {selectedExecution.data.resultData.error.stack && (
                  <pre className="mt-2 text-xs text-red-600 overflow-x-auto">
                    {selectedExecution.data.resultData.error.stack}
                  </pre>
                )}
              </div>
            )}

            {/* Node Execution Timeline */}
            {(() => {
              const nodeExecutions = parseNodeExecutions(selectedExecution);

              return nodeExecutions.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Timeline</h3>
                  <div className="space-y-3">
                    {nodeExecutions.map((nodeExec, index) => (
                      <div
                        key={nodeExec.nodeId}
                        className={`border-2 rounded-lg overflow-hidden transition-all ${getNodeBorderColor(nodeExec.executionStatus)}`}
                      >
                        {/* Node Header */}
                        <div
                          className="p-4 cursor-pointer hover:bg-opacity-75 transition-colors"
                          onClick={() => toggleNodeExpansion(nodeExec.nodeId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-sm font-semibold text-gray-700">
                                {index + 1}.
                              </span>
                              {getStatusIcon(nodeExec.executionStatus)}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {nodeExec.nodeName}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {nodeExec.nodeId}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-gray-600">
                                {formatExecutionTime(nodeExec.executionTime)}
                              </span>
                              {expandedNodes.has(nodeExec.nodeId) ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedNodes.has(nodeExec.nodeId) && (
                          <div className="border-t border-current px-4 pb-4 bg-white">
                            {/* Source Info */}
                            {nodeExec.source && nodeExec.source.length > 0 && (
                              <div className="mt-3 mb-3">
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  Input from:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {nodeExec.source.map((src: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-mono"
                                    >
                                      {src.previousNode || 'Unknown'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Output Data */}
                            {nodeExec.data?.main?.[0] && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                  Output ({nodeExec.data.main[0].length} item{nodeExec.data.main[0].length !== 1 ? 's' : ''}):
                                </p>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
                                  <pre className="text-xs text-gray-700 font-mono">
                                    {JSON.stringify(nodeExec.data.main[0], null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Error Data */}
                            {nodeExec.error && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-red-700 mb-2">Error:</p>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
                                  <pre className="text-xs text-red-700 font-mono">
                                    {JSON.stringify(nodeExec.error, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Execution Details */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">Started:</span>
                                <p className="text-gray-900 font-mono">
                                  {new Date(nodeExec.startTime).toLocaleTimeString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Duration:</span>
                                <p className="text-gray-900 font-mono">
                                  {formatExecutionTime(nodeExec.executionTime)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Full Data (Collapsed by default) */}
            <div>
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-900">Full Execution JSON</h3>
                    <ChevronRight className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90" />
                  </div>
                </summary>
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-700">
                    {JSON.stringify(selectedExecution, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-col items-center pt-24">
            <div className="text-center">
              <div className="mb-4">
                <RefreshCw className="h-12 w-12 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nothing here yet
              </h3>
              <p className="text-sm text-gray-500">
                Select an execution from the list to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
