'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  X,
  Upload,
  Loader2,
  Settings,
  Brain,
  Volume2,
  Database,
  Wrench,
  CheckCircle,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { showNotification } from '@/components/Notification';

interface PublishTrainingConfigsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  sessionId: string;
  agentName: string;
}

interface TrainingConfig {
  agentName: string;
  description: string;
  originalAgentId: string;
  
  // LLM and conversation settings
  systemPrompt?: string;
  llmModel?: string;
  language?: string;
  temperature?: number;
  maxTokens?: number;
  firstMessage?: string;
  
  // Voice settings
  voiceSettings?: {
    model_id?: string;
    speed?: number;
    stability?: number;
    similarity_boost?: number;
    optimize_streaming_latency?: number;
  };
  
  // Knowledge base
  knowledgeBase?: Array<{
    id: string;
    name: string;
    type: string;
    documentCount?: number;
  }>;
  ragSettings?: {
    enabled: boolean;
    maxDocuments?: number;
    threshold?: number;
  };
  
  // Tools
  builtInTools?: { [key: string]: any };
  customTools?: Array<any>;
  mcpServerIds?: string[];
  
  // Advanced settings
  turnSettings?: {
    mode?: string;
    turn_timeout?: number;
    silence_end_call_timeout?: number;
  };
  asrSettings?: {
    provider?: string;
    quality?: string;
    user_input_audio_format?: string;
    keywords?: string[];
  };
  
  // Training metadata
  configVersion: number;
  lastModified: string;
  appliedSuggestions: Array<any>;
  configHistory: Array<any>;
}

export default function PublishTrainingConfigsModal({
  isOpen,
  onClose,
  agentId,
  sessionId,
  agentName
}: PublishTrainingConfigsModalProps) {
  const { user, tenant, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<TrainingConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<Partial<TrainingConfig>>({});
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'llm' | 'voice' | 'knowledge' | 'tools' | 'advanced'>('overview');

  // Load training configuration when modal opens
  useEffect(() => {
    if (isOpen && user?.uid && tenant?.id) {
      loadTrainingConfig();
    }
  }, [isOpen, user?.uid, tenant?.id, agentId, sessionId]);

  const loadTrainingConfig = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiBaseUrl}/api/agent-training/publish-configs/get`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: tenant?.id,
          sessionId,
          agentId
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setConfig(result.config);
        setEditedConfig({});
      } else {
        throw new Error(result.error || 'Failed to load training configuration');
      }
    } catch (error) {
      console.error('Error loading training config:', error);
      showNotification({
        type: 'error',
        title: 'Failed to load configuration',
        message: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToProduction = async () => {
    if (!config) return;
    
    setPublishing(true);
    try {
      const token = await getToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiBaseUrl}/api/agent-training/publish-configs/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: tenant?.id,
          sessionId,
          agentId,
          finalConfig: Object.keys(editedConfig).length > 0 ? editedConfig : undefined
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        showNotification({
          type: 'success',
          title: 'Configuration Published',
          message: result.message || 'Training configuration successfully published to production agent.'
        });
        onClose();
      } else {
        throw new Error(result.error || 'Failed to publish configuration');
      }
    } catch (error) {
      console.error('Error publishing config:', error);
      showNotification({
        type: 'error',
        title: 'Failed to publish configuration',
        message: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setPublishing(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl mx-4 h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Publish Training Configuration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Review and publish your training improvements to the production agent: {agentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading training configuration...</span>
            </div>
          </div>
        ) : config ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('llm')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === 'llm' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    LLM Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === 'voice' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                    Voice Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('knowledge')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === 'knowledge' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Database className="h-4 w-4" />
                    Knowledge Base
                  </button>
                  <button
                    onClick={() => setActiveTab('tools')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === 'tools' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Wrench className="h-4 w-4" />
                    Tools
                  </button>
                  <button
                    onClick={() => setActiveTab('advanced')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === 'advanced' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Edit3 className="h-4 w-4" />
                    Advanced
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-4">Training Session Overview</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
                        <input
                          type="text"
                          value={editedConfig.agentName ?? config.agentName}
                          onChange={(e) => updateField('agentName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <input
                          type="text"
                          value={editedConfig.description ?? config.description}
                          onChange={(e) => updateField('description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">Training Metadata</h5>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Config Version:</span>
                        <div className="font-mono">{config.configVersion}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Applied Suggestions:</span>
                        <div className="font-mono">{config.appliedSuggestions?.length || 0}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Last Modified:</span>
                        <div className="font-mono text-xs">{new Date(config.lastModified).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'llm' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-800">LLM & Conversation Settings</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
                      <textarea
                        value={editedConfig.systemPrompt ?? config.systemPrompt ?? ''}
                        onChange={(e) => updateField('systemPrompt', e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">LLM Model</label>
                        <input
                          type="text"
                          value={editedConfig.llmModel ?? config.llmModel ?? ''}
                          onChange={(e) => updateField('llmModel', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <input
                          type="text"
                          value={editedConfig.language ?? config.language ?? ''}
                          onChange={(e) => updateField('language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={editedConfig.temperature ?? config.temperature ?? 0.7}
                          onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                        <input
                          type="number"
                          value={editedConfig.maxTokens ?? config.maxTokens ?? 2000}
                          onChange={(e) => updateField('maxTokens', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Message</label>
                      <textarea
                        value={editedConfig.firstMessage ?? config.firstMessage ?? ''}
                        onChange={(e) => updateField('firstMessage', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Add other tabs (voice, knowledge, tools, advanced) as needed */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-800">Voice Settings</h4>
                  <div className="text-gray-600">Voice configuration will be displayed here...</div>
                </div>
              )}

              {activeTab === 'knowledge' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-800">Knowledge Base</h4>
                  <div className="text-gray-600">Knowledge base configuration will be displayed here...</div>
                </div>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-800">Tools Configuration</h4>
                  <div className="text-gray-600">Tools configuration will be displayed here...</div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-800">Advanced Settings</h4>
                  <div className="text-gray-600">Advanced settings will be displayed here...</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration Found</h3>
              <p className="text-gray-600">Unable to load training configuration for this session.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Changes will be applied to production agent: {agentName}</span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={publishing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToProduction}
                disabled={publishing || !config}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Publish to Production
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}