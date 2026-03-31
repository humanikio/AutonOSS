'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Save,
  Wrench,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Code2
} from 'lucide-react';
import ToolMemoryChat from '@/components/shared/ToolMemoryChat/ToolMemoryChat';
import { ToolConfiguration } from '@/components/shared/ToolMemoryChat/types/toolConfiguration';

interface ToolManagementPageProps {
  params: Promise<{
    agentId: string;
    toolId: string; // This will be "new" for new tools, or an actual tool ID for editing
  }>;
}

// Load existing tool from API
const loadTool = async (toolId: string, agentId: string): Promise<ToolConfiguration | null> => {
  if (toolId === 'new') return null;

  try {
    const authUser = (await import('firebase/auth')).getAuth().currentUser;
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    const token = await authUser.getIdToken();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-tools/${toolId}?agentId=${agentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Failed to load tool:', result.error);
      return null;
    }

    const toolData = result.data;
    return {
      toolId: toolData.toolId,
      elevenLabsToolId: toolData.elevenLabsToolId,
      tool_config: toolData.tool_config,
      isActive: toolData.isActive,
      createdAt: new Date(toolData.createdAt),
      updatedAt: new Date(toolData.updatedAt)
    };
  } catch (error) {
    console.error('Error loading tool:', error);
    return null;
  }
};

export default function ToolManagementPage({ params }: ToolManagementPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const agentId = resolvedParams.agentId;
  const toolId = resolvedParams.toolId; // Keep original for routing

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [existingTool, setExistingTool] = useState<ToolConfiguration | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentToolConfig, setCurrentToolConfig] = useState<any>(null);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [showConfigViewer, setShowConfigViewer] = useState<boolean>(false);

  // Determine mode: session mode (starts with session_) vs tool mode
  const isSessionMode = toolId.startsWith('session_');
  const isEditMode = resolvedParams.toolId !== 'new' && !isSessionMode;

  // Load existing tool if editing
  useEffect(() => {
    const loadData = async () => {
      if (isEditMode) {
        const tool = await loadTool(toolId, agentId);
        if (tool) {
          setExistingTool(tool);
          setCurrentToolConfig(tool.tool_config);
          setIsLiveMode(tool.isActive || false);
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [toolId, agentId, isEditMode]);

  // Handle tool config updates from the memory chat
  const handleToolConfigUpdate = (toolConfig: any) => {
    setCurrentToolConfig(toolConfig);
    setHasUnsavedChanges(true);
    console.log('Tool config updated:', toolConfig);
  };

  // Handle back navigation
  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirm) return;
    }

    router.push(`/training/agent/trainingCenter/${agentId}`);
  };

  // Publish session to production
  const handlePublishSession = async () => {
    if (!isSessionMode) return;

    setIsPublishing(true);
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const token = await authUser.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-tools/sessions/${toolId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to publish tool');
      }

      // Success! Navigate to the published tool
      const publishedToolId = result.data.toolId;
      console.log(`Tool published successfully: ${publishedToolId}`);

      // Navigate to the published tool page
      router.push(`/training/agent/trainingCenter/${agentId}/tools/${publishedToolId}`);
    } catch (error) {
      console.error('Error publishing tool:', error);
      alert(`Error publishing tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Toggle live/draft mode
  const handleToggleLiveMode = async () => {
    if (!isEditMode) return; // Only allow toggle for existing tools

    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const token = await authUser.getIdToken();
      const newStatus = !isLiveMode;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-tools/${toolId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId,
          tool_config: {
            ...currentToolConfig,
            // Update any status fields if needed
          }
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update tool status');
      }

      setIsLiveMode(newStatus);
      setExistingTool(prev => prev ? { ...prev, isActive: newStatus } : null);

      console.log(`Tool ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling tool status:', error);
      alert(`Error updating tool status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="text-gray-600">Loading tool configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">
                  Tool Configuration
                </h1>
                <p className="text-sm text-gray-500">
                  {isSessionMode
                    ? 'Draft Mode - Configure before publishing'
                    : isEditMode
                      ? 'Modify tool settings'
                      : 'Create new 11 Labs tool'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Unsaved</span>
              </div>
            )}

            {/* View Current Config Button */}
            {currentToolConfig && (
              <button
                onClick={() => setShowConfigViewer(!showConfigViewer)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showConfigViewer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showConfigViewer ? 'Hide' : 'View'} Config
              </button>
            )}

            {/* Live/Draft Toggle */}
            {isEditMode && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleLiveMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isLiveMode
                      ? 'bg-green-600 focus:ring-green-500'
                      : 'bg-gray-200 focus:ring-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isLiveMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${
                  isLiveMode ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {isLiveMode ? 'Live' : 'Draft'}
                </span>
              </div>
            )}

            {/* Publish Button - For Session Mode */}
            {isSessionMode && (
              <button
                onClick={handlePublishSession}
                disabled={isPublishing || !currentToolConfig}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Publish to 11 Labs
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tool Info Banner */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {currentToolConfig && (
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  {currentToolConfig.type || 'webhook'}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {currentToolConfig.name || 'Unnamed Tool'}
                </span>
                {currentToolConfig.description && (
                  <span className="text-sm text-gray-500">
                    {currentToolConfig.description}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status Badge */}
          {isSessionMode ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs text-orange-600 font-medium">
                Draft Session
              </span>
            </div>
          ) : isEditMode && existingTool && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${existingTool.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {existingTool.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Config Viewer */}
      {showConfigViewer && currentToolConfig && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Current Tool Configuration</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isLiveMode
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isLiveMode ? 'Live' : 'Draft'}
              </span>
            </div>
            <button
              onClick={() => setShowConfigViewer(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4 max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {JSON.stringify(currentToolConfig, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Main Content - Tool Creation/Edit Chat */}
      <div className="flex-1 overflow-hidden">
        <ToolMemoryChat
          agentId={agentId}
          toolId={toolId}
          onToolConfigUpdate={(toolConfig) => {
            handleToolConfigUpdate(toolConfig);
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
