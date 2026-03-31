/**
 * AgentBasicInfo
 *
 * Agent name input with light styling.
 */

'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Agent } from '../../types';

interface AgentBasicInfoProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
  onUpdateName: (name: string) => Promise<void>;
}

export default function AgentBasicInfo({
  agent,
  onUpdateName,
}: AgentBasicInfoProps) {
  const [tempName, setTempName] = useState(agent.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName === agent.name) return;
    setIsSavingName(true);
    try {
      await onUpdateName(tempName.trim());
    } finally {
      setIsSavingName(false);
    }
  };

  const hasChanges = tempName.trim() !== agent.name;

  return (
    <div>
      <label className="block text-sm text-slate-600 mb-2">
        Agent Name
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
          className="flex-1 px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          placeholder="Enter agent name"
        />
        <button
          onClick={handleSaveName}
          disabled={isSavingName || !hasChanges}
          className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-default transition-colors flex items-center gap-1.5"
        >
          {isSavingName ? (
            <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
