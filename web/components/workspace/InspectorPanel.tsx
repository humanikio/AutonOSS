'use client';

import { X } from 'lucide-react';
import { Agent } from './AgentsSidebar';

interface InspectorPanelProps {
  selectedAgent: Agent | null;
  onClose: () => void;
}

export default function InspectorPanel({ selectedAgent, onClose }: InspectorPanelProps) {
  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col">
      <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Details</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedAgent ? (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                Agent
              </label>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Name</div>
                  <div className="text-sm text-gray-900">{selectedAgent.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Role</div>
                  <div className="text-sm text-gray-900">{selectedAgent.role}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedAgent.status === 'online' ? 'bg-green-500' :
                      selectedAgent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm text-gray-900 capitalize">{selectedAgent.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                Actions
              </label>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left">
                  Edit Agent
                </button>
                <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left">
                  View History
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">No selection</p>
          </div>
        )}
      </div>
    </div>
  );
}
