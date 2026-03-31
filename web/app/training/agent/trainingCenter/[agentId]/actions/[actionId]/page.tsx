'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  Zap, 
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import ActionMemoryChat from '@/components/shared/ActionMemoryChat/ActionMemoryChat';
import { ActionConfiguration } from '@/components/shared/ActionCreationChat/types/actionCreation';
import { PostActionConfiguration } from '@/components/shared/ActionCreationChat/types/postActionConfig';

interface ActionManagementPageProps {
  params: Promise<{
    agentId: string;
    actionId: string; // This will be "new" for new actions, or an actual action ID for editing
  }>;
}

// Load existing action from API
const loadAction = async (actionId: string): Promise<ActionConfiguration | null> => {
  if (actionId === 'new') return null;
  
  try {
    const authUser = (await import('firebase/auth')).getAuth().currentUser;
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    const token = await authUser.getIdToken();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('Failed to load action:', result.error);
      return null;
    }

    const actionData = result.data;
    return {
      id: actionData.actionId,
      name: actionData.name,
      description: actionData.description,
      type: actionData.type,
      prompt: actionData.prompt,
      understanding: actionData.understanding,
      isActive: actionData.isActive,
      createdAt: new Date(actionData.createdAt),
      updatedAt: new Date(actionData.updatedAt)
    };
  } catch (error) {
    console.error('Error loading action:', error);
    return null;
  }
};

export default function ActionManagementPage({ params }: ActionManagementPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const agentId = resolvedParams.agentId;
  const actionId = resolvedParams.actionId; // Keep original for routing
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAction, setExistingAction] = useState<ActionConfiguration | null>(null);
  const [actionName, setActionName] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [postActionConfig, setPostActionConfig] = useState<PostActionConfiguration | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [showPromptViewer, setShowPromptViewer] = useState<boolean>(false);

  // Determine if we're editing or creating
  const isEditMode = resolvedParams.actionId !== 'new';

  // Load existing action if editing
  useEffect(() => {
    const loadData = async () => {
      if (isEditMode) {
        const action = await loadAction(actionId);
        if (action) {
          setExistingAction(action);
          setActionName(action.name);
          setActionDescription(action.description);
          setCurrentPrompt(action.prompt || '');
          setIsLiveMode(action.isActive || false);
          // Load post-action config if exists
          if ((action as any).postActionConfig) {
            setPostActionConfig((action as any).postActionConfig);
          }
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [actionId, isEditMode]);

  // Handle prompt updates from the memory chat
  const handlePromptUpdate = (prompt: string) => {
    setHasUnsavedChanges(true);
    console.log('Prompt updated:', prompt);
  };

  // Handle action save (simplified since prompt is handled by memory system)
  const handleActionSave = async () => {
    if (!actionName.trim()) {
      alert('Please provide an action name');
      return;
    }

    setIsSaving(true);
    
    try {
      // Get Firebase auth token
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const token = await authUser.getIdToken();

      // Prepare the action data
      const actionData = {
        agentId,
        name: actionName,
        description: actionDescription,
        postActionConfig,
        isActive: true
      };

      console.log('Saving action:', actionData);

      if (isEditMode) {
        // Update existing action
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(actionData)
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to update action');
        }

        console.log('Action updated successfully:', result.data);
      } else {
        // For new actions, we need to ensure the action document exists
        // The memory system will have already created it with the prompt
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...actionData,
            actionId, // Pass the actionId for new actions
            prompt: '' // Will be filled by memory system
          })
        });

        const result = await response.json();
        
        if (!response.ok && !result.error?.includes('already exists')) {
          throw new Error(result.error || 'Failed to create action');
        }

        console.log('Action created successfully');
      }
      
      // Show success and redirect
      setHasUnsavedChanges(false);
      
      // Redirect to training center
      router.push(`/training/agent/trainingCenter/${agentId}`);
    } catch (error) {
      console.error('Error saving action:', error);
      alert(`Error saving action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirm) return;
    }
    
    router.push(`/training/agent/trainingCenter/${agentId}`);
  };

  // Toggle live/draft mode
  const handleToggleLiveMode = async () => {
    if (!isEditMode) return; // Only allow toggle for existing actions
    
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const token = await authUser.getIdToken();
      const newStatus = !isLiveMode;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId,
          isActive: newStatus,
          isDraft: !newStatus
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update action status');
      }

      setIsLiveMode(newStatus);
      setExistingAction(prev => prev ? { ...prev, isActive: newStatus } : null);
      
      console.log(`Action ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling action status:', error);
      alert(`Error updating action status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
          <span className="text-gray-600">Loading action configuration...</span>
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
              <div className="p-2 bg-orange-50 rounded-lg">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">
                  Action Configuration
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditMode ? 'Modify action settings' : 'Create new custom action'}
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
            
            <button
              onClick={handleActionSave}
              disabled={isSaving || (!isEditMode && !actionName.trim())}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSaving || (!isEditMode && !actionName.trim())
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Save' : 'Create'}
                </>
              )}
            </button>

            {/* View Current Prompt Button */}
            {currentPrompt && (
              <button
                onClick={() => setShowPromptViewer(!showPromptViewer)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showPromptViewer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPromptViewer ? 'Hide' : 'View'} Prompt
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

            {/* Publish Button */}
            <button
              onClick={() => {
                // Find the ActionMemoryChat component and trigger publish
                const publishEvent = new CustomEvent('triggerPublish');
                window.dispatchEvent(publishEvent);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Simplified Metadata */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={actionName}
              onChange={(e) => {
                setActionName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Enter action name (e.g., Customer Support, Lead Qualification)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>

          {isEditMode && existingAction && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${existingAction.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {existingAction.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Prompt Viewer */}
      {showPromptViewer && currentPrompt && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Current Active Prompt</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isLiveMode 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isLiveMode ? 'Live' : 'Draft'}
              </span>
            </div>
            <button
              onClick={() => setShowPromptViewer(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4 max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {currentPrompt}
            </pre>
          </div>
        </div>
      )}

      {/* Main Content - Action Creation/Edit */}
      <div className="flex-1 overflow-hidden">
        <ActionMemoryChat
          agentId={agentId}
          actionId={actionId}
          onPromptUpdate={(prompt) => {
            setCurrentPrompt(prompt);
            handlePromptUpdate(prompt);
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}