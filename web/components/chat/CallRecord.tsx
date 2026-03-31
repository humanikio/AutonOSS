'use client';

import { Phone, Play, Pause, Clock, User, FileText, Info, Bot } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface CallRecordProps {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  phoneNumber: string;
  duration?: number; // in seconds
  status: string;
  callSummaryTitle?: string;
  transcriptSummary?: string;
  audioUrl?: string;
  timestamp: Date;
  time: string;
  contactInitials: string;
  avatarColor: string;
  agentName?: string;
  agentId?: string;
  agents?: Record<string, any>; // Agents data for avatar and name
  transcript?: any[];
  analysis?: any;
}

export default function CallRecord({
  id,
  conversationId,
  direction,
  phoneNumber,
  duration,
  status,
  callSummaryTitle,
  transcriptSummary,
  audioUrl,
  timestamp,
  time,
  contactInitials,
  avatarColor,
  agentName,
  agentId,
  agents,
  transcript,
  analysis
}: CallRecordProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'Unknown duration';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Initialize audio element
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      const audio = audioRef.current;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setTotalDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.addEventListener('error', () => {
        setIsPlaying(false);
        console.error('Error loading audio');
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Render avatar for call - agent avatar if from agent, otherwise contact avatar
  const renderCallAvatar = () => {
    if (agentId && agents && agents[agentId]) {
      const agent = agents[agentId];
      // Use agent's avatar if available
      if (agent.botIconImagePath) {
        return (
          <img 
            src={agent.botIconImagePath} 
            alt={`${agent.name} Avatar`}
            className="w-8 h-8 rounded-full object-cover"
          />
        );
      } else {
        // Fallback to bot icon for agents
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <Bot className="h-5 w-5 text-indigo-600" />
          </div>
        );
      }
    } else {
      // Regular contact avatar
      return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
          direction === 'outbound' ? 'bg-green-600' : avatarColor
        }`}>
          {direction === 'outbound' ? 'Y' : contactInitials}
        </div>
      );
    }
  };

  const getCallIcon = () => {
    if (direction === 'outbound') {
      return <Phone className="h-4 w-4 text-green-600 rotate-12" />;
    } else {
      return <Phone className="h-4 w-4 text-blue-600 -rotate-12" />;
    }
  };

  const getCallStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'transcribed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'missed':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="mb-4">
      <div className={`flex items-start gap-3 ${direction === 'outbound' ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {renderCallAvatar()}

        <div className={`flex-1 ${direction === 'outbound' ? 'text-right' : ''}`}>
          {/* Agent badge for agent calls */}
          {agentId && agents && agents[agentId] && (
            <div className={`flex items-center gap-1 text-xs text-indigo-600 font-medium mb-1 ${
              direction === 'outbound' ? 'flex-row-reverse' : ''
            }`}>
              <Bot className="h-3 w-3 text-indigo-600" />
              <span>{agents[agentId].name}</span>
            </div>
          )}

          {/* Call Card */}
          <div className={`inline-block p-4 rounded-lg border-2 max-w-md ${
            agentId && agents && agents[agentId]
              ? 'bg-indigo-50 border-indigo-200' // Special styling for agent calls
              : direction === 'outbound' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
          }`}>
            {/* Call Header */}
            <div className="flex items-center gap-2 mb-2">
              {getCallIcon()}
              <span className="font-medium text-gray-900">
                {direction === 'outbound' ? 'Outbound Call' : 'Incoming Call'}
              </span>
              <span className={`text-xs font-medium ${getCallStatusColor()}`}>
                {status}
              </span>
            </div>

            {/* Call Details */}
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <span>{phoneNumber}</span>
              </div>
              
              {duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(duration)}</span>
                </div>
              )}

              {/* Call Summary */}
              {callSummaryTitle && (
                <div className="mt-2 p-2 bg-white/60 rounded border">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setSummaryExpanded(!summaryExpanded)}
                  >
                    <h4 className="font-medium text-gray-900 text-sm">
                      {callSummaryTitle}
                    </h4>
                    <svg 
                      className={`w-4 h-4 text-gray-500 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {summaryExpanded && transcriptSummary && (
                    <p className="text-xs text-gray-600 mt-2">
                      {transcriptSummary}
                    </p>
                  )}
                </div>
              )}

              {/* Enhanced Audio Player */}
              {audioUrl && (
                <div className="mt-3 p-3 bg-white/80 rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={handlePlayPause}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-gray-700" />
                      ) : (
                        <Play className="h-4 w-4 text-gray-700 ml-0.5" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={totalDuration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: totalDuration ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / totalDuration) * 100}%, #e5e7eb ${(currentTime / totalDuration) * 100}%, #e5e7eb 100%)` : '#e5e7eb'
                        }}
                      />
                    </div>
                    
                    <span className="text-xs text-gray-600 font-mono min-w-fit">
                      {formatTime(currentTime)} / {formatTime(totalDuration)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-2 flex gap-2">
                {transcript && transcript.length > 0 && (
                  <button
                    onClick={() => setShowTranscript(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    Transcript
                  </button>
                )}
                
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  <Info className="h-3 w-3" />
                  Details
                </button>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <p className={`text-xs text-gray-500 mt-1 ${direction === 'outbound' ? 'text-right' : ''}`}>
            {time}
          </p>
        </div>
      </div>

      {/* Transcript Modal */}
      {showTranscript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTranscript(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Call Transcript</h3>
                <button 
                  onClick={() => setShowTranscript(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {direction === 'outbound' ? 'Outbound' : 'Inbound'} call • {phoneNumber} • {formatDuration(duration)}
              </p>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              {transcript && transcript.length > 0 ? (
                <div className="space-y-3">
                  {transcript.map((entry: any, index: number) => {
                    const isAgent = entry.role === 'agent';
                    const isUser = entry.role === 'user';
                    
                    return (
                      <div key={index} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isAgent 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isAgent ? 'A' : 'U'}
                        </div>
                        <div className={`flex-1 ${isAgent ? 'text-right' : ''}`}>
                          <div className={`inline-block p-3 rounded-lg text-sm max-w-[80%] ${
                            isAgent 
                              ? 'bg-green-50 text-green-900' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {entry.message || entry.text || entry.content}
                          </div>
                          {entry.time_in_call_secs && (
                            <p className={`text-xs text-gray-500 mt-1 ${isAgent ? 'text-right' : ''}`}>
                              {formatTime(entry.time_in_call_secs)}
                            </p>
                          )}
                          {entry.interrupted && (
                            <p className={`text-xs text-orange-500 mt-1 ${isAgent ? 'text-right' : ''}`}>
                              (interrupted)
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No transcript available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Call Details</h3>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-96">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Direction</label>
                  <p className="text-gray-900 capitalize">{direction}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Status</label>
                  <p className={`capitalize ${getCallStatusColor()}`}>{status}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Phone Number</label>
                  <p className="text-gray-900">{phoneNumber}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Duration</label>
                  <p className="text-gray-900">{formatDuration(duration)}</p>
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-gray-700">Call Time</label>
                  <p className="text-gray-900">{timestamp.toLocaleString()}</p>
                </div>
                {(agentId && agents && agents[agentId]) || agentName ? (
                  <div className="col-span-2">
                    <label className="font-medium text-gray-700">Agent</label>
                    <p className="text-gray-900">
                      {agentId && agents && agents[agentId] ? agents[agentId].name : agentName}
                    </p>
                  </div>
                ) : null}
              </div>

              {analysis && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Analysis</h4>
                  <div className="space-y-2 text-sm">
                    {analysis.call_successful && (
                      <div>
                        <label className="font-medium text-gray-600">Call Success</label>
                        <p className="text-gray-900 break-words">{analysis.call_successful}</p>
                      </div>
                    )}
                    {callSummaryTitle && (
                      <div>
                        <label className="font-medium text-gray-600">Summary</label>
                        <p className="text-gray-900 break-words">{callSummaryTitle}</p>
                      </div>
                    )}
                    {transcriptSummary && (
                      <div>
                        <label className="font-medium text-gray-600">Transcript Summary</label>
                        <p className="text-gray-900 break-words">{transcriptSummary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {audioUrl && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Recording</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlaying ? 'Pause' : 'Play'} Recording
                    </button>
                    <a
                      href={audioUrl}
                      download
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}