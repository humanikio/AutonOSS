'use client';

import { Play, Square, Pause, RotateCcw, Save } from 'lucide-react';

interface SessionState {
  isActive: boolean;
  startTime?: Date;
  messageCount: number;
  duration: number;
}

interface SessionControlsProps {
  sessionState: SessionState;
  onStart: () => void;
  onEnd: () => void;
  onPause: () => void;
}

export default function SessionControls({
  sessionState,
  onStart,
  onEnd,
  onPause
}: SessionControlsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestart = () => {
    onEnd();
    setTimeout(() => {
      onStart();
    }, 100);
  };

  const handleSaveSession = () => {
    // Implement session saving logic
    console.log('Saving session...', {
      duration: sessionState.duration,
      messageCount: sessionState.messageCount,
      startTime: sessionState.startTime
    });
  };

  return (
    <div className="space-y-4">
      {/* Session Timer */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Timer</h3>
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
            {formatDuration(sessionState.duration)}
          </div>
          <div className="text-sm text-gray-500">
            {sessionState.isActive ? 'Active session' : 'Session stopped'}
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Controls</h3>
        
        <div className="space-y-3">
          {!sessionState.isActive ? (
            <button
              onClick={onStart}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Play className="h-5 w-5" />
              Start Session
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={onPause}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
              
              <button
                onClick={onEnd}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Square className="h-4 w-4" />
                End Session
              </button>
            </div>
          )}

          {sessionState.duration > 0 && (
            <button
              onClick={handleRestart}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Info</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Messages</span>
            <span className="font-medium text-gray-900">{sessionState.messageCount}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Duration</span>
            <span className="font-medium text-gray-900">
              {formatDuration(sessionState.duration)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status</span>
            <span className={`text-sm font-medium ${
              sessionState.isActive ? 'text-green-600' : 'text-gray-500'
            }`}>
              {sessionState.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {sessionState.startTime && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Started</span>
              <span className="text-sm text-gray-900">
                {sessionState.startTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="space-y-2">
          <button
            onClick={handleSaveSession}
            disabled={sessionState.duration === 0}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Session
          </button>
          
          <button
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View History
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">Training Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Practice natural conversation flows</li>
          <li>• Test edge cases and difficult scenarios</li>
          <li>• Monitor response quality and timing</li>
          <li>• Use varied language and phrasings</li>
        </ul>
      </div>
    </div>
  );
}