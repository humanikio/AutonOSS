'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Eye, Clock, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AIPipelinePreviewModal from './AIPipelinePreviewModal';

interface AIAssistantProps {
  pipelines: any[];
  selectedPipeline?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  stagesGenerated?: boolean; // Flag to indicate if this message generated stages
}

interface RecentSession {
  id: string;
  title: string;
  lastInteraction: string;
  messageCount: number;
  stagesGenerated: boolean;
  pipelineName: string;
  preview: string;
}

export default function AIAssistant({ pipelines, selectedPipeline }: AIAssistantProps) {
  const { user, getToken } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch recent sessions on component mount (only when no active session)
  useEffect(() => {
    if (!sessionId && user) {
      fetchRecentSessions();
    }
  }, [user, sessionId]);

  const fetchRecentSessions = async () => {
    if (!user) return;

    setLoadingSessions(true);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai-assistant/sessions?limit=3`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentSessions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const continueSession = async (session: RecentSession) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai-assistant/sessions/${session.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const data = await response.json();
      const sessionData = data.data;

      console.log('🔄 Continuing session:', session.id);
      console.log('🔄 Session data:', sessionData);

      // Set session ID and load messages
      setSessionId(session.id);
      
      // Convert session messages to chat messages format
      const chatMessages: ChatMessage[] = sessionData.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        stagesGenerated: msg.role === 'assistant' && msg.content.includes('stages in your session')
      }));

      setMessages(chatMessages);
      setRecentSessions([]); // Clear recent sessions since we're now in a session

    } catch (error) {
      console.error('Error continuing session:', error);
      setError(error instanceof Error ? error.message : 'Failed to continue session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const userMessage: ChatMessage = {
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      };

      // Add user message to chat
      setMessages(prev => [...prev, userMessage]);

      // Determine endpoint based on whether we have an active session
      const endpoint = sessionId 
        ? `/api/ai-assistant/sessions/${sessionId}/message`
        : '/api/ai-assistant/sessions/start';

      const requestBody = sessionId 
        ? { message: prompt }
        : { 
            prompt, 
            pipelineId: selectedPipeline 
          };

      console.log('🤖 Sending request to:', endpoint);
      console.log('🤖 Request body:', requestBody);

      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🤖 AI response:', data);

      // If this was the first message, store the session ID
      if (!sessionId && data.data.sessionId) {
        setSessionId(data.data.sessionId);
      }

      // Get the AI response text and metadata
      const aiResponseText = sessionId 
        ? data.data.aiResponse.response 
        : data.data.initialAnalysis.aiResponse.response;

      // Check if stages were generated in this response
      const stagesGenerated = sessionId 
        ? data.data.aiResponse.toolsNeeded === false && aiResponseText.includes('stages in your session')
        : data.data.initialAnalysis.aiResponse.toolsNeeded === false && aiResponseText.includes('stages in your session');

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date().toISOString(),
        stagesGenerated
      };

      // Add assistant message to chat
      setMessages(prev => [...prev, assistantMessage]);
      
      // Clear input
      setPrompt('');

    } catch (error) {
      console.error('Error sending prompt:', error);
      setError(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setError(null);
    setPrompt('');
    setShowPreviewModal(false);
    // Refetch recent sessions when starting new session
    fetchRecentSessions();
  };

  const handleApplyStages = async (stages: any[]) => {
    if (!sessionId || !user) {
      console.error('Cannot apply stages: missing sessionId or user');
      return;
    }

    console.log('🎯 Applying stages:', stages);
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai-assistant/sessions/${sessionId}/publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🎯 Pipeline published successfully:', data);

      // Add a success message to the chat
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: `🎉 Great! ${data.data.message}

Your pipeline is now live and ready to use! You can find it in the Opportunities section where you can:
- Add new opportunities to any stage
- Move opportunities between stages
- Track your sales progress

${data.data.isNewPipeline ? 'This is a brand new pipeline created from your AI session.' : `This pipeline now has ${data.data.totalStages} total stages.`}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, successMessage]);
      setShowPreviewModal(false);

    } catch (error) {
      console.error('Error applying stages:', error);
      setError(error instanceof Error ? error.message : 'Failed to apply stages to pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col shadow-sm">
      {sessionId && (
        <div className="flex justify-end p-4 border-b border-gray-200">
          <button
            onClick={startNewSession}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            New Session
          </button>
        </div>
      )}


      {!sessionId ? (
        /* Welcome Screen - Fixed height to prevent overflow */
        <div className="flex-1 flex flex-col justify-center min-h-0 px-12 py-4 -mt-8">
          <div className="w-full text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-4xl font-semibold text-gray-900 mb-4">Create Pipelines with AI</h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Describe your business process and let our AI help you create the perfect sales pipeline with optimized stages. 
                Whether you're in real estate, SaaS, consulting, or any other industry, I'll help you map out your customer journey.
              </p>
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="mb-4 mx-auto max-w-2xl px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {/* Input Area - ChatGPT Style */}
            <div className="relative mx-auto">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="I run a real estate agency and need a pipeline for leads from inquiry to closing"
                rows={4}
                className="w-full resize-none bg-white border border-gray-300 rounded-2xl px-6 py-5 pr-16 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSendPrompt}
                disabled={!prompt.trim() || isLoading}
                className="absolute right-4 bottom-4 w-12 h-12 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
            </div>
            
            {selectedPipeline && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Using pipeline: {pipelines.find(p => p.id === selectedPipeline)?.name || 'Selected Pipeline'}
              </p>
            )}

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className="mt-6 max-w-4xl mx-auto">
                <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Continue Recent Session</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => continueSession(session)}
                      disabled={isLoading}
                      className="text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-1 mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate flex-1">{session.title}</h4>
                        {session.stagesGenerated && (
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{session.messageCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(session.lastInteraction).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="text-xs text-primary-600 truncate">{session.pipelineName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingSessions && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading recent sessions...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Chat Interface Layout - Messages with input at bottom */
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.role === 'user' ? '' : 'space-y-3'}`}>
                  <div className={`rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-primary-200' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {/* Preview Stages Button */}
                  {message.role === 'assistant' && message.stagesGenerated && sessionId && (
                    <div className="flex justify-start">
                      <button
                        onClick={() => setShowPreviewModal(true)}
                        className="px-4 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        Preview Generated Stages
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Input Area for Chat */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Continue your conversation..."
                rows={3}
                className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendPrompt}
                disabled={!prompt.trim() || isLoading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isLoading ? 'Processing...' : 'Send'}
                </span>
              </button>
            </div>
            
            {selectedPipeline && (
              <p className="text-xs text-gray-500 mt-2">
                Using pipeline: {pipelines.find(p => p.id === selectedPipeline)?.name || 'Selected Pipeline'}
              </p>
            )}
          </div>
        </>
      )}

      {/* AI Pipeline Preview Modal */}
      {sessionId && (
        <AIPipelinePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          sessionId={sessionId}
          onApplyStages={handleApplyStages}
          isApplying={isLoading}
        />
      )}
    </div>
  );
}