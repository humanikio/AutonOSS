'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bot,
  MessageSquare,
  Phone,
  ArrowLeft,
  Settings,
  Zap,
  Activity,
  Clock,
  Plus,
  Play,
  History,
  Calendar,
  ArrowRight,
  Loader2,
  MoreVertical,
  Trash2,
  X,
  Wrench
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  botIconImagePath?: string;
  totalInteractions?: number;
  lastActive?: string;
}

interface TrainingAction {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'draft';
  category: 'sales' | 'support' | 'general';
}

interface AgentTool {
  id: string;
  name: string;
  description: string;
  type: 'webhook' | 'client' | 'system';
  status: 'active' | 'draft';
}

interface TrainingStats {
  totalSessions: number;
  chatSessions: number;
  callSessions: number;
  avgSessionDuration: number;
  actionsConfigured: number;
  toolsConfigured: number;
  lastTrainingSession: string;
}

interface PreviousSession {
  sessionId: string;
  agentId: string;
  mode: 'chat' | 'call';
  status: string;
  createdAt: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  duration: number;
  totalInteractions: number;
}

export default function TrainingCenter() {
  const params = useParams();
  const router = useRouter();
  const { user, tenant, getToken } = useAuth();
  const agentId = params.agentId as string;
  
  // Agent data
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Training stats derived from real data
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({
    totalSessions: 0,
    chatSessions: 0,
    callSessions: 0,
    avgSessionDuration: 0,
    actionsConfigured: 0,
    toolsConfigured: 0,
    lastTrainingSession: ''
  });

  const [recentActions, setRecentActions] = useState<TrainingAction[]>([]);
  const [recentTools, setRecentTools] = useState<AgentTool[]>([]);
  const [previousSessions, setPreviousSessions] = useState<PreviousSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [creatingAction, setCreatingAction] = useState(false);
  const [creatingTool, setCreatingTool] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<TrainingAction | null>(null);
  const [toolToDelete, setToolToDelete] = useState<AgentTool | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load agent data
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !agentId) {
      setLoading(false);
      return;
    }

    const agentRef = doc(db, 'tenants', tenant?.id, 'agents', agentId);
    const unsubscribe = onSnapshot(agentRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setAgent({
            id: doc.id,
            name: data.name || 'Unnamed Agent',
            status: data.status || 'draft',
            description: data.description || 'New agent ready for configuration',
            botIconImagePath: data.botIconImagePath,
            totalInteractions: data.totalInteractions || 0,
            lastActive: data.lastActive,
          });
        } else {
          setAgent(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching agent:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, tenant?.id, agentId]);

  // Load previous sessions
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !agentId) return;
    
    const fetchPreviousSessions = async () => {
      setLoadingSessions(true);
      try {
        const authUser = (await import('firebase/auth')).getAuth().currentUser;
        if (!authUser) return;

        const token = await authUser.getIdToken();
        
        const response = await fetch(`/api/agent-training/sessions/${agentId}?limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          const sessions = data.data.sessions || [];
          setPreviousSessions(sessions);
          
          // Calculate training stats from real data
          const totalSessions = sessions.length;
          const chatSessions = sessions.filter((s: PreviousSession) => s.mode === 'chat').length;
          const callSessions = sessions.filter((s: PreviousSession) => s.mode === 'call').length;
          const avgDuration = sessions.length > 0 
            ? sessions.reduce((acc: number, s: PreviousSession) => acc + s.duration, 0) / sessions.length
            : 0;
          const lastSession = sessions.length > 0 ? sessions[0].createdAt : '';
          
          setTrainingStats({
            totalSessions,
            chatSessions,
            callSessions,
            avgSessionDuration: Math.round(avgDuration * 10) / 10,
            actionsConfigured: recentActions.length, // Will be updated when actions are loaded
            toolsConfigured: 0, // Will be updated when tools are loaded
            lastTrainingSession: lastSession
          });
        } else {
          console.error('Failed to fetch previous sessions:', data.error);
        }
      } catch (error) {
        console.error('Error fetching previous sessions:', error);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchPreviousSessions();
  }, [user?.uid, tenant?.id, agentId]);

  // Fetch actions data function
  const fetchActions = async () => {
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();

      const response = await fetch(`/api/agent-training/actions/agent/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Map backend response to frontend interface
          const mappedActions = (data.data.actions || []).map((action: any) => ({
            id: action.actionId,
            name: action.name,
            description: action.description,
            trigger: 'webhook', // Default since backend doesn't have this field yet
            status: action.isActive ? 'active' : 'draft',
            category: action.type === 'support' ? 'support' :
                     action.type === 'nurture' ? 'sales' : 'general'
          }));

          setRecentActions(mappedActions);

          // Update training stats with real actions count
          setTrainingStats(prev => ({
            ...prev,
            actionsConfigured: mappedActions.length
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
      // Set to 0 if API call fails
      setTrainingStats(prev => ({
        ...prev,
        actionsConfigured: 0
      }));
    }
  };

  // Fetch tools data function
  const fetchTools = async () => {
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-tools?agentId=${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Map backend response to frontend interface
          const mappedTools = (data.data || []).map((tool: any) => ({
            id: tool.toolId,
            name: tool.tool_config?.name || 'Unnamed Tool',
            description: tool.tool_config?.description || '',
            type: tool.tool_config?.type || 'webhook',
            status: tool.isActive ? 'active' : 'draft'
          }));

          setRecentTools(mappedTools);

          // Update training stats with real tools count
          setTrainingStats(prev => ({
            ...prev,
            toolsConfigured: mappedTools.length
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
      // Set to 0 if API call fails
      setTrainingStats(prev => ({
        ...prev,
        toolsConfigured: 0
      }));
    }
  };

  // Load actions data
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !agentId) return;
    fetchActions();
  }, [user?.uid, tenant?.id, agentId]);

  // Load tools data
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !agentId) return;
    fetchTools();
  }, [user?.uid, tenant?.id, agentId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on the menu button or dropdown
      if (target.closest('[data-menu-button]') || target.closest('[data-menu-dropdown]')) {
        return;
      }
      setOpenMenuId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStartTrainingSession = async () => {
    try {
      // Get Firebase auth token
      const user = (await import('firebase/auth')).getAuth().currentUser;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const token = await user.getIdToken();

      // Call backend API to start training session
      const response = await fetch('/api/agent-training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: agentId,
          mode: 'chat' // Default to chat mode
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Navigate to training session with the generated session ID
        router.push(`/training/agent/trainingCenter/${agentId}/training-session/${data.data.sessionId}`);
      } else {
        console.error('Failed to start training session:', data.error);
        // Fallback to old behavior if API fails
        router.push(`/training/agent/trainingCenter/${agentId}/training-session/fallback`);
      }
    } catch (error) {
      console.error('Error starting training session:', error);
      // Fallback to old behavior if API fails
      router.push(`/training/agent/trainingCenter/${agentId}/training-session/fallback`);
    }
  };

  const handleContinueSession = (sessionId: string) => {
    router.push(`/training/agent/trainingCenter/${agentId}/training-session/${sessionId}`);
  };

  const handleManageActions = async () => {
    setCreatingAction(true);

    try {
      // Get Firebase auth token
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        console.error('User not authenticated');
        setCreatingAction(false);
        return;
      }

      const token = await authUser.getIdToken();

      // Create new action via API
      const response = await fetch('/api/agent-training/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: agentId
        })
      });

      const result = await response.json();
      console.log('API Response:', { response: response.ok, result });

      if (response.ok && result.success && result.data && result.data.actionId) {
        console.log('Action created successfully, navigating to:', result.data.actionId);

        // Refresh the actions list to show the new action
        await fetchActions();

        // Navigate to the newly created action for editing
        router.push(`/training/agent/trainingCenter/${agentId}/actions/${result.data.actionId}`);
      } else {
        console.error('Failed to create action:', result);
        alert(`Failed to create action: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating action:', error);
      alert('Error creating action. Please try again.');
    } finally {
      setCreatingAction(false);
    }
  };

  const handleManageTools = async () => {
    setCreatingTool(true);

    try {
      // Get Firebase auth token using AuthContext
      const token = await getToken();
      if (!token) {
        console.error('User not authenticated');
        setCreatingTool(false);
        return;
      }

      // Create new tool SESSION (not tool directly)
      // This allows drafting the tool config before publishing to 11 Labs
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-tools/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: agentId
        })
      });

      const result = await response.json();
      console.log('Tool Session API Response:', { response: response.ok, result });

      if (response.ok && result.success && result.data && result.data.sessionId) {
        console.log('Tool session created successfully, navigating to:', result.data.sessionId);

        // Navigate to the tool page with the session ID
        // The tool page will handle session mode vs published tool mode
        router.push(`/training/agent/trainingCenter/${agentId}/tools/${result.data.sessionId}`);
      } else {
        console.error('Failed to create tool session:', result);
        alert(`Failed to create tool session: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating tool session:', error);
      alert('Error creating tool session. Please try again.');
    } finally {
      setCreatingTool(false);
    }
  };


  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales':
        return 'bg-green-100 text-green-700';
      case 'support':
        return 'bg-blue-100 text-blue-700';
      case 'general':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getToolTypeColor = (type: string) => {
    switch (type) {
      case 'webhook':
        return 'bg-blue-100 text-blue-700';
      case 'client':
        return 'bg-purple-100 text-purple-700';
      case 'system':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
      case 'ended':
        return 'bg-blue-100 text-blue-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading agent...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Agent not found</h3>
            <p className="text-gray-500 mb-6">The agent you're looking for doesn't exist or has been deleted.</p>
            <button
              onClick={() => router.push('/training/agent')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Training
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle delete action
  const handleDeleteAction = async () => {
    if (!actionToDelete || !user) return;

    setIsDeleting(true);
    try {
      // Get Firebase auth token using the same pattern as other functions
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const token = await authUser.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete action');
      }

      // Remove from local state
      setRecentActions(prev => prev.filter(action => action.id !== actionToDelete.id));

      // Update stats
      setTrainingStats(prev => ({
        ...prev,
        actionsConfigured: prev.actionsConfigured - 1
      }));

      console.log('Action deleted successfully');
    } catch (error) {
      console.error('Error deleting action:', error);
      alert(`Error deleting action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setActionToDelete(null);
      setOpenMenuId(null);
    }
  };

  // Handle delete tool
  const handleDeleteTool = async () => {
    if (!toolToDelete || !user) return;

    setIsDeleting(true);
    try {
      // Get Firebase auth token
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const token = await authUser.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-tools/${toolToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete tool');
      }

      // Remove from local state
      setRecentTools(prev => prev.filter(tool => tool.id !== toolToDelete.id));

      // Update stats
      setTrainingStats(prev => ({
        ...prev,
        toolsConfigured: prev.toolsConfigured - 1
      }));

      console.log('Tool deleted successfully');
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert(`Error deleting tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setToolToDelete(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/training/agent')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-50 rounded-lg">
                  {agent.botIconImagePath ? (
                    <img 
                      src={agent.botIconImagePath} 
                      alt={`${agent.name} Bot Icon`}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <Bot className="h-10 w-10 text-primary-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-light text-gray-900">{agent.name} Training Center</h1>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' : 
                        agent.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        agent.status === 'active' ? 'text-green-700' : 
                        agent.status === 'draft' ? 'text-yellow-700' : 'text-gray-500'
                      }`}>
                        {agent.status === 'active' ? 'Active' : 
                         agent.status === 'draft' ? 'Draft' : 'Paused'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-500">Configure, train, and test your agent</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push(`/agents/configuration/${agentId}`)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Menu */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('training')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'training'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Training Sessions
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'actions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Actions
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tools'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tools
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto">

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{trainingStats.totalSessions}</div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{trainingStats.actionsConfigured}</div>
                <div className="text-sm text-gray-500">Actions</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{trainingStats.toolsConfigured}</div>
                <div className="text-sm text-gray-500">Tools</div>
              </div>
            </div>

            {/* Training Section and Actions - Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Training Section */}
              <div className="space-y-6">
                {/* Start Training Button */}
                <button
                  onClick={handleStartTrainingSession}
                  className="w-full p-6 bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-xl hover:from-primary-100 hover:to-purple-100 transition-all group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors mb-4">
                      <Activity className="h-8 w-8 text-primary-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">Start New Session</h3>
                    <p className="text-sm text-gray-500 mb-4">Practice with chat or voice</p>
                    <div className="flex items-center gap-2 text-primary-600 font-medium">
                      <span>Begin Training</span>
                      <Play className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* Recent Sessions */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-medium text-gray-900">Recent Sessions</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('training')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View All
                    </button>
                  </div>
                  
                  {previousSessions.length > 0 ? (
                    <div className="space-y-3">
                      {previousSessions.slice(0, 2).map((session) => (
                        <div
                          key={session.sessionId}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded">
                              {session.mode === 'chat' ? (
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Phone className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">
                                  {formatSessionDate(session.createdAt)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getSessionStatusColor(session.status)}`}>
                                  {session.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                <span>{session.messageCount} messages</span>
                                {session.duration > 0 && <span>{session.duration}m</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleContinueSession(session.sessionId)}
                            className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors text-sm font-medium"
                          >
                            Continue
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <History className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No training sessions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div className="space-y-6">
                {/* Create Action Button */}
                <button
                  onClick={handleManageActions}
                  disabled={creatingAction}
                  className={`w-full p-6 rounded-xl transition-all ${
                    creatingAction 
                      ? 'bg-gray-100 border border-gray-200 cursor-not-allowed' 
                      : 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 hover:from-orange-100 hover:to-amber-100'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-4 rounded-lg transition-colors mb-4 ${
                      creatingAction 
                        ? 'bg-gray-200' 
                        : 'bg-orange-100 group-hover:bg-orange-200'
                    }`}>
                      {creatingAction ? (
                        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                      ) : (
                        <Zap className="h-8 w-8 text-orange-600" />
                      )}
                    </div>
                    <h3 className={`font-medium mb-2 ${creatingAction ? 'text-gray-500' : 'text-gray-900'}`}>
                      {creatingAction ? 'Creating Action...' : 'Create New Action'}
                    </h3>
                    <p className={`text-sm mb-4 ${creatingAction ? 'text-gray-400' : 'text-gray-500'}`}>
                      {creatingAction ? 'Please wait...' : 'Define custom behaviors'}
                    </p>
                    {!creatingAction && (
                      <div className="flex items-center gap-2 text-orange-600 font-medium">
                        <span>Get Started</span>
                        <Plus className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Recent Actions */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('actions')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Manage All
                    </button>
                  </div>
                  
                  {recentActions.length > 0 ? (
                    <div className="space-y-3">
                      {recentActions.slice(0, 3).map((action) => (
                        <button
                          key={action.id}
                          onClick={() => router.push(`/training/agent/trainingCenter/${agentId}/actions/${action.id}`)}
                          className="w-full p-3 border border-gray-200 rounded-lg hover:border-orange-200 hover:bg-orange-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 rounded">
                              <Zap className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 text-sm truncate">{action.name}</h4>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(action.status)}`}>
                                  {action.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{action.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Zap className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No actions configured yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training Sessions Tab */}
        {activeTab === 'training' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Start Training Session */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Interactive Training</h3>
                
                <button
                  onClick={handleStartTrainingSession}
                  className="w-full p-6 bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-xl hover:from-primary-100 hover:to-purple-100 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
                        <Activity className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-gray-900">Start New Session</h4>
                        <p className="text-sm text-gray-500">Practice conversations</p>
                      </div>
                    </div>
                    <Play className="h-5 w-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Training modes:</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span>Text conversations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span>Voice conversations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span>Custom actions</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous Sessions */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Previous Sessions</h3>
                  </div>
                  {previousSessions.length > 0 && (
                    <span className="text-sm text-gray-500">{previousSessions.length} sessions</span>
                  )}
                </div>

                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading sessions...</span>
                  </div>
                ) : previousSessions.length > 0 ? (
                  <div>
                    <div className="space-y-3">
                      {(showAllSessions ? previousSessions : previousSessions.slice(0, 4)).map((session) => (
                      <div
                        key={session.sessionId}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            {session.mode === 'chat' ? (
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Phone className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                Session {session.sessionId.slice(0, 8)}...
                              </h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${getSessionStatusColor(session.status)}`}>
                                {session.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatSessionDate(session.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{session.messageCount} messages</span>
                              </div>
                              {session.duration > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{session.duration}m</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleContinueSession(session.sessionId)}
                          className="px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1 text-sm font-medium"
                        >
                          Continue
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    </div>
                    {previousSessions.length > 4 && (
                      <button
                        onClick={() => setShowAllSessions(!showAllSessions)}
                        className="mt-4 w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1"
                      >
                        {showAllSessions ? 'View Less' : `View ${previousSessions.length - 4} More`}
                        <ArrowRight className={`h-3 w-3 transition-transform ${showAllSessions ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No previous sessions</h4>
                    <p className="text-gray-500 mb-4">
                      Start your first training session to begin practicing with your agent.
                    </p>
                    <button
                      onClick={handleStartTrainingSession}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Start Training
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Action */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Action Management</h3>
                
                <button
                  onClick={handleManageActions}
                  disabled={creatingAction}
                  className={`w-full p-6 rounded-xl transition-all group ${
                    creatingAction 
                      ? 'bg-gray-100 border border-gray-200 cursor-not-allowed' 
                      : 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 hover:from-orange-100 hover:to-amber-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg transition-colors ${
                        creatingAction 
                          ? 'bg-gray-200' 
                          : 'bg-orange-100 group-hover:bg-orange-200'
                      }`}>
                        {creatingAction ? (
                          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                        ) : (
                          <Zap className="h-6 w-6 text-orange-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className={`font-medium ${creatingAction ? 'text-gray-500' : 'text-gray-900'}`}>
                          {creatingAction ? 'Creating Action...' : 'Create New Action'}
                        </h4>
                        <p className={`text-sm ${creatingAction ? 'text-gray-400' : 'text-gray-500'}`}>
                          {creatingAction ? 'Please wait...' : 'Define custom behaviors'}
                        </p>
                      </div>
                    </div>
                    {!creatingAction && (
                      <Plus className="h-5 w-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </button>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Action types:</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <span>Custom triggers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span>API integrations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <span>Response templates</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configured Actions */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Configured Actions</h3>
                  </div>
                  {recentActions.length > 0 && (
                    <span className="text-sm text-gray-500">{recentActions.length} actions</span>
                  )}
                </div>

                {recentActions.length > 0 ? (
                  <div className="space-y-3">
                    {recentActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <Zap className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{action.name}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(action.status)}`}>
                                {action.status}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(action.category)}`}>
                                {action.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>{action.description}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => router.push(`/training/agent/trainingCenter/${agentId}/actions/${action.id}`)}
                            className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1 text-sm font-medium"
                          >
                            Edit
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          
                          {/* 3-dot menu */}
                          <div className="relative">
                            <button
                              data-menu-button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === action.id ? null : action.id);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {openMenuId === action.id && (
                              <div 
                                data-menu-dropdown
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionToDelete(action);
                                    setShowDeleteModal(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Action
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Zap className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No actions configured</h4>
                    <p className="text-gray-500 mb-4">
                      Create your first custom action to define specific behaviors for your agent.
                    </p>
                    <button
                      onClick={handleManageActions}
                      disabled={creatingAction}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        creatingAction 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {creatingAction ? 'Creating...' : 'Create Action'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Tool */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tool Management</h3>

                <button
                  onClick={handleManageTools}
                  disabled={creatingTool}
                  className={`w-full p-6 rounded-xl transition-all group ${
                    creatingTool
                      ? 'bg-gray-100 border border-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg transition-colors ${
                        creatingTool
                          ? 'bg-gray-200'
                          : 'bg-blue-100 group-hover:bg-blue-200'
                      }`}>
                        {creatingTool ? (
                          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                        ) : (
                          <Wrench className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className={`font-medium ${creatingTool ? 'text-gray-500' : 'text-gray-900'}`}>
                          {creatingTool ? 'Creating Tool...' : 'Create New Tool'}
                        </h4>
                        <p className={`text-sm ${creatingTool ? 'text-gray-400' : 'text-gray-500'}`}>
                          {creatingTool ? 'Please wait...' : 'Configure 11 Labs tools'}
                        </p>
                      </div>
                    </div>
                    {!creatingTool && (
                      <Plus className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </button>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Tool types:</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Wrench className="h-4 w-4 text-blue-500" />
                      <span>Webhook integrations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <span>Client-side tools</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span>System tools</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configured Tools */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Configured Tools</h3>
                  </div>
                  {recentTools.length > 0 && (
                    <span className="text-sm text-gray-500">{recentTools.length} tools</span>
                  )}
                </div>

                {recentTools.length > 0 ? (
                  <div className="space-y-3">
                    {recentTools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <Wrench className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{tool.name}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tool.status)}`}>
                                {tool.status}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${getToolTypeColor(tool.type)}`}>
                                {tool.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>{tool.description}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/training/agent/trainingCenter/${agentId}/tools/${tool.id}`)}
                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm font-medium"
                          >
                            Edit
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          {/* 3-dot menu */}
                          <div className="relative">
                            <button
                              data-menu-button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === tool.id ? null : tool.id);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuId === tool.id && (
                              <div
                                data-menu-dropdown
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setToolToDelete(tool);
                                    setShowDeleteModal(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Tool
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Wrench className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No tools configured</h4>
                    <p className="text-gray-500 mb-4">
                      Create your first tool to enable your agent to make API calls and execute functions.
                    </p>
                    <button
                      onClick={handleManageTools}
                      disabled={creatingTool}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        creatingTool
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {creatingTool ? 'Creating...' : 'Create Tool'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (actionToDelete || toolToDelete) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {actionToDelete ? 'Delete Action' : 'Delete Tool'}
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete the {actionToDelete ? 'action' : 'tool'} "{actionToDelete?.name || toolToDelete?.name}"?
                </p>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. All associated chat sessions and data will be permanently removed.
                </p>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionToDelete) {
                      handleDeleteAction();
                    } else if (toolToDelete) {
                      handleDeleteTool();
                    }
                  }}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      {actionToDelete ? 'Delete Action' : 'Delete Tool'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}