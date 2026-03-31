'use client';

import { Activity, MessageSquare, Clock, TrendingUp } from 'lucide-react';

interface SessionState {
  isActive: boolean;
  startTime?: Date;
  messageCount: number;
  duration: number;
}

interface SessionStatsProps {
  sessionState: SessionState;
}

export default function SessionStats({ sessionState }: SessionStatsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateMessagesPerMinute = () => {
    if (sessionState.duration === 0) return 0;
    const minutes = sessionState.duration / 60;
    return Math.round(sessionState.messageCount / minutes * 10) / 10;
  };

  const getActivityStatus = () => {
    if (!sessionState.isActive) return { color: 'text-gray-500', text: 'Inactive' };
    
    const mpm = calculateMessagesPerMinute();
    if (mpm > 3) return { color: 'text-green-500', text: 'Very Active' };
    if (mpm > 1.5) return { color: 'text-blue-500', text: 'Active' };
    if (mpm > 0) return { color: 'text-yellow-500', text: 'Moderate' };
    return { color: 'text-gray-500', text: 'Starting' };
  };

  const activityStatus = getActivityStatus();

  return (
    <div className="flex items-center gap-6">
      {/* Session Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          sessionState.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
        }`} />
        <span className={`text-sm font-medium ${activityStatus.color}`}>
          {activityStatus.text}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4">
        {/* Duration */}
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {formatDuration(sessionState.duration)}
          </span>
        </div>

        {/* Messages */}
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {sessionState.messageCount}
          </span>
        </div>

        {/* Messages per minute */}
        {sessionState.duration > 0 && (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {calculateMessagesPerMinute()}/min
            </span>
          </div>
        )}

        {/* Activity indicator */}
        <div className="flex items-center gap-1">
          <Activity className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {sessionState.isActive ? 'Live' : 'Stopped'}
          </span>
        </div>
      </div>
    </div>
  );
}