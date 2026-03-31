'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Bot,
  Brain,
  Volume2,
  Database,
  Wrench,
  History,
  Eye,
  EyeOff
} from 'lucide-react';

interface TestAgentConfigProps {
  tenantId: string;
  sessionId: string;
  agentId: string;
}

interface TestAgentConfig {
  originalAgentId: string;
  agentName: string;
  status: string;
  description?: string;
  systemPrompt?: string;
  llmModel?: string;
  language?: string;
  temperature?: number;
  maxTokens?: number;
  firstMessage?: string;
  voiceSettings?: {
    model_id?: string;
    speed?: number;
    stability?: number;
    similarity_boost?: number;
    optimize_streaming_latency?: number;
  };
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
  builtInTools?: { [key: string]: any };
  customTools?: Array<any>;
  mcpServerIds?: string[];
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
  configVersion: number;
  createdAt: string;
  lastModified: string;
  appliedSuggestions: Array<{
    cycleId: string;
    appliedAt: string;
    changes: any;
  }>;
  configHistory: Array<{
    version: number;
    timestamp: string;
    changes: any;
    reason: string;
  }>;
}

interface ConfigSection {
  id: string;
  name: string;
  icon: any;
  fields: string[];
}

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: 'core',
    name: 'Core Settings',
    icon: Bot,
    fields: ['agentName', 'status', 'description', 'firstMessage']
  },
  {
    id: 'llm',
    name: 'LLM Configuration',
    icon: Brain,
    fields: ['systemPrompt', 'llmModel', 'language', 'temperature', 'maxTokens']
  },
  {
    id: 'voice',
    name: 'Voice Settings',
    icon: Volume2,
    fields: ['voiceSettings']
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    icon: Database,
    fields: ['knowledgeBase', 'ragSettings']
  },
  {
    id: 'tools',
    name: 'Tools & Integration',
    icon: Wrench,
    fields: ['builtInTools', 'customTools', 'mcpServerIds']
  },
  {
    id: 'advanced',
    name: 'Advanced Settings',
    icon: Settings,
    fields: ['turnSettings', 'asrSettings']
  }
];

export default function TestAgentConfig({ tenantId, sessionId, agentId }: TestAgentConfigProps) {
  const { user, getToken } = useAuth();
  const [config, setConfig] = useState<TestAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['core', 'llm']));
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load test agent configuration
  useEffect(() => {
    loadConfig();
  }, [tenantId, sessionId, agentId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`/api/agent-training/sessions/${sessionId}/test-agent-config/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load test agent configuration');
      }

      setConfig(result.data);
    } catch (error) {
      console.error('Error loading test agent config:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = await getToken();
      const response = await fetch(`/api/agent-training/sessions/${sessionId}/test-agent-config/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configChanges: config,
          reason: 'Manual configuration update via training interface'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      setConfig(result.data);
      setUnsavedChanges(false);
      setSuccessMessage('Configuration saved successfully!');
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: string, value: any) => {
    if (!config) return;
    
    setConfig(prev => ({
      ...prev!,
      [field]: value
    }));
    setUnsavedChanges(true);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderFieldEditor = (field: string, value: any) => {
    switch (field) {
      case 'systemPrompt':
        return (
          <div className="space-y-2">
            <textarea
              value={value || ''}
              onChange={(e) => updateConfig(field, e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono resize-vertical focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter system prompt..."
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>System prompt for the agent's behavior and personality</span>
              <span>{(value || '').length} characters</span>
            </div>
          </div>
        );

      case 'temperature':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={value || 0.7}
              onChange={(e) => updateConfig(field, parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {(value || 0.7).toFixed(1)} (0 = Focused, 2 = Creative)
            </div>
          </div>
        );

      case 'maxTokens':
        return (
          <input
            type="number"
            min="1"
            max="4096"
            value={value || 2048}
            onChange={(e) => updateConfig(field, parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        );

      case 'description':
      case 'firstMessage':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => updateConfig(field, e.target.value)}
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical"
            placeholder={field === 'description' ? 'Agent description...' : 'First message to users...'}
          />
        );

      case 'voiceSettings':
      case 'ragSettings':
      case 'turnSettings':
      case 'asrSettings':
      case 'builtInTools':
        return (
          <div className="space-y-2">
            <textarea
              value={JSON.stringify(value || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateConfig(field, parsed);
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono resize-vertical"
              placeholder={`${field} JSON configuration...`}
            />
            <div className="text-xs text-gray-500">
              Edit JSON configuration directly
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateConfig(field, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder={`Enter ${field}...`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-indigo-600 mb-3 text-sm font-semibold">$ config --loading</div>
        <div className="flex items-center gap-2 text-gray-500 text-sm pl-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading test agent configuration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-indigo-600 mb-3 text-sm font-semibold">$ config --error</div>
        <div className="text-red-500 text-sm pl-2 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <button
            onClick={loadConfig}
            className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="text-indigo-600 mb-3 text-sm font-semibold">$ config --not-found</div>
        <div className="text-gray-500 text-sm pl-2">
          Test agent configuration not found for this session.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-indigo-600 text-sm font-semibold">
          $ config --edit (v{config.configVersion})
        </div>
        <div className="flex items-center gap-2">
          {successMessage && (
            <div className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
              <CheckCircle className="h-3 w-3" />
              {successMessage}
            </div>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            <History className="h-3 w-3" />
            History
          </button>
        </div>
      </div>

      {unsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-4 w-4" />
            You have unsaved changes
          </div>
        </div>
      )}

      {/* Config History */}
      {showHistory && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <History className="h-4 w-4" />
            Configuration History
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {config.configHistory.slice(0, 5).map((entry, index) => (
              <div key={index} className="text-xs text-gray-600 pl-2">
                <span className="text-indigo-600">v{entry.version}</span> • {new Date(entry.timestamp).toLocaleString()} • {entry.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Sections */}
      <div className="space-y-3">
        {CONFIG_SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const Icon = section.icon;
          
          return (
            <div key={section.id} className="border border-gray-200 rounded-lg bg-gray-50">
              {/* Section Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                    <Icon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{section.name}</span>
                </div>
              </div>

              {/* Section Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-white p-4 space-y-4">
                  {section.fields.map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700 mb-2 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {renderFieldEditor(field, config[field as keyof TestAgentConfig])}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Applied Suggestions History */}
      {config.appliedSuggestions.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Applied AI Suggestions ({config.appliedSuggestions.length})
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {config.appliedSuggestions.slice(-5).map((suggestion, index) => (
              <div key={index} className="text-xs text-gray-600 pl-2">
                <span className="text-green-600">Cycle {suggestion.cycleId.slice(0, 8)}</span> • {new Date(suggestion.appliedAt).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Save Button - Only show when there are unsaved changes */}
      {unsavedChanges && (
        <div className="fixed top-8 right-8 z-50">
          <button
            onClick={saveConfig}
            disabled={saving}
            className={`flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 ${
              unsavedChanges && !saving ? 'animate-pulse' : ''
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span className="font-medium">Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}