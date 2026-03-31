'use client';

import { Bot, Phone } from 'lucide-react';

interface AgentReportProps {
  text: string;
  time: string;
  agentName?: string;
  agentId?: string;
  agents?: Record<string, any>;
  direction: 'inbound' | 'outbound';
}

export default function AgentReport({
  text,
  time,
  agentName,
  agentId,
  agents,
  direction
}: AgentReportProps) {

  // Get agent details if available
  const agent = agentId && agents ? agents[agentId] : null;
  const displayName = agent?.name || agentName || 'Agent';

  return (
    <div className="mb-3">
      <div className="flex items-start gap-2 flex-row-reverse">
        {/* Agent Avatar */}
        <div className="flex-shrink-0">
          {agent?.botIconImagePath ? (
            <img
              src={agent.botIconImagePath}
              alt={`${displayName} Avatar`}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-indigo-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-right">
          {/* Agent Name Badge */}
          <div className="flex items-center gap-1.5 mb-1 flex-row-reverse">
            <span className="text-xs font-medium text-indigo-600">{displayName}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">Report</span>
          </div>

          {/* Report Card */}
          <div className="inline-block max-w-md">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 shadow-sm">
              {/* Report Icon & Action */}
              <div className="flex items-center gap-2 mb-2">
                <Phone className={`h-3.5 w-3.5 ${direction === 'outbound' ? 'text-green-600' : 'text-blue-600'}`} />
                <span className="text-xs font-medium text-gray-700">
                  {direction === 'outbound' ? 'Outbound call completed' : 'Inbound call completed'}
                </span>
              </div>

              {/* Summary Text */}
              <div className="text-sm text-gray-700 leading-relaxed text-left">
                {text}
              </div>
            </div>

            {/* Timestamp */}
            <p className="text-xs text-gray-400 mt-1 mr-1">
              {time}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
