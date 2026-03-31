'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Bot,
  Phone,
  MessageSquare,
  Activity,
  Terminal,
  Zap,
  X,
  Loader2,
  Upload
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useConversation } from '@elevenlabs/react';
import TrainingChat from './components/TrainingChat';
import AnalysisCycles from './components/AnalysisCycles';
import TestAgentConfig from './components/TestAgentConfig';
import ActionSelector from './components/ActionSelector';
import PublishTrainingConfigsModal from './components/PublishTrainingConfigsModal';
import { showNotification } from '@/components/Notification';

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  botIconImagePath?: string;
}



export default function TrainingSession() {
  const params = useParams();
  const router = useRouter();
  const { user, tenant, getToken } = useAuth();
  
  // Extract agentId and sessionId from nested route params
  const agentId = params.agentId as string;
  const sessionId = params.sessionId as string;

  // State management
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentMode, setCurrentMode] = useState<'chat' | 'call'>('chat');
  const [activeTab, setActiveTab] = useState<'analysis' | 'config' | 'actions'>('analysis');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetSessionData, setWidgetSessionData] = useState<{sessionId: string, agentId: string, elevenLabsAgentId: string, systemPrompt: string} | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'agent', content: string, timestamp: Date}>>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load agent data
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !agentId) {
      setLoading(false);
      return;
    }

    const agentRef = doc(db, 'tenants', tenant?.id, 'agents', agentId);
    const unsubscribe = onSnapshot(agentRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setAgent({
            id: doc.id,
            name: data.name || 'Unnamed Agent',
            status: data.status || 'draft',
            description: data.description || 'New agent ready for configuration',
            botIconImagePath: data.botIconImagePath,
          });
        } else {
          setAgent(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching agent:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, tenant?.id, agentId]);

  // Auto-start session
  useEffect(() => {
    setIsSessionActive(true);
  }, []);

  // Initialize ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setConversationStatus('connected');
      setIsCallMinimized(true); // Auto-minimize when call starts
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setConversationStatus('idle');
      setMessages([]);
      setIsCallMinimized(false); // Reset minimized state when call ends
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      const sourceStr = String(message.source);
      if (sourceStr === 'agent' || sourceStr === 'assistant') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'agent',
          content: message.message || '',
          timestamp: new Date()
        }]);
      } else if (sourceStr === 'user') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'user',
          content: message.message || '',
          timestamp: new Date()
        }]);
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setConversationStatus('error');
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // Toggle between chat and call mode
  const toggleMode = useCallback(async () => {
    // If there's an active call, clicking the button should end the call
    if (widgetSessionData && conversationStatus === 'connected') {
      try {
        await conversation.endSession();
        setConversationStatus('idle');
        setWidgetSessionData(null);
        setIsCallMinimized(false);
        setCurrentMode('chat');
      } catch (error) {
        console.error('Error ending conversation:', error);
        // Fallback: force reset the state
        setWidgetSessionData(null);
        setConversationStatus('idle');
        setIsCallMinimized(false);
        setCurrentMode('chat');
      }
      return;
    }
    
    // Otherwise, toggle mode as before
    const newMode = currentMode === 'chat' ? 'call' : 'chat';
    setCurrentMode(newMode);
    
    // If switching to call mode, show widget modal
    if (newMode === 'call') {
      setShowWidgetModal(true);
    }
  }, [currentMode, widgetSessionData, conversationStatus, conversation]);

  // Handle action selection
  const handleActionSelect = useCallback((actionId: string | null) => {
    setSelectedActionId(actionId);
    console.log('Action selected for training:', actionId);
  }, []);

  // Initiate widget conversation
  const initiateWidgetConversation = useCallback(async () => {
    if (!agentId || !sessionId) return;
    
    setWidgetLoading(true);
    try {
      const token = await getToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiBaseUrl}/api/agent-training/start-widget-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          sessionId
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setShowWidgetModal(false);
        const { sessionId: widgetSessionId, agentId, elevenLabsAgentId, systemPrompt } = result.data;
        setWidgetSessionData({ sessionId: widgetSessionId, agentId, elevenLabsAgentId, systemPrompt });
        console.log('Widget conversation started:', { widgetSessionId, agentId, elevenLabsAgentId });
        console.log('System prompt from training session:', systemPrompt);
        
        setConversationStatus('idle');
      } else {
        throw new Error(result.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      showNotification({
        type: 'error',
        title: 'Failed to start conversation',
        message: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setWidgetLoading(false);
    }
  }, [agentId, sessionId, getToken]);


  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-gray-600">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Agent not found</h3>
          <button
            onClick={() => router.push('/training/agent')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Training
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/training/agent/trainingCenter/${agentId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                {agent.botIconImagePath ? (
                  <img 
                    src={agent.botIconImagePath} 
                    alt={`${agent.name} Bot Icon`}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <Bot className="h-5 w-5 text-primary-600" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">Training with {agent.name}</h1>
                <p className="text-sm text-gray-500">Session {sessionId.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPublishModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <Upload className="h-4 w-4" />
              Publish Configuration
            </button>
            
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">Live Session</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Chat Interface - 1/3 of viewport */}
        <TrainingChat
          agentId={agentId}
          sessionId={sessionId}
          currentMode={currentMode}
          isSessionActive={isSessionActive}
          selectedActionId={selectedActionId}
          onModeToggle={toggleMode}
          onMessagesUpdate={() => {}} // No longer needed since we show AI cycles only
        />

        {/* Right Panel - 2/3 of viewport */}
        <div className="flex-1 bg-white border-l border-gray-200 text-gray-800 font-mono flex flex-col relative h-full min-h-0">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'analysis'
                    ? 'border-indigo-500 text-indigo-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Terminal className="h-4 w-4" />
                AI Analysis Cycles
                <div className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                  Auto-Generated
                </div>
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'config'
                    ? 'border-indigo-500 text-indigo-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity className="h-4 w-4" />
                Test Agent Config
                <div className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                  Live Edit
                </div>
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'actions'
                    ? 'border-indigo-500 text-indigo-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Zap className="h-4 w-4" />
                Select Action
                <div className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                  Test Context
                </div>
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'analysis' ? (
              <AnalysisCycles
                tenantId={tenant?.id || ''}
                sessionId={sessionId}
                agentId={agentId}
              />
            ) : activeTab === 'config' ? (
              <TestAgentConfig
                tenantId={tenant?.id || ''}
                sessionId={sessionId}
                agentId={agentId}
              />
            ) : (
              <div className="h-full">
                <ActionSelector
                  agentId={agentId}
                  selectedActionId={selectedActionId}
                  onActionSelect={handleActionSelect}
                />
              </div>
            )}
          </div>

          {/* Floating Phone Toggle - positioned in bottom right corner */}
          <button
            onClick={toggleMode}
            className={`fixed bottom-8 right-8 p-4 rounded-full shadow-lg transition-all z-50 ${
              widgetSessionData && conversationStatus === 'connected'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
            title={
              widgetSessionData && conversationStatus === 'connected' 
                ? 'Switch to Chat Training' 
                : 'Start Voice Training'
            }
          >
            {widgetSessionData && conversationStatus === 'connected' ? (
              <MessageSquare className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Widget Conversation Modal */}
      {showWidgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Test Your Training Agent</h3>
              <button
                onClick={() => setShowWidgetModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Start a voice conversation with your training agent directly in your browser. This will use the configuration from your current training session.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWidgetModal(false);
                  setCurrentMode('chat');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                disabled={widgetLoading}
              >
                Cancel
              </button>
              <button
                onClick={initiateWidgetConversation}
                disabled={widgetLoading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {widgetLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Start Voice Conversation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ElevenLabs Widget - Full Modal or Minimized */}
      {widgetSessionData && (
        <>
          {!isCallMinimized ? (
            /* Full Modal View */
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl mx-4 h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Training Agent Voice Conversation</h3>
                    <p className="text-sm text-gray-600 mt-1">Testing with session configuration</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {conversationStatus === 'connected' && (
                      <>
                        <button
                          onClick={() => setIsCallMinimized(true)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Minimize
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await conversation.endSession();
                              setConversationStatus('idle');
                              setWidgetSessionData(null);
                              setIsCallMinimized(false);
                            } catch (error) {
                              console.error('Error ending conversation:', error);
                            }
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
                        >
                          End Chat
                        </button>
                      </>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          if (conversationStatus === 'connected') {
                            await conversation.endSession();
                          }
                          setWidgetSessionData(null);
                          setConversationStatus('idle');
                          setCurrentMode('chat');
                          setIsCallMinimized(false);
                        } catch (error) {
                          console.error('Error ending conversation:', error);
                          setWidgetSessionData(null);
                          setConversationStatus('idle');
                          setCurrentMode('chat');
                          setIsCallMinimized(false);
                        }
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                {/* Voice Visualization Area */}
                {conversationStatus === 'connected' && (
                  <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 p-8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative mb-4">
                        <div className="w-20 h-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                          <Bot className="h-10 w-10 text-white" />
                        </div>
                        {conversation.isSpeaking && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-center h-12">
                        <div className="flex items-center gap-1.5">
                          {[0, 100, 200, 300, 400, 500, 600].map((delay, i) => (
                            <div 
                              key={i}
                              className={`w-1 rounded-full transition-all duration-300 ${
                                conversation.isSpeaking ? 'bg-indigo-500 voice-bar' : 'bg-gray-300'
                              }`} 
                              style={{
                                height: conversation.isSpeaking ? `${24 + Math.sin(i) * 16}px` : '8px', 
                                animationDelay: conversation.isSpeaking ? `${delay}ms` : '0'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-2">
                        {conversation.isSpeaking ? 'Speaking...' : 'Listening...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {conversationStatus !== 'connected' ? (
                    <div className="flex-1 p-6 flex flex-col items-center justify-center">
                      <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                          <Bot className="h-12 w-12 text-white" />
                        </div>
                        {conversationStatus === 'connecting' && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>
                        )}
                      </div>
                      
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        {conversationStatus === 'idle' && "Ready to start training conversation"}
                        {conversationStatus === 'connecting' && "Connecting to training agent..."}
                        {conversationStatus === 'error' && "Connection error"}
                      </h4>
                      
                      <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                        {conversationStatus === 'idle' && "Click the button below to start a voice conversation with your training agent"}
                        {conversationStatus === 'error' && "Failed to connect. Please check your microphone permissions and try again."}
                      </p>
                      
                      <button
                        onClick={async () => {
                          if (widgetSessionData) {
                            try {
                              setConversationStatus('connecting');
                              await navigator.mediaDevices.getUserMedia({ audio: true });
                              
                              const sessionId = await conversation.startSession({
                                agentId: widgetSessionData.elevenLabsAgentId,
                                connectionType: 'websocket' as const,
                                overrides: {
                                  agent: {
                                    prompt: {
                                      prompt: widgetSessionData.systemPrompt
                                    },
                                    firstMessage: "Hello! I'm ready to help you practice and improve. What would you like to work on today?"
                                  }
                                }
                              });
                              
                              console.log('🎉 Training conversation started with session ID:', sessionId);
                            } catch (error) {
                              console.error('Failed to start conversation session:', error);
                              setConversationStatus('error');
                            }
                          }
                        }}
                        disabled={conversationStatus === 'connecting'}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {conversationStatus === 'connecting' ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Phone className="h-5 w-5" />
                            Start Training Conversation
                          </>
                        )}
                      </button>
                      
                      <div className="mt-8 text-xs text-gray-500 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <span>Session: {widgetSessionData.sessionId.slice(0, 8)}...</span>
                          <span className="text-gray-300">•</span>
                          <span>Training Mode Active</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <MessageSquare className="h-12 w-12 mb-3 text-gray-400" />
                          <p className="text-sm">Start speaking to begin the training session</p>
                        </div>
                      ) : (
                        messages.map(message => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                message.role === 'user'
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      
                      {conversation.isSpeaking && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-2">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Minimized View - Bottom Right Corner */
            <div className="fixed bottom-6 right-6 z-50">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 max-h-96 overflow-hidden flex flex-col">
                {/* Minimized Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      {conversation.isSpeaking && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">Training Call</h4>
                      <p className="text-xs text-gray-500">
                        {conversation.isSpeaking ? 'Speaking...' : 'Listening...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsCallMinimized(false)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Expand"
                    >
                      <Activity className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await conversation.endSession();
                          setConversationStatus('idle');
                          setWidgetSessionData(null);
                          setIsCallMinimized(false);
                        } catch (error) {
                          console.error('Error ending conversation:', error);
                        }
                      }}
                      className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                      title="End call"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
                
                {/* Compact Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-72">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                      <MessageSquare className="h-6 w-6 mb-2" />
                      <p className="text-xs">No messages yet</p>
                    </div>
                  ) : (
                    messages.slice(-5).map(message => ( // Show only last 5 messages
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-1.5 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-xs">{message.content}</p>
                          <p className={`text-xs mt-0.5 opacity-70 ${message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {conversation.isSpeaking && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 rounded-xl px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></div>
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Voice Indicator */}
                <div className="p-2 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-1">
                      {[0, 100, 200, 300, 400].map((delay, i) => (
                        <div 
                          key={i}
                          className={`w-0.5 rounded-full transition-all duration-300 ${
                            conversation.isSpeaking ? 'bg-indigo-500 voice-bar' : 'bg-gray-300'
                          }`} 
                          style={{
                            height: conversation.isSpeaking ? `${12 + Math.sin(i) * 8}px` : '4px', 
                            animationDelay: conversation.isSpeaking ? `${delay}ms` : '0'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Publish Training Configs Modal */}
      <PublishTrainingConfigsModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        agentId={agentId}
        sessionId={sessionId}
        agentName={agent?.name || 'Unknown Agent'}
      />

      {/* CSS animations */}
      <style jsx>{`
        @keyframes voice-wave {
          0%, 100% {
            transform: scaleY(0.5);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        .voice-bar {
          animation: voice-wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}