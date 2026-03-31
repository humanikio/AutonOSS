'use client';

import { 
  Phone, 
  Calendar, 
  Clock, 
  Play, 
  Pause,
  Download,
  Filter,
  Search,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { callAnalyticsApi, CallLog, CallAnalyticsSummary } from '../../lib/api/callAnalytics';
import { callAgentsAPI } from '../../lib/api/callAgents';
import { CallAgent } from '@/types';
import AudioPlayer from '../../components/calls/AudioPlayer';

export default function Calls() {
  const [selectedCall, setSelectedCall] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [agents, setAgents] = useState<CallAgent[]>([]);
  const [summary, setSummary] = useState<CallAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [callLogsResponse, agentsResponse, summaryResponse] = await Promise.all([
        callAnalyticsApi.getCallLogs({ limit: 50 }),
        callAgentsAPI.getCallAgents(),
        callAnalyticsApi.getAnalyticsSummary()
      ]);
      
      setCallLogs(callLogsResponse.data || []);
      setAgents(agentsResponse || []);
      setSummary(summaryResponse.data || null);
      
      if (callLogsResponse.data && callLogsResponse.data.length > 0) {
        setSelectedCall(0);
      }
    } catch (error) {
      console.error('Error loading call analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const callDate = new Date(date);
    const diffHours = (now.getTime() - callDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return 'Today';
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return callDate.toLocaleDateString();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCallOutcome = (callLog: CallLog) => {
    if (callLog.analysis.callSuccessful === 'success') {
      return 'Call Successful';
    } else if (callLog.analysis.callSuccessful === 'failure') {
      return 'Call Failed';
    } else {
      return 'Unknown';
    }
  };

  const getCallType = (callLog: CallLog) => {
    // For now we'll default to 'incoming' since ElevenLabs doesn't specify direction
    // You can enhance this based on your specific use case
    return 'incoming';
  };

  const filteredCalls = callLogs.filter(call => {
    const matchesFilter = filter === 'all' || 
      (filter === 'completed' && call.status === 'completed') ||
      (filter === 'missed' && call.status !== 'completed');
    
    const matchesSearch = searchQuery === '' || 
      call.conversationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getAgentName(call.agentId).toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const selectedCallData = selectedCall !== null ? filteredCalls[selectedCall] : null;

  const getCallIcon = (type: string) => {
    switch(type) {
      case 'incoming': return <PhoneIncoming className="h-4 w-4" />;
      case 'outgoing': return <PhoneOutgoing className="h-4 w-4" />;
      case 'missed': return <PhoneMissed className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch(outcome) {
      case 'Appointment Booked': return 'bg-green-100 text-green-700';
      case 'Sale Completed': return 'bg-primary-100 text-primary-700';
      case 'Follow-up Required': return 'bg-yellow-100 text-yellow-700';
      case 'Missed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Call List */}
      <div className="w-96 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search calls..."
                className="input pl-10 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn-secondary px-3">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`flex-1 text-xs py-1 px-2 rounded ${
                filter === 'all' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Calls
            </button>
            <button 
              onClick={() => setFilter('completed')}
              className={`flex-1 text-xs py-1 px-2 rounded ${
                filter === 'completed' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Completed
            </button>
            <button 
              onClick={() => setFilter('missed')}
              className={`flex-1 text-xs py-1 px-2 rounded ${
                filter === 'missed' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Missed
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading calls...
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No calls found
            </div>
          ) : (
            filteredCalls.map((call, index) => {
              const callType = getCallType(call);
              const outcome = getCallOutcome(call);
              
              return (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(index)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedCall === index ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${
                        call.status !== 'completed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getCallIcon(callType)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{call.conversationId}</h3>
                        <p className="text-xs text-gray-500">{getAgentName(call.agentId)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatTime(call.startTime)}</p>
                      <p className="text-xs text-gray-400">{formatDate(call.startTime)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-600">{formatDuration(call.duration)}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${getOutcomeColor(outcome)}`}>
                      {outcome}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Call Details */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          {selectedCallData ? (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-gray-900">{selectedCallData.conversationId}</h2>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedCallData.startTime)} at {formatTime(selectedCallData.startTime)} • Duration: {formatDuration(selectedCallData.duration)}
                </p>
              </div>
              <button className="btn-secondary flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              Select a call to view details
            </div>
          )}
        </div>

        {/* Audio Player */}
        {selectedCallData && selectedCallData.audioUrl ? (
          <div className="p-4 border-b border-gray-200">
            <AudioPlayer
              audioUrl={selectedCallData.audioUrl}
              duration={selectedCallData.duration}
              conversationId={selectedCallData.conversationId}
            />
          </div>
        ) : selectedCallData ? (
          <div className="p-4 border-b border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              No audio recording available for this call
            </div>
          </div>
        ) : null}

        {/* Call Summary */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedCallData ? (
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="font-medium text-gray-900 mb-2">Call Summary</h3>
                <p className="text-sm text-gray-600">
                  {selectedCallData.analysis.transcriptSummary || 'No summary available for this call.'}
                </p>
              </div>

              {selectedCallData.transcript && selectedCallData.transcript.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Transcript</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedCallData.transcript.map((turn, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="text-xs text-gray-500 mt-0.5 min-w-[40px]">
                          {formatDuration(turn.timeInCallSecs)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${
                              turn.role === 'agent' ? 'text-primary-600' : 'text-green-600'
                            }`}>
                              {turn.role === 'agent' ? 'Agent' : 'Customer'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{turn.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-4">
                <h3 className="font-medium text-gray-900 mb-3">Call Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Call Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`font-medium ${
                        selectedCallData.analysis.callSuccessful === 'success' ? 'text-green-600' : 
                        selectedCallData.analysis.callSuccessful === 'failure' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {selectedCallData.analysis.callSuccessful === 'success' ? 'Successful' : 
                         selectedCallData.analysis.callSuccessful === 'failure' ? 'Failed' : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Agent</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-gray-900">{getAgentName(selectedCallData.agentId)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cost</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-gray-900">${(selectedCallData.cost / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Termination Reason</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-gray-900">{selectedCallData.metadata.terminationReason}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Select a call from the list to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}