'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageSquare, 
  Send, 
  Plus,
  ChevronDown,
  Loader2,
  Edit3,
  Save,
  X,
  RotateCcw,
  Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ActionDraftUpdate {
  proposedPrompt: string;
  understanding: {
    summary: string;
    behavior: string;
    tone: string;
    keyPoints: string[];
    confidence: number;
  };
  clarifyingQuestion?: string;
  suggestions?: string[];
}

interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
  isActive: boolean;
}

interface ActionMemoryChatProps {
  agentId: string;
  actionId: string;
  onPromptUpdate?: (prompt: string) => void;
  className?: string;
}

interface SessionData extends ChatSession {
  actualActionId?: string;
}

export default function ActionMemoryChat({ 
  agentId, 
  actionId, 
  onPromptUpdate,
  className 
}: ActionMemoryChatProps) {
  // State management
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  
  // Track the actual action ID (which might be different from props for "new" actions)
  const [actualActionId, setActualActionId] = useState<string>(actionId);
  
  // Understanding area state
  const [currentDraft, setCurrentDraft] = useState<ActionDraftUpdate | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  
  // Mode state
  const [inputMode, setInputMode] = useState<'chat' | 'direct'>('chat');
  const [directPromptText, setDirectPromptText] = useState('');
  
  // Publishing modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current session on mount
  useEffect(() => {
    loadCurrentSession(true); // Use original actionId on first load
    loadAllSessions();
  }, [agentId, actionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for publish trigger from main page
  useEffect(() => {
    const handlePublishTrigger = () => {
      if (currentDraft && currentDraft.proposedPrompt) {
        setShowPublishModal(true);
      }
    };

    window.addEventListener('triggerPublish', handlePublishTrigger);
    return () => {
      window.removeEventListener('triggerPublish', handlePublishTrigger);
    };
  }, [currentDraft]);

  // Load current active session
  const loadCurrentSession = async (useOriginalActionId: boolean = false) => {
    setIsLoading(true);
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();
      const actionIdToUse = useOriginalActionId ? actionId : actualActionId;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actionIdToUse}/chat/current?agentId=${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setCurrentSession(result.data);
        setMessages(result.data.messages || []);
        
        // Update actual action ID if provided
        if (result.data.actualActionId) {
          setActualActionId(result.data.actualActionId);
        }

        // Load understanding from session if available
        if (result.data.currentUnderstanding) {
          const draft = {
            proposedPrompt: result.data.currentUnderstanding.proposedPrompt || '',
            understanding: result.data.currentUnderstanding.understanding || {
              summary: '',
              behavior: '',
              tone: '',
              keyPoints: [],
              confidence: 0
            },
            clarifyingQuestion: result.data.currentUnderstanding.clarifyingQuestion,
            suggestions: result.data.currentUnderstanding.suggestions
          };
          setCurrentDraft(draft);
          
          // Pre-fill direct prompt field with current proposed prompt
          setDirectPromptText(draft.proposedPrompt);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load all sessions for dropdown
  const loadAllSessions = async () => {
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/chat/sessions?agentId=${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setAllSessions(result.data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Send direct prompt for analysis
  const sendDirectPrompt = async () => {
    if (!directPromptText.trim() || isSending) return;

    const userDirectPrompt = directPromptText;
    const promptToSend = `Please analyze this direct action prompt and provide feedback:

DIRECT PROMPT:
${userDirectPrompt}

Please use the actionDraftUpdate tool to provide your analysis and feedback on this prompt.`;

    setIsSending(true);

    // Add user message showing they submitted a direct prompt (clean display)
    const newUserMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userDirectPrompt,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) throw new Error('Not authenticated');

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: promptToSend,
          agentId,
          sessionId: currentSession?.sessionId
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update actual action ID if provided
        if (result.data.actualActionId) {
          setActualActionId(result.data.actualActionId);
        }

        // Update draft if provided
        if (result.data.draftUpdate) {
          setCurrentDraft(result.data.draftUpdate);
        }

        // Reload the current session to get all messages
        await loadCurrentSession();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending direct prompt:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your direct prompt. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setIsSending(true);

    // Add user message immediately
    const newUserMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) throw new Error('Not authenticated');

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          agentId,
          sessionId: currentSession?.sessionId
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update actual action ID if provided
        if (result.data.actualActionId) {
          setActualActionId(result.data.actualActionId);
        }

        // Update draft if provided
        if (result.data.draftUpdate) {
          setCurrentDraft(result.data.draftUpdate);
        }

        // Reload the current session to get all messages
        await loadCurrentSession();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // Create new session
  const createNewSession = async () => {
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/chat/sessions/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId })
      });

      const result = await response.json();
      if (result.success) {
        setCurrentSession(result.data);
        setMessages([]);
        loadAllSessions();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Switch to different session
  const switchSession = async (sessionId: string) => {
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/chat/sessions/${sessionId}/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId })
      });

      const result = await response.json();
      if (result.success) {
        setCurrentSession(result.data);
        setMessages(result.data.messages || []);
        setShowSessionDropdown(false);
      }
    } catch (error) {
      console.error('Error switching session:', error);
    }
  };

  // Save prompt update (saves to session understanding)
  const savePromptUpdate = async () => {
    if (!editedPrompt.trim() || !currentSession?.sessionId) return;

    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) return;

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/prompt/update-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId,
          prompt: editedPrompt,
          sessionId: currentSession.sessionId
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update local state
        if (currentDraft) {
          const updatedDraft = {
            ...currentDraft,
            proposedPrompt: editedPrompt
          };
          setCurrentDraft(updatedDraft);
          
          // Also update direct prompt field
          setDirectPromptText(editedPrompt);
        }

        setIsEditingPrompt(false);
        onPromptUpdate?.(editedPrompt);
        
        console.log('✅ Session prompt updated successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt. Please try again.');
    }
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputMode === 'chat') {
        sendMessage();
      } else {
        // Handle direct prompt mode
        sendMessage();
      }
    }
  };

  // Publish action function
  const publishAction = async () => {
    if (!currentDraft || !currentSession?.sessionId) return;

    setIsPublishing(true);
    try {
      const authUser = (await import('firebase/auth')).getAuth().currentUser;
      if (!authUser) throw new Error('Not authenticated');

      const token = await authUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent-training/actions/${actualActionId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId,
          sessionId: currentSession.sessionId,
          prompt: currentDraft.proposedPrompt,
          understanding: currentDraft.understanding
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowPublishModal(false);
        console.log('✅ Action published successfully');
        // Optionally redirect or show success message
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error publishing action:', error);
      alert('Failed to publish action. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Side - Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-gray-200">
        {/* Chat Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">Action Creation Chat</h3>
                <p className="text-xs text-gray-500">AI-powered prompt generation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setInputMode('chat')}
                  className={`px-3 py-1 text-xs rounded ${
                    inputMode === 'chat' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => {
                    setInputMode('direct');
                    // Pre-fill direct prompt with current proposed prompt
                    if (currentDraft?.proposedPrompt) {
                      setDirectPromptText(currentDraft.proposedPrompt);
                    }
                  }}
                  className={`px-3 py-1 text-xs rounded ${
                    inputMode === 'direct' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Direct
                </button>
              </div>


              {/* Session Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  className="flex items-center gap-2 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <span>Sessions ({allSessions.length})</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {showSessionDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="p-2 border-b border-gray-200">
                      <button
                        onClick={createNewSession}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                      >
                        <Plus className="h-4 w-4" />
                        New Session
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {allSessions.map(session => (
                        <button
                          key={session.sessionId}
                          onClick={() => switchSession(session.sessionId)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            session.isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{session.messageCount} messages</span>
                            <span className="text-xs text-gray-500">
                              {new Date(session.lastMessageAt).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading conversation...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Start a conversation to create your action</p>
              <p className="text-sm text-gray-400">
                Describe what you want your agent to do, and I'll help create the perfect prompt.
              </p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          {inputMode === 'chat' ? (
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe what you want your agent to do..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={isSending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className={`absolute right-2 top-2 p-2 rounded-md transition-colors ${
                    !inputMessage.trim() || isSending
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Direct Prompt Input
              </label>
              <textarea
                value={directPromptText}
                onChange={(e) => setDirectPromptText(e.target.value)}
                placeholder="Enter your action prompt directly..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={8}
              />
              <button
                onClick={sendDirectPrompt}
                disabled={!directPromptText.trim() || isSending}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  !directPromptText.trim() || isSending
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isSending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Prompt...
                  </div>
                ) : (
                  'Send Direct Prompt'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Understanding Area */}
      <div className="w-1/2 flex flex-col bg-gray-50">
        {/* Understanding Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Action Understanding</h3>
              <p className="text-xs text-gray-500">Review and edit the proposed action</p>
            </div>
            
            <div className="flex items-center gap-3">
              {currentDraft && (
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    (currentDraft.understanding.confidence || 0) >= 80 ? 'bg-green-500' :
                    (currentDraft.understanding.confidence || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-gray-600">
                    {currentDraft.understanding.confidence || 0}% confidence
                  </span>
                </div>
              )}
              
            </div>
          </div>
        </div>

        {/* Understanding Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentDraft ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                <p className="text-gray-700">{currentDraft.understanding.summary || 'No summary available'}</p>
              </div>

              {/* Behavior */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Expected Behavior</h4>
                <p className="text-gray-700">{currentDraft.understanding.behavior || 'No behavior description available'}</p>
              </div>

              {/* Tone */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Tone & Style</h4>
                <p className="text-gray-700">{currentDraft.understanding.tone || 'No tone specified'}</p>
              </div>

              {/* Key Points */}
              {currentDraft.understanding.keyPoints && currentDraft.understanding.keyPoints.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Key Points</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {currentDraft.understanding.keyPoints.map((point, index) => (
                      <li key={index} className="text-gray-700">{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proposed Prompt */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Draft Prompt</h4>
                    <p className="text-xs text-gray-500">Working version • Not yet published</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingPrompt(!isEditingPrompt);
                      setEditedPrompt(currentDraft.proposedPrompt);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditingPrompt ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {isEditingPrompt ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={10}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={savePromptUpdate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditingPrompt(false)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-3 font-mono text-sm whitespace-pre-wrap border">
                    {currentDraft.proposedPrompt}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {currentDraft.suggestions && currentDraft.suggestions.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="font-medium text-amber-900 mb-2">Suggestions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {currentDraft.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-amber-800">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clarifying Question */}
              {currentDraft.clarifyingQuestion && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Need More Information</h4>
                  <p className="text-blue-800">{currentDraft.clarifyingQuestion}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">No action draft yet</p>
                <p className="text-sm text-gray-400">
                  Start chatting to generate your action understanding
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Review Modal */}
      {showPublishModal && currentDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50"
            onClick={() => setShowPublishModal(false)}
          />

          {/* Modal panel */}
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white shadow-2xl rounded-2xl flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Review & Publish Action</h3>
                <p className="text-sm text-gray-500">Review all details before publishing your action</p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Action Prompt - Featured First */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-blue-900">Action Prompt</h4>
                    <button
                      onClick={() => {
                        setEditedPrompt(currentDraft.proposedPrompt);
                        setIsEditingPrompt(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded-md"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                  
                  {isEditingPrompt ? (
                    <div className="space-y-4">
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="w-full p-4 border border-blue-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={12}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setCurrentDraft({
                              ...currentDraft,
                              proposedPrompt: editedPrompt
                            });
                            setIsEditingPrompt(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Save className="h-4 w-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditingPrompt(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-md p-4 font-mono text-sm whitespace-pre-wrap border border-blue-200">
                      {currentDraft.proposedPrompt}
                    </div>
                  )}
                </div>

                {/* Understanding Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <p className="text-gray-700">{currentDraft.understanding.summary || 'No summary available'}</p>
                  </div>

                  {/* Confidence */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Confidence Level</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        (currentDraft.understanding.confidence || 0) >= 80 ? 'bg-green-500' :
                        (currentDraft.understanding.confidence || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="text-gray-700 font-medium">
                        {currentDraft.understanding.confidence || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Behavior */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Expected Behavior</h4>
                    <p className="text-gray-700">{currentDraft.understanding.behavior || 'No behavior description available'}</p>
                  </div>

                  {/* Tone */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Tone & Style</h4>
                    <p className="text-gray-700">{currentDraft.understanding.tone || 'No tone specified'}</p>
                  </div>
                </div>

                {/* Key Points */}
                {currentDraft.understanding.keyPoints && currentDraft.understanding.keyPoints.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Key Points</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {currentDraft.understanding.keyPoints.map((point, index) => (
                        <li key={index} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {currentDraft.suggestions && currentDraft.suggestions.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-3">AI Suggestions</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {currentDraft.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-amber-800">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clarifying Question */}
                {currentDraft.clarifyingQuestion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">AI Question</h4>
                    <p className="text-blue-800">{currentDraft.clarifyingQuestion}</p>
                  </div>
                )}
            </div>

            {/* Modal Footer - Fixed at Bottom */}
            <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={publishAction}
                disabled={isPublishing}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${
                  isPublishing
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Publish Action
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}