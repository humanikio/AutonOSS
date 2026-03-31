/**
 * AgentsPanel
 *
 * Displays list of available AI agents in the workspace.
 * Click an agent to open a chat panel with them.
 */

'use client';

import { Bot } from 'lucide-react';
import { BasePanelProps, AgentPanelConfig } from '@/types/workspace/panel.types';
import PanelContainer from './PanelContainer';

// TODO: Replace with real agent data from props/context
interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy';
}

const MOCK_AGENTS: Agent[] = [
  { id: '1', name: 'Ava Chen', role: 'Sales Agent', status: 'online' },
  { id: '2', name: 'Max Rivera', role: 'Operations', status: 'online' },
  { id: '3', name: 'Nova Park', role: 'Developer', status: 'busy' },
  { id: '4', name: 'Pulse', role: 'Automation', status: 'online' }
];

interface AgentsPanelProps extends BasePanelProps {
  config: AgentPanelConfig;
  onAgentSelect?: (agentId: string) => void;
}

export default function AgentsPanel({
  panelId,
  config,
  onClose,
  onAgentSelect
}: AgentsPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAgentClick = (agentId: string) => {
    if (onAgentSelect) {
      onAgentSelect(agentId);
    }
  };

  return (
    <PanelContainer
      panelId={panelId}
      title={config.title || 'Agents'}
      onClose={onClose}
    >
      <div className="p-3 space-y-1">
        {MOCK_AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => handleAgentClick(agent.id)}
            className="w-full flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors text-left"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-medium">
                {getInitials(agent.name)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                agent.status === 'online' ? 'bg-green-500' :
                agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
              <div className="text-xs text-gray-500 truncate">{agent.role}</div>
            </div>
          </button>
        ))}
      </div>
    </PanelContainer>
  );
}
