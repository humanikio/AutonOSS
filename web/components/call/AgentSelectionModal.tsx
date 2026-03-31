'use client';

import { useState } from 'react';
import { Search, Phone, Bot, X } from 'lucide-react';
import { FirestoreAgent } from '@/lib/services/agentService';

interface AgentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: FirestoreAgent[];
  onSelectAgent: (agent: FirestoreAgent) => void;
  loading?: boolean;
}

export default function AgentSelectionModal({
  isOpen,
  onClose,
  agents,
  onSelectAgent,
  loading = false
}: AgentSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<FirestoreAgent | null>(null);

  if (!isOpen) return null;

  // Filter agents based on search query
  const filteredAgents = agents.filter(agent =>
    agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.agentPhoneNumber?.includes(searchQuery)
  );

  const handleSelectAgent = () => {
    if (selectedAgent) {
      onSelectAgent(selectedAgent);
    }
  };

  const renderAgentAvatar = (agent: FirestoreAgent) => {
    if (agent.botIconImagePath) {
      return (
        <img 
          src={agent.botIconImagePath} 
          alt={`${agent.name} Avatar`}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    } else {
      return (
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <Bot className="h-6 w-6 text-indigo-600" />
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Select Agent for Call</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Choose an agent to initiate the phone call
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto max-h-64">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading agents...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {agents.length === 0 ? 'No agents available for phone calls' : 'No agents found'}
              </p>
              <p className="text-sm text-gray-400">
                {agents.length === 0 
                  ? 'Agents need to have phone capabilities enabled and a phone number assigned'
                  : 'Try adjusting your search terms'
                }
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAgent?.id === agent.id
                      ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {renderAgentAvatar(agent)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {agent.name}
                      </h4>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {agent.agentPhoneNumber}
                      </p>
                      {agent.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedAgent?.id === agent.id
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedAgent?.id === agent.id && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectAgent}
            disabled={!selectedAgent || filteredAgents.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Start Call
          </button>
        </div>
      </div>
    </div>
  );
}