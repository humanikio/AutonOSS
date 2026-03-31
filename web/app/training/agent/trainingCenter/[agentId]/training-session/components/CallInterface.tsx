'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  Bot,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  botIconImagePath?: string;
}

interface SessionState {
  isActive: boolean;
  startTime?: Date;
  messageCount: number;
  duration: number;
}

interface CallEvent {
  id: string;
  type: 'user_spoke' | 'agent_spoke' | 'silence' | 'action_triggered';
  content: string;
  timestamp: Date;
  duration?: number;
}

interface CallInterfaceProps {
  agent: Agent;
  sessionState: SessionState;
  onMessageSent: () => void;
}

export default function CallInterface({
  agent,
  sessionState,
  onMessageSent
}: CallInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [callEvents, setCallEvents] = useState<CallEvent[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio level for visual feedback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      setAudioLevel(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Simulate agent speaking after user input
  useEffect(() => {
    if (callEvents.length > 0) {
      const lastEvent = callEvents[callEvents.length - 1];
      if (lastEvent.type === 'user_spoke') {
        setTimeout(() => {
          simulateAgentResponse();
        }, 1000);
      }
    }
  }, [callEvents]);

  const simulateAgentResponse = () => {
    setIsAgentSpeaking(true);
    
    const responses = [
      "Thank you for that information. I understand what you're looking for.",
      "That's a great question. Let me provide you with the details you need.",
      "I appreciate you sharing that with me. Here's what I recommend.",
      "Based on what you've told me, I think I can help you with that.",
      "Let me make sure I understand correctly before we proceed."
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate speaking duration based on response length
    const speakingDuration = Math.max(2000, response.length * 50);
    
    setTimeout(() => {
      setIsAgentSpeaking(false);
      
      const agentEvent: CallEvent = {
        id: `agent_${Date.now()}`,
        type: 'agent_spoke',
        content: response,
        timestamp: new Date(),
        duration: speakingDuration
      };
      
      setCallEvents(prev => [...prev, agentEvent]);
      onMessageSent();
    }, speakingDuration);
  };

  const handleStartRecording = () => {
    if (!sessionState.isActive) return;
    
    setIsRecording(true);
    setCurrentTranscript('');
    
    // Simulate real-time transcription
    const phrases = [
      "Hello, I'd like to",
      "Hello, I'd like to inquire about",
      "Hello, I'd like to inquire about your services",
      "Hello, I'd like to inquire about your services and pricing"
    ];
    
    phrases.forEach((phrase, index) => {
      setTimeout(() => {
        setCurrentTranscript(phrase);
      }, (index + 1) * 500);
    });
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    
    if (currentTranscript) {
      const userEvent: CallEvent = {
        id: `user_${Date.now()}`,
        type: 'user_spoke',
        content: currentTranscript,
        timestamp: new Date(),
        duration: 2000
      };
      
      setCallEvents(prev => [...prev, userEvent]);
      setCurrentTranscript('');
      onMessageSent();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventIcon = (type: CallEvent['type']) => {
    switch (type) {
      case 'user_spoke':
        return <Mic className="h-4 w-4 text-blue-500" />;
      case 'agent_spoke':
        return <Bot className="h-4 w-4 text-indigo-500" />;
      case 'action_triggered':
        return <Play className="h-4 w-4 text-green-500" />;
      default:
        return <Pause className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl flex flex-col h-[600px]">
      {/* Call Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              {agent.botIconImagePath ? (
                <img 
                  src={agent.botIconImagePath} 
                  alt={`${agent.name} Bot Icon`}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <Bot className="h-6 w-6 text-indigo-600" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-500">
                {sessionState.isActive ? (
                  isAgentSpeaking ? 'Speaking...' : 'Listening'
                ) : 'Ready to call'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {sessionState.isActive && (
              <>
                <div className={`w-3 h-3 rounded-full ${
                  isAgentSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-500">
                  {isAgentSpeaking ? 'Agent' : 'Waiting'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Call Visualization */}
      <div className="flex-1 flex flex-col">
        {/* Audio Visualization */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="text-center">
            <div className="relative">
              {/* Audio level visualization */}
              <div className="flex items-end justify-center gap-1 h-20 mb-4">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 bg-indigo-400 rounded-sm transition-all duration-100 ${
                      isRecording ? 'opacity-100' : 'opacity-30'
                    }`}
                    style={{ 
                      height: isRecording 
                        ? `${Math.max(10, (audioLevel + (i * 3)) % 60)}px`
                        : '10px'
                    }}
                  />
                ))}
              </div>
              
              {/* Current transcript */}
              {isRecording && currentTranscript && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-900 text-sm">"{currentTranscript}"</p>
                </div>
              )}
              
              {isAgentSpeaking && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-indigo-900 text-sm">Agent is responding...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call Events Log */}
        <div className="flex-1 overflow-y-auto p-4">
          {!sessionState.isActive && callEvents.length === 0 && (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Phone className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Ready to start call training</h4>
              <p className="text-gray-500 text-sm">Start a session to begin voice training with {agent.name}</p>
            </div>
          )}

          <div className="space-y-3">
            {callEvents.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  event.type === 'user_spoke' ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {event.type === 'user_spoke' ? 'You' : agent.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">"{event.content}"</p>
                  {event.duration && (
                    <span className="text-xs text-gray-500">
                      {(event.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            disabled={!sessionState.isActive}
            className={`p-3 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Record button */}
          <button
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onMouseLeave={handleStopRecording}
            disabled={!sessionState.isActive || isAgentSpeaking}
            className={`p-4 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 text-white shadow-lg scale-110'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          {/* Placeholder for future controls */}
          <button
            disabled={!sessionState.isActive}
            className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            {sessionState.isActive ? (
              isRecording ? 'Hold to speak' : 'Click and hold the microphone to speak'
            ) : (
              'Start a session to begin voice training'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}