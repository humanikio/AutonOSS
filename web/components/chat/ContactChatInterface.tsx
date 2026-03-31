'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Paperclip, Smile, DollarSign, Phone, Mail, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContactManagement } from '@/hooks/useContactManagement';
import { usePhoneNumbers } from '@/hooks/usePhoneNumbers';
import { useAgentsData } from '@/hooks/useAgentData';
import { useUserData } from '@/hooks/useUserData';
import { conversationService, UIPhoneRecord, UIMessage } from '@/lib/services/conversationService';
import EmailMessage from './EmailMessage';
import CallRecord from './CallRecord';
import AgentReport from './AgentReport';
import CallInitiationButton from '@/components/call/CallInitiationButton';

interface ContactChatInterfaceProps {
  contactId: string;
}

export default function ContactChatInterface({ contactId }: ContactChatInterfaceProps) {
  const { tenant, user, getToken } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'sms' | 'email'>('sms');
  const [selectedEmailAccount, setSelectedEmailAccount] = useState<string>('');
  const [emailAccounts, setEmailAccounts] = useState<Array<{id: string, email: string, friendlyName: string}>>([]);
  const [emailSubject, setEmailSubject] = useState<string>('');
  
  // Get all contacts from contact management (includes those without conversations)
  const {
    contacts,
    loading: contactsLoading,
    error,
    refreshContacts
  } = useContactManagement(tenant?.id || '');
  
  // Find the selected contact
  const selectedContact = contacts.find(contact => contact.id === contactId) || null;
  
  // State for messages and phone records (will load separately)
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [phoneRecords, setPhoneRecords] = useState<UIPhoneRecord[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Use phone numbers hook
  const {
    phoneNumbers,
    loading: phoneNumbersLoading,
    error: phoneNumbersError
  } = usePhoneNumbers();

  // Extract unique agent IDs and user IDs from messages and phone records
  const agentIds = useMemo(() => {
    const uniqueAgentIds = new Set<string>();
    messages.forEach(message => {
      if (message.agent_id) {
        uniqueAgentIds.add(message.agent_id);
      }
    });
    phoneRecords.forEach(record => {
      if (record.agentId) {
        uniqueAgentIds.add(record.agentId);
      }
    });
    return Array.from(uniqueAgentIds);
  }, [messages, phoneRecords]);

  const userIds = useMemo(() => {
    const uniqueUserIds = new Set<string>();
    messages.forEach(message => {
      if (message.user_id) {
        uniqueUserIds.add(message.user_id);
      }
    });
    return Array.from(uniqueUserIds);
  }, [messages]);

  // Fetch agent data for all agent IDs
  const { agents } = useAgentsData(tenant?.id || '', agentIds);
  
  // Fetch user data for all user IDs
  const { users } = useUserData(userIds);

  // Create merged timeline of messages and phone records, sorted by timestamp
  const timeline = useMemo(() => {
    const items: Array<{ type: 'message' | 'phone'; data: any; timestamp: Date }> = [];
    
    // Add messages to timeline
    messages.forEach(message => {
      items.push({
        type: 'message',
        data: message,
        timestamp: message.timestamp
      });
    });
    
    // Add phone records to timeline
    phoneRecords.forEach(record => {
      items.push({
        type: 'phone',
        data: record,
        timestamp: record.timestamp
      });
    });
    
    // Sort by timestamp
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, phoneRecords]);

  // Auto scroll to bottom when timeline changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [timeline]);

  // Auto-select first phone number when available
  useEffect(() => {
    if (phoneNumbers.length > 0 && !selectedPhoneNumber) {
      setSelectedPhoneNumber(phoneNumbers[0].phoneNumber);
    }
  }, [phoneNumbers, selectedPhoneNumber]);

  // Load email accounts when tenant is available
  useEffect(() => {
    const loadEmailAccounts = async () => {
      if (!tenant?.id) return;
      
      try {
        const response = await fetch(`/api/oauth/accounts?tenantId=${tenant.id}`);
        if (response.ok) {
          const accounts = await response.json();
          setEmailAccounts(accounts || []);
          if (accounts && accounts.length > 0 && !selectedEmailAccount) {
            setSelectedEmailAccount(accounts[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading email accounts:', error);
      }
    };

    loadEmailAccounts();
  }, [tenant, selectedEmailAccount]);

  // Load messages and phone records when contact has a conversation
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadMessagesAndRecords = async () => {
      if (!selectedContact || !selectedContact.conversationId || !tenant?.id) {
        setMessages([]);
        setPhoneRecords([]);
        return;
      }

      try {
        setLoadingMessages(true);
        
        // Get initial messages and phone records
        const [initialMessages, initialPhoneRecords] = await Promise.all([
          conversationService.getMessages(
            tenant.id,
            selectedContact.id,
            selectedContact.conversationId
          ),
          conversationService.getPhoneRecords(tenant.id, selectedContact.id)
        ]);
        
        setMessages(initialMessages);
        setPhoneRecords(initialPhoneRecords);

        // Set up real-time listener for messages
        unsubscribe = conversationService.onMessagesChange(
          tenant.id,
          selectedContact.id,
          selectedContact.conversationId,
          (updatedMessages) => {
            setMessages(updatedMessages);
          }
        );

      } catch (err) {
        console.error('Error loading messages and records:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessagesAndRecords();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedContact?.id, selectedContact?.conversationId, tenant?.id]);

  const handleSendMessage = async () => {
    if (!selectedContact || !tenant?.id || !newMessage.trim()) {
      return;
    }

    if (activeChannel === 'sms' && !selectedPhoneNumber) {
      alert('Please select a phone number to send SMS');
      return;
    }

    if (activeChannel === 'email' && (!selectedEmailAccount || !emailSubject.trim())) {
      alert('Please select an email account and enter a subject to send email');
      return;
    }

    if (activeChannel === 'email' && !selectedContact.email) {
      alert('Contact does not have an email address');
      return;
    }

    try {
      setSendingMessage(true);

      // Get auth token
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      if (activeChannel === 'sms') {
        const smsPayload = {
          tenantId: tenant.id,
          contactId: selectedContact.id,
          conversationId: selectedContact.conversationId || null, // Allow null for new conversations
          phoneNumber: selectedPhoneNumber,
          message: newMessage,
          to: selectedContact.phone,
          userId: user?.uid // Include user ID for avatar display
        };
        
        console.log('📨 Frontend SMS Payload:', JSON.stringify(smsPayload, null, 2));
        console.log('📨 User object:', user);
        
        const response = await fetch(`${apiUrl}/api/sms/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(smsPayload),
        });

        if (response.ok) {
          console.log('✅ SMS sent successfully');
          setNewMessage('');
          // Refresh contacts to get updated conversation data with delay
          setTimeout(() => {
            refreshContacts().catch(err => console.error('Error refreshing contacts:', err));
          }, 1000);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
          console.error('❌ Failed to send SMS:', errorData);
          alert('Failed to send SMS. Please try again.');
        }
      } else if (activeChannel === 'email') {
        const response = await fetch(`${apiUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tenantId: tenant.id,
            contactId: selectedContact.id,
            conversationId: selectedContact.conversationId || null, // Allow null for new conversations
            emailAccountId: selectedEmailAccount,
            subject: emailSubject,
            message: newMessage,
            to: selectedContact.email
          }),
        });

        if (response.ok) {
          console.log('✅ Email sent successfully');
          setNewMessage('');
          setEmailSubject('');
          // Refresh contacts to get updated conversation data with delay
          setTimeout(() => {
            refreshContacts().catch(err => console.error('Error refreshing contacts:', err));
          }, 1000);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
          console.error('❌ Failed to send email:', errorData);
          alert(`Failed to send email: ${errorData.error || 'Please try again'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Function to render message avatar
  const renderMessageAvatar = (message: any) => {
    console.log('🎭 renderMessageAvatar:', {
      messageId: message.id,
      direction: message.direction,
      agent_id: message.agent_id,
      user_id: message.user_id,
      hasUserData: message.user_id ? !!users[message.user_id] : false,
      userData: message.user_id ? users[message.user_id] : null
    });

    // If message has an agent_id, show agent avatar
    if (message.agent_id && agents[message.agent_id]) {
      const agent = agents[message.agent_id];
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
          <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center">
            <Bot className="h-4 w-4 text-indigo-600" />
          </div>
        );
      }
    }

    // For outbound messages, check if it's from the current authenticated user first (optimistic UI)
    if (message.direction === 'outbound' && message.user_id === user?.uid && user) {
      // Use current authenticated user's avatar immediately
      if (user.avatarUrl) {
        return (
          <img 
            src={user.avatarUrl} 
            alt={`${user.name} Avatar`}
            className="w-8 h-8 rounded-full object-cover"
          />
        );
      } else {
        // Generate initials from current user
        const name = user.name || user.email?.split('@')[0] || 'User';
        const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-blue-600">
            {initials}
          </div>
        );
      }
    }

    // If message has a user_id and is outbound (user-sent), try to show user avatar from fetched data
    if (message.user_id && users[message.user_id] && message.direction === 'outbound') {
      const userData = users[message.user_id];
      // Use user's avatar if available
      if (userData.avatarUrl) {
        return (
          <img 
            src={userData.avatarUrl} 
            alt={`${userData.name} Avatar`}
            className="w-8 h-8 rounded-full object-cover"
          />
        );
      } else {
        // Fallback to user initials
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-blue-600">
            {userData.initials || 'U'}
          </div>
        );
      }
    }

    // Default fallback for outbound messages without user_id or inbound messages
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
        message.direction === 'outbound' ? 'bg-blue-600' : (selectedContact?.avatarColor || 'bg-gray-600')
      }`}>
        {message.direction === 'outbound' ? 'U' : (selectedContact?.initials || 'U')}
      </div>
    );
  };

  if (contactsLoading || loadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Contact not found or no conversation available</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Chat Header */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{selectedContact.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <CallInitiationButton
            contactId={selectedContact.id}
            contactPhone={selectedContact.phone}
            tenantId={tenant?.id}
            onCallStarted={() => {
              // Refresh contacts to show new conversation/call record after a short delay
              setTimeout(() => {
                refreshContacts();
              }, 2000);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          />
        </div>
      </div>

      {/* Show conversation status */}
      {timeline.length === 0 && (
        <div className="bg-blue-50 text-blue-800 px-4 py-3 text-sm">
          {!selectedContact?.conversationId 
            ? "👋 Start a new conversation by sending a message or making a call!"
            : "No messages or call records yet in this conversation"
          }
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {timeline.map((item) => {
          if (item.type === 'phone') {
            // Render phone record
            const record = item.data as UIPhoneRecord;
            return (
              <CallRecord
                key={record.id}
                id={record.id}
                conversationId={record.conversationId}
                direction={record.direction}
                phoneNumber={record.phoneNumber}
                duration={record.duration}
                status={record.status}
                callSummaryTitle={record.callSummaryTitle}
                transcriptSummary={record.transcriptSummary}
                audioUrl={record.audioUrl}
                timestamp={record.timestamp}
                time={record.time}
                contactInitials={record.contactInitials}
                avatarColor={record.avatarColor}
                agentName={record.agentName}
                agentId={record.agentId}
                agents={agents}
                transcript={record.transcript}
                analysis={record.analysis}
              />
            );
          } else {
            // Render message
            const message = item.data;

            // Render Agent Reports (special phone call summaries from AI)
            if (message.message_category === 'agent_report') {
              return (
                <AgentReport
                  key={message.id}
                  text={message.text}
                  time={message.time}
                  agentId={message.agent_id}
                  agents={agents}
                  direction={message.direction}
                />
              );
            }

            // Hide system messages (call_initiated, call_completed without summary)
            if (message.message_category === 'system') {
              return null;
            }

            // Render email messages differently
            if (message.channel === 'EMAIL' && message.subject) {
              return (
                <EmailMessage
                  key={message.id}
                  id={message.id}
                  subject={message.subject}
                  from={message.direction === 'outbound'
                    ? (emailAccounts.find(acc => acc.id === selectedEmailAccount)?.email || 'you@example.com')
                    : selectedContact.email
                  }
                  to={message.direction === 'outbound'
                    ? selectedContact.email
                    : (emailAccounts.find(acc => acc.id === selectedEmailAccount)?.email || 'you@example.com')
                  }
                  text={message.text}
                  htmlContent={message.htmlContent}
                  time={message.time}
                  direction={message.direction}
                  avatarColor={selectedContact.avatarColor}
                  contactInitials={selectedContact.initials}
                />
              );
            }

            // Render SMS messages with existing layout
            return (
              <div key={message.id} className="mb-4">
                <div className={`flex items-start gap-3 ${
                  message.direction === 'outbound' ? 'flex-row-reverse' : ''
                }`}>
                  {renderMessageAvatar(message)}
                  <div className={`flex-1 ${message.direction === 'outbound' ? 'text-right' : ''}`}>
                    {message.agent_id && agents[message.agent_id] && (
                      <div className={`flex items-center gap-1 text-xs text-indigo-600 font-medium mb-1 ${
                        message.direction === 'outbound' ? 'flex-row-reverse' : ''
                      }`}>
                        <Bot className="h-3 w-3 text-indigo-600" />
                        <span>{agents[message.agent_id].name}</span>
                      </div>
                    )}
                    <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                      message.agent_id
                        ? 'bg-indigo-600 text-white border-2 border-indigo-200'
                        : message.direction === 'outbound' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.text}
                    </div>
                    {message.media && message.media.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.media.map((media: any, index: number) => (
                          <div key={index} className="border rounded-lg overflow-hidden max-w-sm">
                            {media.type.startsWith('image/') ? (
                              <img 
                                src={media.url} 
                                alt="Attachment" 
                                className="w-full h-auto"
                              />
                            ) : (
                              <div className="p-3 bg-gray-50">
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {media.type} attachment
                                  </span>
                                </div>
                                <a 
                                  href={media.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                  View attachment
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className={`text-xs text-gray-500 mt-1 ${message.direction === 'outbound' ? 'text-right' : ''}`}>
                      {message.time}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveChannel('sms')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeChannel === 'sms' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              SMS
            </button>
            <button
              onClick={() => setActiveChannel('email')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeChannel === 'email' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Email
            </button>
          </div>
        </div>
        
        <div className="mt-3 flex gap-2 items-center flex-wrap">
          <div className="text-sm text-gray-500">From:</div>
          {activeChannel === 'sms' ? (
            <select 
              className="text-sm border-0 focus:ring-0 p-0"
              value={selectedPhoneNumber}
              onChange={(e) => setSelectedPhoneNumber(e.target.value)}
            >
              <option value="">Select phone number</option>
              {phoneNumbers.map((phone) => (
                <option key={phone.phoneNumber} value={phone.phoneNumber}>
                  {phone.friendlyName || phone.phoneNumber}
                </option>
              ))}
            </select>
          ) : (
            <select 
              className="text-sm border-0 focus:ring-0 p-0"
              value={selectedEmailAccount}
              onChange={(e) => setSelectedEmailAccount(e.target.value)}
            >
              <option value="">Select email account</option>
              {emailAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email} ({account.friendlyName})
                </option>
              ))}
            </select>
          )}
          <div className="text-sm text-gray-500 ml-4">To:</div>
          <div className="text-sm text-gray-900">
            {activeChannel === 'sms' 
              ? (selectedContact?.phone || 'No phone number') 
              : (selectedContact?.email || 'No email address')
            }
          </div>
        </div>

        {/* Subject field for emails */}
        {activeChannel === 'email' && (
          <div className="mt-3">
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="mt-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={activeChannel === 'sms' ? "Type a message" : "Email body"}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={activeChannel === 'email' ? 5 : 3}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded">
              <Paperclip className="h-4 w-4 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Smile className="h-4 w-4 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <DollarSign className="h-4 w-4 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <span className="text-gray-400">+</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {activeChannel === 'sms' && (
              <span className="text-sm text-gray-500">
                Chars: {newMessage.length}, Segs: {Math.ceil(newMessage.length / 160) || 1}
              </span>
            )}
            {activeChannel === 'email' && (
              <span className="text-sm text-gray-500">
                Subject: {emailSubject.length} chars, Body: {newMessage.length} chars
              </span>
            )}
            <button 
              onClick={() => {
                setNewMessage('');
                setEmailSubject('');
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
            >
              Clear
            </button>
            <button 
              onClick={handleSendMessage}
              disabled={
                sendingMessage || 
                !newMessage.trim() || 
                (activeChannel === 'sms' && !selectedPhoneNumber) ||
                (activeChannel === 'email' && (!selectedEmailAccount || !emailSubject.trim()))
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {sendingMessage 
                ? `Sending ${activeChannel.toUpperCase()}...` 
                : `Send ${activeChannel.toUpperCase()}`
              }
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}