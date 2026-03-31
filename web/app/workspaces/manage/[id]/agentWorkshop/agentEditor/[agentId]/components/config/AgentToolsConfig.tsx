/**
 * AgentToolsConfig
 *
 * Tools and integrations configuration with custom workflow-based tools.
 */

'use client';

import { useState, useEffect } from 'react';
import { Wrench, Plus, Phone, Globe, Edit, Trash2, Loader2, X } from 'lucide-react';
import { Agent, BuiltInTool } from '../../types';
import { useAuth } from '@/contexts/AuthContext';
import * as toolsApi from '../../services/agentToolsApi';
import * as workflowsApi from '../../services/workflowsApi';
import { setTokenGetter } from '@/lib/api/client';

interface AgentToolsConfigProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}

const AVAILABLE_BUILT_IN_TOOLS = [
  {
    name: 'end_call',
    description: 'End the call with the user',
    icon: Phone,
  },
  {
    name: 'language_detection',
    description: 'Change language during conversation',
    icon: Globe,
  },
];

export default function AgentToolsConfig({ agent, onUpdate }: AgentToolsConfigProps) {
  const { getToken } = useAuth();
  const builtInTools = agent.builtInTools || {};

  // Custom tools state
  const [customTools, setCustomTools] = useState<toolsApi.AgentTool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTool, setEditingTool] = useState<toolsApi.AgentTool | null>(null);
  const [showToolModal, setShowToolModal] = useState(false);

  // Workflows state
  const [workflows, setWorkflows] = useState<workflowsApi.Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [workflowSearchTerm, setWorkflowSearchTerm] = useState('');
  const [isWorkflowInputFocused, setIsWorkflowInputFocused] = useState(false);

  // Tool form state
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolWorkflowId, setToolWorkflowId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Set up token getter for API calls
  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken);
    }
  }, [getToken]);

  // Load custom tools
  useEffect(() => {
    loadTools();
  }, [agent.id]);

  // Load workflows
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadTools = async () => {
    try {
      setIsLoadingTools(true);
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const tools = await toolsApi.listAgentTools(token, agent.id);
      setCustomTools(tools);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setIsLoadingTools(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      setIsLoadingWorkflows(true);
      const workflowList = await workflowsApi.listWorkflows();
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const isToolEnabled = (toolName: string) => toolName in builtInTools;

  const toggleTool = (toolName: string, tool: typeof AVAILABLE_BUILT_IN_TOOLS[0]) => {
    const newTools = { ...builtInTools };
    if (isToolEnabled(toolName)) {
      delete newTools[toolName];
    } else {
      newTools[toolName] = {
        name: tool.name,
        description: tool.description,
      };
    }
    onUpdate({ builtInTools: newTools });
  };

  const openCreateModal = () => {
    setEditingTool(null);
    setToolName('');
    setToolDescription('');
    setToolWorkflowId('');
    setWorkflowSearchTerm('');
    setIsWorkflowInputFocused(false);
    setFormError(null);
    setShowToolModal(true);
  };

  const openEditModal = (tool: toolsApi.AgentTool) => {
    setEditingTool(tool);
    setToolName(tool.name || '');
    setToolDescription(tool.description || '');
    setToolWorkflowId(tool.workflowId || '');
    setWorkflowSearchTerm('');
    setIsWorkflowInputFocused(false);
    setFormError(null);
    setShowToolModal(true);
  };

  const closeModal = () => {
    setShowToolModal(false);
    setEditingTool(null);
    setToolName('');
    setToolDescription('');
    setToolWorkflowId('');
    setWorkflowSearchTerm('');
    setIsWorkflowInputFocused(false);
    setFormError(null);
  };

  const handleSaveTool = async () => {
    try {
      setFormError(null);

      if (!toolName.trim()) {
        setFormError('Tool name is required');
        return;
      }
      if (!toolDescription.trim()) {
        setFormError('Tool description is required');
        return;
      }

      // Validate tool name for 11Labs (only letters, numbers, hyphens, underscores)
      const namePattern = /^[a-zA-Z0-9_-]{1,64}$/;
      if (!namePattern.test(toolName.trim())) {
        setFormError('Tool name can only contain letters, numbers, hyphens, and underscores (max 64 characters). Spaces are not allowed.');
        return;
      }

      setIsCreating(true);
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const toolData = {
        name: toolName.trim(),
        description: toolDescription.trim(),
        ...(toolWorkflowId.trim() && { workflowId: toolWorkflowId.trim() }),
      };

      if (editingTool) {
        // Update existing tool
        await toolsApi.updateAgentTool(token, agent.id, editingTool.toolId, toolData);
      } else {
        // Create new tool
        await toolsApi.createAgentTool(token, agent.id, toolData);
      }

      await loadTools();
      closeModal();
    } catch (error: any) {
      setFormError(error.message || 'Failed to save tool');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      await toolsApi.deleteAgentTool(token, agent.id, toolId);
      await loadTools();
    } catch (error) {
      console.error('Failed to delete tool:', error);
      alert('Failed to delete tool');
    }
  };

  // Filter workflows based on search term
  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(workflowSearchTerm.toLowerCase())
  );

  // Get selected workflow name
  const selectedWorkflow = workflows.find((w) => w.id === toolWorkflowId);
  const selectedWorkflowName = selectedWorkflow?.name || '';

  return (
    <>
      <div className="space-y-5">
        {/* Built-in Tools */}
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Built-in Tools
          </label>
          <div className="space-y-2">
            {AVAILABLE_BUILT_IN_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const enabled = isToolEnabled(tool.name);

              return (
                <div
                  key={tool.name}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    enabled
                      ? 'bg-primary-50/50 border-primary-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${enabled ? 'bg-primary-100' : 'bg-white'}`}>
                      <Icon className={`h-4 w-4 ${enabled ? 'text-primary-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 capitalize">
                        {tool.name.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500">{tool.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleTool(tool.name, tool)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Tools */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Custom Tools
            </label>
            <button
              onClick={openCreateModal}
              className="px-2 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {isLoadingTools ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
            </div>
          ) : customTools.length > 0 ? (
            <div className="space-y-2">
              {customTools.map((tool) => (
                <div
                  key={tool.toolId}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                    <Wrench className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{tool.name || 'Unnamed Tool'}</p>
                    <p className="text-xs text-slate-500 truncate">{tool.description || 'No description'}</p>
                    {tool.workflowId && (
                      <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                        Workflow: {tool.workflowId}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(tool)}
                      className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
                      title="Edit tool"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.toolId)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                      title="Delete tool"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/30">
              <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No custom tools</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Add tools to extend capabilities
              </p>
            </div>
          )}
        </div>

        {/* Tool IDs (11Labs synced tools) */}
        {agent.toolIds && agent.toolIds.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              11Labs Tool IDs
            </label>
            <div className="flex flex-wrap gap-1.5">
              {agent.toolIds.map((id) => (
                <span
                  key={id}
                  className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-mono"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tool Create/Edit Modal */}
      {showToolModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingTool ? 'Edit Tool' : 'Create Tool'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tool Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="e.g., book_appointment"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  maxLength={64}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use only letters, numbers, hyphens, and underscores. No spaces allowed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={toolDescription}
                  onChange={(e) => setToolDescription(e.target.value)}
                  placeholder="Describe when the agent should use this tool..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This description guides the AI on when to invoke the tool.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Workflow
                </label>
                <div className="relative">
                  {/* Search/Display Input */}
                  <input
                    type="text"
                    value={workflowSearchTerm || selectedWorkflowName}
                    onChange={(e) => {
                      setWorkflowSearchTerm(e.target.value);
                      if (!e.target.value) {
                        setToolWorkflowId('');
                      }
                    }}
                    onFocus={() => {
                      setWorkflowSearchTerm('');
                      setIsWorkflowInputFocused(true);
                    }}
                    onBlur={() => {
                      // Delay to allow click on dropdown items
                      setTimeout(() => setIsWorkflowInputFocused(false), 200);
                    }}
                    placeholder={isLoadingWorkflows ? 'Loading workflows...' : 'Search workflows...'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={isLoadingWorkflows}
                  />

                  {/* Dropdown List */}
                  {isWorkflowInputFocused && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredWorkflows.length > 0 ? (
                        filteredWorkflows.map((workflow) => (
                          <button
                            key={workflow.id}
                            type="button"
                            onClick={() => {
                              setToolWorkflowId(workflow.id);
                              setWorkflowSearchTerm('');
                              setIsWorkflowInputFocused(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                          >
                            <p className="font-medium text-slate-700">{workflow.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{workflow.id}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-slate-500 text-center">
                          No workflows found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedWorkflow && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Selected:</span>
                    <span className="text-xs font-mono text-primary-600">{selectedWorkflow.id}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setToolWorkflowId('');
                        setWorkflowSearchTerm('');
                        setIsWorkflowInputFocused(false);
                      }}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Optional. The workflow to trigger when this tool is called.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTool}
                disabled={isCreating}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTool ? 'Update' : 'Create'} Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
