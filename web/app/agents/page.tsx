'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Bot, Settings, MoreVertical, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { getAllBotAvatars, BotAvatar } from '@/lib/utils/botAvatars';

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  totalInteractions?: number;
  botAvatarColor?: string;
  botEntityImagePath?: string;
  botIconImagePath?: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const { user, tenant, isAuthenticated } = useAuth();
  
  // Agent states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllAgents, setShowAllAgents] = useState(false);
  
  // Modal states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<BotAvatar | null>(null);
  const [availableAvatars] = useState<BotAvatar[]>(getAllBotAvatars());

  // Dropdown and delete states
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Status toggle states
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  // Set up real-time listener for agents
  useEffect(() => {
    if (!user?.uid || !tenant?.id) {
      setLoading(false);
      return;
    }

    // Create a query to get agents ordered by createdAt
    const agentsRef = collection(db, 'tenants', tenant.id, 'agents');
    const agentsQuery = query(agentsRef, orderBy('createdAt', 'desc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(agentsQuery, 
      (snapshot) => {
        const agentsData: Agent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          agentsData.push({
            id: doc.id,
            name: data.name || 'Unnamed Agent',
            status: data.status || 'draft',
            description: data.description || 'New agent ready for configuration',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            lastActive: data.lastActive,
            totalInteractions: data.totalInteractions || 0,
            botAvatarColor: data.botAvatarColor,
            botEntityImagePath: data.botEntityImagePath,
            botIconImagePath: data.botIconImagePath,
          });
        });
        setAgents(agentsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching agents:', error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user?.uid]);


  const handleCreateAgent = () => {
    setNewAgentName('');
    setSelectedAvatar(availableAvatars[0]); // Default to first avatar
    setIsCreateDialogOpen(true);
  };

  const handleCreateNewAgent = async () => {
    if (!newAgentName.trim() || !selectedAvatar) return;
    
    setIsCreating(true);
    try {
      // Call the API to create the agent with the name and selected avatar
      const response = await apiClient.post('/api/agent-management/create', {
        name: newAgentName.trim(),
        selectedAvatar: selectedAvatar
      });
      
      if (response.data.success && response.data.data.agentId) {
        // No need to manually add to agents array - the real-time listener will handle it
        setIsCreateDialogOpen(false);
        setNewAgentName('');
        
        // Navigate to agent configuration page using the returned agent ID
        router.push(`/agents/configuration/${response.data.data.agentId}`);
      } else {
        throw new Error('Failed to create agent');
      }
      
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManageAgent = (agentId: string) => {
    router.push(`/agents/configuration/${agentId}`);
  };

  const handleDropdownToggle = (agentId: string) => {
    setOpenDropdownId(openDropdownId === agentId ? null : agentId);
  };

  const handleDeleteClick = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete || deleteConfirmText !== 'confirm') return;
    
    setIsDeleting(true);
    try {
      // Call the delete API
      const response = await apiClient.delete(`/api/agent-management/${agentToDelete.id}`);
      
      if (response.data.success) {
        // No need to manually remove from agents array - the real-time listener will handle it
        setIsDeleteModalOpen(false);
        setAgentToDelete(null);
        setDeleteConfirmText('');
      } else {
        throw new Error('Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Failed to delete agent. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setAgentToDelete(null);
    setDeleteConfirmText('');
  };

  const handleStatusToggle = async (agent: Agent) => {
    setIsTogglingStatus(agent.id);
    
    try {
      const newStatus = agent.status === 'active' ? 'draft' : 'active';
      
      const response = await apiClient.post(`/api/agent-management/${agent.id}/manage`, {
        action: 'updateStatus',
        status: newStatus
      });
      
      if (!response.data.success) {
        throw new Error('Failed to update agent status');
      }
      
      // The real-time listener will handle updating the UI
    } catch (error) {
      console.error('Error toggling agent status:', error);
      alert('Failed to update agent status. Please try again.');
    } finally {
      setIsTogglingStatus(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };
    
    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownId]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading agents...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Agents</h1>
            <p className="mt-2 text-gray-500">Manage your AI agents</p>
          </div>
          <button
            onClick={handleCreateAgent}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Agent
          </button>
        </div>

        {/* Agents List */}
        <div className="space-y-4">
          {(showAllAgents ? agents : agents.slice(0, 5)).map(agent => (
            <div
              key={agent.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    {agent.botIconImagePath ? (
                      <img 
                        src={agent.botIconImagePath} 
                        alt={`${agent.name} Bot Icon`}
                        className="h-16 w-16 object-cover rounded-full"
                      />
                    ) : (
                      <div className="p-3 bg-primary-50 rounded-full">
                        <Bot className="h-16 w-16 text-primary-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'active' ? 'bg-green-500' : 
                          agent.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <span className={`text-xs ${
                          agent.status === 'active' ? 'text-green-700' : 
                          agent.status === 'draft' ? 'text-yellow-700' : 'text-gray-500'
                        }`}>
                          {agent.status === 'active' ? 'Active' : 
                           agent.status === 'draft' ? 'Draft' : 'Paused'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Created {new Date(agent.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Status Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {agent.status === 'active' ? 'Active' : 'Draft'}
                    </span>
                    <button
                      onClick={() => handleStatusToggle(agent)}
                      disabled={isTogglingStatus === agent.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        agent.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'
                      } ${isTogglingStatus === agent.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          agent.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleManageAgent(agent.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Manage
                  </button>
                  
                  {/* 3-dot menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDropdownToggle(agent.id);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {openDropdownId === agent.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => handleDeleteClick(agent)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Agent
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        {agents.length > 5 && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAllAgents(!showAllAgents)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showAllAgents ? 'View Less' : `View More (${agents.length - 5} more)`}
            </button>
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="text-center py-16">
            <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-500 mb-6">Create your first AI agent to get started</p>
            <button
              onClick={handleCreateAgent}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors mx-auto"
            >
              <Plus className="h-5 w-5" />
              Create Agent
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && agentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Delete Agent</h3>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  Are you sure you want to delete the agent <strong>"{agentToDelete.name}"</strong>?
                </p>
                <p className="mb-4 text-red-600">
                  This action cannot be undone. All agent data and configurations will be permanently deleted.
                </p>
                <p className="mb-2">
                  Type <strong>"confirm"</strong> to proceed:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type 'confirm' to delete"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== 'confirm' || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Agent
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Create New Agent</h3>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Enter agent name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Avatar
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {availableAvatars.map((avatar) => (
                    <button
                      key={avatar.color}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                        selectedAvatar?.color === avatar.color
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={avatar.iconImagePath}
                        alt={`${avatar.color} bot`}
                        className="w-12 h-12 object-cover rounded-full mx-auto"
                      />
                      <div className="mt-2 text-xs text-center capitalize text-gray-600">
                        {avatar.color}
                      </div>
                      {selectedAvatar?.color === avatar.color && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewAgent}
                disabled={!newAgentName.trim() || !selectedAvatar || isCreating}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}