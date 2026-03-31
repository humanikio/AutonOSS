/**
 * PreviewArea
 *
 * Main preview area - shows logo for now, will show live agent updates later.
 */

'use client';

import { Agent } from '../../types';

interface PreviewAreaProps {
  agent: Agent;
}

export default function PreviewArea({ agent }: PreviewAreaProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-50">
      {/* Logo/Brand */}
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          {agent.name}
        </h2>

        <p className="text-sm text-slate-500 text-center max-w-sm">
          Chat with your agent to see live previews of tools, configurations, and responses.
        </p>
      </div>

      {/* Status indicator */}
      <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200">
        <div className={`w-2 h-2 rounded-full ${
          agent.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
        }`} />
        <span className="text-xs text-slate-500 capitalize">
          {agent.status || 'draft'}
        </span>
      </div>
    </div>
  );
}
