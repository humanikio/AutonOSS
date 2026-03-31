'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Send, Paperclip, Smile, DollarSign, Phone, Mail, Bot, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { usePhoneNumbers } from '@/hooks/usePhoneNumbers';
import { useAgentsData } from '@/hooks/useAgentData';
import { useUserData } from '@/hooks/useUserData';
import { UIPhoneRecord, UIMessage } from '@/lib/services/conversationService';
import EmailMessage from './EmailMessage';
import CallRecord from './CallRecord';
import CallInitiationButton from '@/components/call/CallInitiationButton';
import TemplatePickerModal from '@/components/email/TemplatePickerModal';
import { emailTemplateService, EmailTemplate } from '@/lib/services/emailTemplateService';

interface ContactChatInterfaceProps {
  contactId: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
}

export default function ContactChatInterfaceOptimized({ contactId, contact }: ContactChatInterfaceProps) {
  const { tenant, user, getToken, currentTenantId } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'sms' | 'email'>('sms');
  const [selectedEmailAccount, setSelectedEmailAccount] = useState<string>('');
  const [emailAccounts, setEmailAccounts] = useState<Array<{id: string, email: string, friendlyName: string, provider: 'gmail' | 'outlook' | 'mailgun'}>>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');

  // Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  
  // Use the optimized conversations hook for better performance
  const {
    contacts: conversationContacts,
    messages,
    phoneRecords,
    selectedContact,
    selectedContactId,
    loading: conversationsLoading,
    selecting,
    error,
    selectContact,
    refreshContacts,
    clearConversationState,
    // Pagination
    hasMoreMessages,
    loadingMoreMessages,
    loadMoreMessages
  } = useConversations(tenant?.id || '', contactId); // Pass contactId to force state reset

  // Use phone numbers hook
  const {
    phoneNumbers,
    loading: phoneNumbersLoading,
    error: phoneNumbersError
  } = usePhoneNumbers();
  
  // Effect to select the contact when component mounts or contactId changes
  useEffect(() => {
    if (contactId && selectedContactId !== contactId && !selecting) {
      console.log(`🎯 ContactChatInterface: Selecting contact ${contactId} (clearing previous data)`);

      // IMPORTANT: Always try to select the contact, even if not in conversations list
      // The selectContact function will now fetch fresh data from Firestore
      selectContact(contactId).catch((error) => {
        console.log(`⚠️ Error selecting contact:`, error.message);

        // Only clear state if the contact genuinely has no conversation
        if (error.message.includes('has no conversation')) {
          console.log(`🧹 Clearing conversation data - contact has no conversation`);
          clearConversationState();
        }
      });
    }
  }, [contactId, selectedContactId, selectContact, selecting, clearConversationState]);

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

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    
    // If user scrolls to within 100px of the top, load more messages
    if (scrollTop < 100 && hasMoreMessages && !loadingMoreMessages) {
      const currentScrollHeight = e.currentTarget.scrollHeight;
      
      loadMoreMessages().then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - currentScrollHeight + scrollTop;
          }
        });
      });
    }
  }, [hasMoreMessages, loadingMoreMessages, loadMoreMessages]);

  // Auto scroll to bottom when timeline changes (only for new messages, not pagination)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only auto-scroll if we're not loading more messages (to avoid disrupting pagination scroll)
    if (!loadingMoreMessages) {
      scrollToBottom();
    }
  }, [timeline.length, loadingMoreMessages]);

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
        const token = await getToken();

        // Fetch default account config
        const configResponse = await fetch(`/api/email-accounts/config?tenantId=${tenant.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let defaultId = '';
        if (configResponse.ok) {
          const config = await configResponse.json();
          defaultId = config?.defaultAccountId || '';
          setDefaultAccountId(defaultId);
        }

        // Fetch all email accounts
        const accountsResponse = await fetch(`/api/email-accounts?tenantId=${tenant.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (accountsResponse.ok) {
          const accounts = await accountsResponse.json();
          setEmailAccounts(accounts || []);

          // Auto-select: default account > first active account
          if (accounts && accounts.length > 0 && !selectedEmailAccount) {
            if (defaultId && accounts.find((a: any) => a.id === defaultId)) {
              setSelectedEmailAccount(defaultId);
            } else {
              setSelectedEmailAccount(accounts[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading email accounts:', error);
      }
    };

    loadEmailAccounts();
  }, [tenant, selectedEmailAccount, getToken]);

  // Load email templates when email mode is activated
  useEffect(() => {
    const loadEmailTemplates = async () => {
      console.log('🔍 Template loading check:', {
        activeChannel,
        hasUser: !!user,
        currentTenantId,
        shouldLoad: activeChannel === 'email' && !!user && !!currentTenantId
      });

      if (activeChannel === 'email' && user && currentTenantId) {
        try {
          const token = await getToken();
          if (!token) {
            console.error('❌ No token available');
            return;
          }

          console.log('📧 Loading email templates for tenant:', currentTenantId);
          const templates = await emailTemplateService.getPublishedTemplates(currentTenantId, token);
          console.log('📧 Loaded templates:', templates.length, 'templates');
          console.log('📧 All templates:', templates);
          console.log('📧 Published templates:', templates.filter(t => t.status === 'published').length);
          setEmailTemplates(templates);
        } catch (error) {
          console.error('❌ Error loading email templates:', error);
        }
      }
    };

    loadEmailTemplates();
  }, [activeChannel, user, currentTenantId, getToken]);

  // Render avatar for message - agent avatar if from agent, user avatar if from user, otherwise contact avatar
  const renderMessageAvatar = (message: any) => {
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
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-600" />
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
        message.direction === 'outbound' ? 'bg-blue-600' : selectedContact?.avatarColor || 'bg-slate-700'
      }`}>
        {message.direction === 'outbound' ? 'U' : selectedContact?.initials || '??'}
      </div>
    );
  };

  const handleSendMessage = async () => {
    if (!currentContact || !tenant?.id || !newMessage.trim()) {
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

    if (activeChannel === 'email' && !currentContact?.email) {
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
        const requestBody: any = {
          tenantId: tenant.id,
          contactId: currentContact.id,
          phoneNumber: selectedPhoneNumber,
          message: newMessage,
          to: currentContact.phone,
          userId: user?.uid // Include user ID for avatar display
        };

        // Only include conversationId if it exists (selectedContact is from conversations hook)
        if (selectedContact?.conversationId) {
          requestBody.conversationId = selectedContact.conversationId;
        }

        const response = await fetch(`${apiUrl}/api/sms/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          console.log('✅ SMS sent successfully');
          setNewMessage('');

          // Refresh contacts to show the new conversation if one was created
          if (!selectedContact?.conversationId) {
            console.log('🔄 Refreshing contacts to load newly created conversation');
            await refreshContacts();
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
          console.error('❌ Failed to send SMS:', errorData);
          alert('Failed to send SMS. Please try again.');
        }
      } else if (activeChannel === 'email') {
        const emailBody: any = {
          tenantId: tenant.id,
          contactId: currentContact.id,
          conversationId: selectedContact?.conversationId,
          emailAccountId: selectedEmailAccount,
          subject: emailSubject,
          to: currentContact.email
        };

        // If template mode, send htmlContent; otherwise send plain text message
        if (isTemplateMode && selectedTemplate) {
          emailBody.htmlContent = newMessage;
        } else {
          emailBody.message = newMessage;
        }

        const response = await fetch(`${apiUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(emailBody),
        });

        if (response.ok) {
          console.log('✅ Email sent successfully');
          setNewMessage('');
          setEmailSubject('');
          setIsTemplateMode(false);
          setSelectedTemplate(null);

          // Refresh contacts to show the new conversation if one was created
          if (!selectedContact?.conversationId) {
            console.log('🔄 Refreshing contacts to load newly created conversation');
            await refreshContacts();
          }
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

  if (conversationsLoading || selecting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={refreshContacts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Use selectedContact from conversations hook, or fallback to passed contact prop
  const currentContact = selectedContact || contact;

  if (!currentContact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading contact...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Chat Header */}
      <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{currentContact.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <CallInitiationButton
            contactId={currentContact.id}
            contactPhone={currentContact.phone}
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
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {/* Loading indicator for pagination */}
        {loadingMoreMessages && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              Loading older messages...
            </div>
          </div>
        )}
        
        {/* No more messages indicator */}
        {!hasMoreMessages && timeline.length > 50 && (
          <div className="text-center py-2 mb-4">
            <div className="text-xs text-gray-400 bg-gray-50 rounded-full px-3 py-1 inline-block">
              Beginning of conversation
            </div>
          </div>
        )}
        
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
            // Render email messages differently
            if (message.channel === 'EMAIL' && message.subject) {
              return (
                <EmailMessage
                  key={message.id}
                  id={message.id}
                  subject={message.subject}
                  from={message.direction === 'outbound'
                    ? (emailAccounts.find(acc => acc.id === selectedEmailAccount)?.email || 'you@example.com')
                    : (currentContact.email || 'contact@example.com')
                  }
                  to={message.direction === 'outbound'
                    ? (currentContact.email || 'contact@example.com')
                    : (emailAccounts.find(acc => acc.id === selectedEmailAccount)?.email || 'you@example.com')
                  }
                  text={message.text}
                  htmlContent={message.htmlContent}
                  htmlStorageUrl={message.htmlStorageUrl}
                  media={message.media}
                  time={message.time}
                  direction={message.direction}
                  avatarColor={selectedContact?.avatarColor || currentContact.name.charAt(0).toUpperCase()}
                  contactInitials={selectedContact?.initials || currentContact.name.split(' ').map(n => n.charAt(0)).join('')}
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
                    {/* Agent badge for agent messages */}
                    {message.agent_id && agents[message.agent_id] && (
                      <div className={`flex items-center gap-1 text-xs text-primary-600 font-medium mb-1 ${
                        message.direction === 'outbound' ? 'flex-row-reverse' : ''
                      }`}>
                        <Bot className="h-3 w-3 text-primary-600" />
                        <span>{agents[message.agent_id].name}</span>
                      </div>
                    )}
                    <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                      message.agent_id 
                        ? 'bg-primary-600 text-white border-2 border-primary-200' // Special styling for agent messages
                        : message.direction === 'outbound' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.text}
                    </div>
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
                  {account.friendlyName} ({account.provider === 'gmail' ? 'Gmail' : account.provider === 'outlook' ? 'Outlook' : 'Pulseline Email'})
                  {account.id === defaultAccountId ? ' - Default' : ''}
                </option>
              ))}
            </select>
          )}
          <div className="text-sm text-gray-500 ml-4">To:</div>
          <div className="text-sm text-gray-900">
            {activeChannel === 'sms' 
              ? (currentContact?.phone || 'No phone number') 
              : (currentContact?.email || 'No email address')
            }
          </div>
        </div>

        {/* Template selection for emails */}
        {activeChannel === 'email' && (
          <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium"
            >
              <FileText className="h-4 w-4" />
              {isTemplateMode ? 'Change Template' : 'Send from Template'}
            </button>
            {isTemplateMode && selectedTemplate && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                  Template: <span className="font-medium">{selectedTemplate.name}</span>
                </span>
                <button
                  onClick={() => {
                    setIsTemplateMode(false);
                    setSelectedTemplate(null);
                    setNewMessage('');
                  }}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Clear Template
                </button>
              </div>
            )}
          </div>
        )}

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
          {isTemplateMode && activeChannel === 'email' ? (
            <>
              <div className="border border-gray-300 rounded-lg bg-gray-50 p-3 max-h-48 overflow-y-auto overflow-x-hidden">
                <div className="text-xs text-gray-500 mb-2 font-medium">Template Preview:</div>
                <div
                  dangerouslySetInnerHTML={{ __html: newMessage }}
                  className="bg-white p-2 rounded border border-gray-200 text-xs origin-top-left"
                  style={{
                    width: '600px',
                    transform: 'scale(0.8)',
                    transformOrigin: 'top left'
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 italic">
                ✨ Preview scaled down. Variables like {'{{'} firstName {'}}'} will be replaced when sent.
              </p>
            </>
          ) : (
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={activeChannel === 'sms' ? "Type a message" : "Email body"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
              rows={activeChannel === 'email' ? 5 : 3}
            />
          )}
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
                setIsTemplateMode(false);
                setSelectedTemplate(null);
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

      {/* Template Picker Modal */}
      {showTemplateModal && (
        <TemplatePickerModal
          templates={emailTemplates}
          onSelect={(template) => {
            setSelectedTemplate(template);
            setNewMessage(template.htmlContent);
            setIsTemplateMode(true);
            setShowTemplateModal(false);
          }}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
}