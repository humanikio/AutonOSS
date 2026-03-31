'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Bot, 
  MessageSquare, 
  Phone, 
  Mail,
  Users, 
  Settings, 
  ArrowRight,
  Clock,
  ChevronRight,
  Activity,
  Star
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useContactManagement } from '@/hooks/useContactManagement';
import { useConversations } from '@/hooks/useConversations';
import { conversationService } from '@/lib/services/conversationService';

interface Agent {
  id: string;
  name: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  botAvatarColor?: string;
  botIconImagePath?: string;
  totalInteractions?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(true);

  // Recent data states
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  
  // Get contacts for recent conversations
  const { 
    contacts, 
    loading: contactsLoading 
  } = useContactManagement(tenant?.id || '');

  // Get conversations data
  const {
    contacts: conversationContacts,
    messages,
    phoneRecords,
    loading: conversationsLoading
  } = useConversations(tenant?.id || '');

  // Additional state for comprehensive contact loading
  const [allPhoneRecords, setAllPhoneRecords] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);

  // Load comprehensive activity data for all contacts
  useEffect(() => {
    const loadAllActivityData = async () => {
      if (!tenant?.id || !contacts.length) return;

      try {
        console.log('🔍 Loading comprehensive activity data for', contacts.length, 'contacts');
        
        // Collect all phone records and messages for all contacts
        const allPhoneRecordsPromises = contacts.map(async (contact) => {
          try {
            const phoneRecords = await conversationService.getPhoneRecords(tenant.id, contact.id);
            return phoneRecords.map(record => ({ ...record, contactId: contact.id, contactName: contact.name }));
          } catch (error) {
            console.error(`Error loading phone records for contact ${contact.id}:`, error);
            return [];
          }
        });

        const allMessagesPromises = contacts.map(async (contact) => {
          try {
            // We need to get all conversations for this contact, not just the primary one
            // For now, we'll use the existing messages from useConversations hook
            // but ideally we'd query all conversations
            const contactMessages = messages.filter(msg => 
              msg.id.includes(contact.id)
            );
            return contactMessages.map(msg => ({ ...msg, contactId: contact.id, contactName: contact.name }));
          } catch (error) {
            console.error(`Error processing messages for contact ${contact.id}:`, error);
            return [];
          }
        });

        const phoneRecordsResults = await Promise.all(allPhoneRecordsPromises);
        const messagesResults = await Promise.all(allMessagesPromises);

        const flatPhoneRecords = phoneRecordsResults.flat();
        const flatMessages = messagesResults.flat();

        console.log('📞 Loaded phone records:', flatPhoneRecords.length);
        console.log('💬 Loaded messages:', flatMessages.length);

        setAllPhoneRecords(flatPhoneRecords);
        setAllMessages(flatMessages);
      } catch (error) {
        console.error('Error loading comprehensive activity data:', error);
      }
    };

    loadAllActivityData();
  }, [tenant?.id, contacts.length, messages]);

  // Load recent agents with real-time updates
  useEffect(() => {
    if (!user?.uid || !tenant?.id) {
      setAgentsLoading(false);
      return;
    }

    const agentsRef = collection(db, 'tenants', tenant.id, 'agents');
    const agentsQuery = query(agentsRef, orderBy('createdAt', 'desc'), limit(4));

    const unsubscribe = onSnapshot(agentsQuery, 
      (snapshot) => {
        const agentsData: Agent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          agentsData.push({
            id: doc.id,
            name: data.name || 'Unnamed Agent',
            status: data.status || 'draft',
            description: data.description || 'New agent ready for configuration',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            botAvatarColor: data.botAvatarColor,
            botIconImagePath: data.botIconImagePath,
            totalInteractions: data.totalInteractions || 0,
          });
        });
        setRecentAgents(agentsData);
        setAgentsLoading(false);
      },
      (error) => {
        console.error('Error fetching recent agents:', error);
        setAgentsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Set overall loading state
  useEffect(() => {
    setLoading(agentsLoading || contactsLoading || conversationsLoading);
  }, [agentsLoading, contactsLoading, conversationsLoading]);

  // Create enhanced contacts with latest activity from all channels
  // Use ALL contacts (from contact management), not just those with conversations
  const enhancedConversationContacts = contacts.map(contact => {
    // Get all messages for this contact from comprehensive data
    const contactMessages = allMessages.filter(msg => 
      msg.contactId === contact.id
    );
    
    // Get all phone records for this contact from comprehensive data
    const contactPhoneRecords = allPhoneRecords.filter(record => 
      record.contactId === contact.id
    );
    
    // Debug logging to see what we're getting
    if (contact.name.includes('Test') || contactPhoneRecords.length > 0 || contactMessages.some(m => m.channel === 'EMAIL')) {
      console.log(`🔍 Contact: ${contact.name}`);
      console.log(`📱 Messages found: ${contactMessages.length}`, contactMessages.map(m => ({ channel: m.channel, text: m.text?.substring(0, 30) })));
      console.log(`📞 Phone records found: ${contactPhoneRecords.length}`);
      if (contactPhoneRecords.length > 0) {
        console.log('📞 Phone records:', contactPhoneRecords.map(r => ({ 
          id: r.id, 
          timestamp: r.timestamp, 
          direction: r.direction,
          analysis: r.analysis 
        })));
      }
    }
    
    // Create unified timeline
    const timeline: Array<{ type: 'message' | 'phone'; data: any; timestamp: Date }> = [];
    
    // Add messages to timeline
    contactMessages.forEach(message => {
      timeline.push({
        type: 'message',
        data: message,
        timestamp: message.timestamp
      });
    });
    
    // Add phone records to timeline
    contactPhoneRecords.forEach(record => {
      timeline.push({
        type: 'phone',
        data: record,
        timestamp: record.timestamp
      });
    });
    
    // Sort by timestamp to get most recent activity
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Debug timeline
    if (contact.name.includes('Test') || timeline.length > 2) {
      console.log(`📊 Timeline for ${contact.name}:`, timeline.map(item => ({
        type: item.type,
        timestamp: item.timestamp,
        channel: item.type === 'message' ? item.data.channel : 'PHONE',
        preview: item.type === 'message' ? 
          item.data.text?.substring(0, 50) : 
          `Call: ${item.data.analysis?.call_summary_title || item.data.direction || 'No summary'}`
      })));
    }
    
    // Get the most recent activity - THIS IS THE KEY FIX
    const latestActivity = timeline[0];
    let lastMessage = contact.lastMessage || 'No recent activity'; // fallback
    let activityType = 'sms'; // fallback
    let lastActivityTime = contact.lastActivityTimestamp || new Date(Date.now()); // fallback
    
    if (latestActivity) {
      lastActivityTime = latestActivity.timestamp;
      
      if (latestActivity.type === 'message') {
        const msg = latestActivity.data;
        lastMessage = msg.text || msg.body || 'Message';
        // Better email detection - check both channel and subject fields
        if (msg.channel === 'EMAIL' || msg.subject) {
          activityType = 'email';
        } else {
          activityType = 'sms';
        }
      } else if (latestActivity.type === 'phone') {
        const call = latestActivity.data;
        // Enhanced call formatting with better prioritization
        if (call.analysis?.call_summary_title) {
          lastMessage = call.analysis.call_summary_title;
        } else if (call.analysis?.transcript_summary) {
          // Truncate long summaries for dashboard display
          const summary = call.analysis.transcript_summary;
          lastMessage = summary.length > 60 ? `${summary.substring(0, 60)}...` : summary;
        } else {
          // Better direction detection and formatting
          const direction = call.direction || call.metadata?.phone_call?.direction || 'unknown';
          const status = call.status || 'completed';
          const duration = call.metadata?.call_duration_secs ? 
            `${Math.floor(call.metadata.call_duration_secs / 60)}m ${call.metadata.call_duration_secs % 60}s` : 
            call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'Unknown duration';
          
          // Format based on direction
          if (direction === 'inbound' || direction === 'incoming') {
            lastMessage = `Incoming call (${duration})`;
          } else if (direction === 'outbound' || direction === 'outgoing') {
            lastMessage = `Outbound call (${duration})`;
          } else {
            lastMessage = `Phone call (${duration})`;
          }
        }
        activityType = 'call';
      }
    }
    
    // Debug final activity determination
    if (contact.name.includes('Test') || timeline.length > 2 || activityType !== 'sms') {
      console.log(`🎯 Final activity for ${contact.name}: ${activityType} - "${lastMessage}"`);
    }
    
    return {
      ...contact,
      lastMessage,
      activityType,
      lastActivity: lastActivityTime,
      // Ensure we have all required UI properties
      unread: timeline.filter(item => 
        item.type === 'message' && 
        item.data.direction === 'inbound' && 
        !item.data.read
      ).length,
      status: timeline.length > 0 ? 'active' : 'waiting',
      initials: contact.initials || contact.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??',
      date: lastActivityTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isStarred: contact.isStarred || false
    };
  })
  // Only show contacts that have some activity (messages or phone records)
  .filter(contact => {
    const hasMessages = allMessages.some(msg => msg.contactId === contact.id);
    const hasPhoneRecords = allPhoneRecords.some(record => record.contactId === contact.id);
    return hasMessages || hasPhoneRecords;
  });

  const formatTimeAgo = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffTime < 60000) return 'Just now';
    if (diffTime < 3600000) return `${Math.floor(diffTime / 60000)}m ago`;
    if (diffTime < 86400000) return `${Math.floor(diffTime / 3600000)}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'call':
      case 'phone': 
        return <Phone className="h-4 w-4 text-green-600" />;
      case 'email':
      case 'EMAIL': 
        return <Mail className="h-4 w-4 text-blue-600" />;
      case 'sms':
      case 'SMS':
      default: 
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-yellow-100 text-yellow-700';
      case 'paused': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const quickActions = [
    {
      title: 'Create Agent',
      description: 'Build a new AI agent',
      icon: Plus,
      color: 'bg-primary-500 hover:bg-primary-600',
      path: '/agents',
      action: 'create'
    },
    {
      title: 'View Calls',
      description: 'Recent call logs',
      icon: Phone,
      color: 'bg-green-500 hover:bg-green-600',
      path: '/calls'
    },
    {
      title: 'Conversations',
      description: 'Message history',
      icon: MessageSquare,
      color: 'bg-primary-500 hover:bg-primary-600',
      path: '/crm/conversations'
    },
    {
      title: 'Contacts',
      description: 'Manage contacts',
      icon: Users,
      color: 'bg-purple-500 hover:bg-purple-600',
      path: '/contacts'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-48">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-full bg-black overflow-hidden mb-4">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/loading/loadingVideo.mp4" type="video/mp4" />
            </video>
          </div>
          <span className="text-gray-600 text-lg">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-500">Welcome back! Here's what's happening with your agents.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.title}
                onClick={() => router.push(action.path)}
                className="card p-6 hover:shadow-md transition-all duration-200 group text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${action.color} text-white transition-transform group-hover:scale-110`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </button>
            );
          })}
        </div>

        {/* Recent Conversations - Featured at Top */}
        <div className="mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-medium text-gray-900">Recent Conversations</h2>
              </div>
              <button
                onClick={() => router.push('/crm/conversations')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {enhancedConversationContacts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="font-medium text-lg">No conversations yet</p>
                <p className="text-sm">Send an SMS to your Twilio number or make a call to start a conversation</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enhancedConversationContacts
                  .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
                  .slice(0, 6)
                  .map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => router.push('/crm/conversations')}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${contact.avatarColor}`}>
                          {contact.initials}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 truncate">{contact.name}</h3>
                          <p className="text-xs text-gray-500">{contact.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contact.unread > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {contact.unread}
                          </span>
                        )}
                        {contact.isStarred && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="flex-shrink-0 mt-0.5">{getActivityIcon(contact.activityType)}</div>
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {contact.lastMessage}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{formatTimeAgo(contact.lastActivity)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          contact.status === 'active' ? 'bg-green-100 text-green-700' :
                          contact.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {contact.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Other Recent Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Agents */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Bot className="h-5 w-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">Recent Agents</h2>
              </div>
              <button
                onClick={() => router.push('/agents')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {recentAgents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No agents yet</p>
                  <p className="text-sm">Create your first AI agent to get started</p>
                </div>
              ) : (
                recentAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => router.push(`/agents/configuration/${agent.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {agent.botIconImagePath ? (
                        <img 
                          src={agent.botIconImagePath} 
                          alt={`${agent.name} Bot Icon`}
                          className="h-10 w-10 object-cover rounded-full"
                        />
                      ) : (
                        <div className="p-2 bg-primary-100 rounded-full">
                          <Bot className="h-6 w-6 text-primary-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{agent.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{agent.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(agent.status)}`}>
                          {agent.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          Created {formatTimeAgo(agent.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Contacts */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">Recent Contacts</h2>
              </div>
              <button
                onClick={() => router.push('/contacts')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No contacts yet</p>
                  <p className="text-sm">Start conversations to see contacts here</p>
                </div>
              ) : (
                contacts.slice(0, 4).map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => router.push(`/contacts/details/${contact.id}`)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${contact.avatarColor}`}>
                        {contact.initials}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{contact.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{contact.phone}</p>
                      <span className="text-xs text-gray-400">
                        Last activity {formatTimeAgo(contact.lastActivityTimestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}