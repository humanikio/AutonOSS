'use client';

import { Plus } from 'lucide-react';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy';
}

interface AgentsSidebarProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onAddAgent?: () => void;
}

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function AgentsSidebar({
  agents,
  selectedAgent,
  onSelectAgent,
  onAddAgent
}: AgentsSidebarProps) {
  return (
    <div className="w-64 border-r border-gray-200 flex flex-col bg-white">
      <div className="h-14 px-4 border-b border-gray-200 flex items-center">
        <h2 className="text-sm font-medium text-gray-900">Agents</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${
              selectedAgent?.id === agent.id
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-medium">
                {getInitials(agent.name)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                agent.status === 'online' ? 'bg-green-500' :
                agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
              <div className="text-xs text-gray-500 truncate">{agent.role}</div>
            </div>
          </button>
        ))}
      </div>

      {onAddAgent && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onAddAgent}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Agent</span>
          </button>
        </div>
      )}
    </div>
  );
}
