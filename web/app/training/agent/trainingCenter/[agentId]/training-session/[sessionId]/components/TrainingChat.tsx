'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingMessages, Message } from '@/hooks/useTrainingMessages';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { 
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Phone,
  Loader2,
  Trash2,
  Zap
} from 'lucide-react';


interface TrainingChatProps {
  agentId: string;
  sessionId: string;
  currentMode: 'chat' | 'call';
  isSessionActive: boolean;
  selectedActionId?: string | null;
  onModeToggle: () => void;
  onMessagesUpdate: (messages: Message[]) => void;
}

export default function TrainingChat({ 
  agentId, 
  sessionId, 
  currentMode, 
  isSessionActive,
  selectedActionId,
  onModeToggle,
  onMessagesUpdate 
}: TrainingChatProps) {
  const { user, getToken, tenant } = useAuth();
  const { messages, loading: messagesLoading, error: messagesError, refresh: refreshMessages } = useTrainingMessages(sessionId, tenant?.id || '');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent component about message updates
  useEffect(() => {
    onMessagesUpdate(messages);
  }, [messages, onMessagesUpdate]);

  // Listen for new analysis cycles to clear analyzing state
  useEffect(() => {
    if (!user?.uid || !tenant?.id || !isAnalyzing) return;

    const cyclesRef = collection(
      db,
      'tenants',
      tenant?.id,
      'trainingSessions',
      sessionId,
      'analysisCycles'
    );
    
    const q = query(cyclesRef, orderBy('cycleNumber', 'desc'), limit(1));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty && isAnalyzing) {
          // New analysis cycle appeared, clear analyzing state
          console.log('📊 New analysis cycle detected, clearing analyzing state');
          setIsAnalyzing(false);
        }
      },
      (error) => {
        console.error('Error listening for analysis cycles:', error);
        // Fallback: clear analyzing state after timeout
        setTimeout(() => setIsAnalyzing(false), 5000);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, tenant?.id, sessionId, isAnalyzing]);


  // Send message to training agent
  const sendMessage = async (messageContent: string) => {
    if (!user?.uid || !tenant?.id || !messageContent.trim()) return;

    try {
      setIsSending(true);
      setInputMessage('');

      // Send to SMS agent controller with training flags
      // The backend will handle saving messages to Firestore, and our realtime listener will update the UI
      const token = await getToken();
      const response = await fetch(`/api/agent-communication/sms/inbound`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageContent: messageContent.trim(),
          tenantId: tenant?.id,
          contactId: `training_${sessionId}`, // Virtual contact ID for training
          agentId: agentId,
          action: 'training_chat',
          actionId: selectedActionId || undefined, // Include selected action ID if available
          messageId: `training_msg_${Date.now()}`,
          conversationId: sessionId, // Use session as conversation ID
          isTraining: true, // Flag to indicate training mode
          trainingSessionId: sessionId, // Session ID for saving messages
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to get agent response');
      }

      // Messages will be automatically updated via Firestore realtime listener
      // No need to manually add messages to state
      
      // Switch to analyzing mode for training sessions
      setIsAnalyzing(true);
      
      // Set a timeout to clear analyzing state after analysis should be done
      // This is a fallback - ideally we'd listen to the analysis cycle completion
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 15000); // 15 seconds should be enough for most analyses

    } catch (error) {
      console.error('Error sending message:', error);
      
      // For error handling, we still might want to show a local error message
      // or handle it through a toast notification system
      // For now, we'll just log it and let the user retry
      
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isSessionActive || isSending || isAnalyzing) return;
    await sendMessage(inputMessage);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat messages
  const handleClearChat = async () => {
    if (!user?.uid || isClearing) return;

    // Confirm before clearing
    const confirmed = window.confirm(
      'Are you sure you want to clear all chat messages? This action cannot be undone.\n\nThis will preserve your session configuration and test agent settings.'
    );

    if (!confirmed) return;

    try {
      setIsClearing(true);

      const token = await getToken();
      const response = await fetch(`/api/agent-training/sessions/${sessionId}/clear-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearAnalysis: false // Keep analysis cycles by default
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear chat');
      }

      console.log('✅ Chat cleared successfully:', result.data);
      console.log(`📊 ${result.message || 'Chat cleared'}`);
      
      // Force refresh messages to ensure UI updates immediately
      setTimeout(() => {
        refreshMessages();
      }, 500); // Small delay to ensure backend operation completed
      
      // Optional: Show success notification
      // You can replace this with a proper toast notification system
      if (result.data?.messagesCleared > 0) {
        console.log(`🧹 Cleared ${result.data.messagesCleared} messages from training session`);
      }

    } catch (error) {
      console.error('❌ Error clearing chat:', error);
      alert(`Failed to clear chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Invalid time';
      }
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid time';
    }
  };

  return (
    <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentMode === 'chat' ? (
              <MessageSquare className="h-5 w-5 text-indigo-600" />
            ) : (
              <Phone className="h-5 w-5 text-green-600" />
            )}
            <span className="text-base font-medium text-gray-900">
              {currentMode === 'chat' ? 'Chat Training' : 'Voice Training'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Clear Chat Button */}
            <button
              onClick={handleClearChat}
              disabled={isClearing || !isSessionActive || messages.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear all chat messages"
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear Chat
            </button>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isSessionActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {isSessionActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Context Indicator */}
      {selectedActionId && (
        <div className="px-6 py-3 bg-purple-50 border-b border-purple-200 flex-shrink-0">
          <div className="flex items-center gap-2 text-purple-800">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Action context active</span>
            <span className="text-xs bg-purple-100 px-2 py-1 rounded-full">Training with specialized guidance</span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {messagesLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading conversation...</p>
          </div>
        )}

        {messagesError && (
          <div className="text-center py-8">
            <p className="text-sm text-red-600 mb-2">Error loading messages: {messagesError}</p>
            <p className="text-sm text-gray-500">Messages will automatically refresh when the connection is restored.</p>
          </div>
        )}

        {!messagesLoading && !messagesError && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              {currentMode === 'chat' ? (
                <MessageSquare className="h-8 w-8 text-gray-400" />
              ) : (
                <Phone className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {currentMode === 'chat' ? 'Start chatting' : 'Start voice training'}
            </h3>
            <p className="text-gray-500 text-sm">
              {currentMode === 'chat' 
                ? 'Send a message to begin training with your agent'
                : 'Use the microphone to start voice training'
              }
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <div className={`flex items-center justify-between mt-1 ${
                message.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`}>
                <span className="text-xs">{formatTime(message.timestamp)}</span>
                {message.metadata?.ragNeeded && (
                  <span className="text-xs">📚 {message.metadata.documentsUsed} docs</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {(isSending || isAnalyzing) && (
          <div className="flex justify-start">
            <div className="bg-gray-100 border border-gray-200 text-gray-900 max-w-[85%] px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  Analyzing for training...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-6 flex-shrink-0">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message your agent..."
              disabled={!isSessionActive}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 text-sm"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isSessionActive || isSending || isAnalyzing}
            className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isSending || isAnalyzing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}