'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Filter, MoreHorizontal, Phone, Mail, Send, Paperclip, Smile, DollarSign, ChevronRight, Edit2, User, Bot, Star, MessageSquare, Plus, Target, Calendar, ChevronDown, Trash2, Sparkles, Tag, X, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { UIPhoneRecord, conversationService } from '@/lib/services/conversationService';
import { usePhoneNumbers } from '@/hooks/usePhoneNumbers';
import { useAgentsData } from '@/hooks/useAgentData';
import { useUserData } from '@/hooks/useUserData';
import { useContactManagement } from '@/hooks/useContactManagement';
import ContactFieldsEditor from '@/components/contacts/ContactFieldsEditor';
import TagsModal from '@/components/contacts/TagsModal';
import EmailMessage from './EmailMessage';
import CallRecord from './CallRecord';
import AgentReport from './AgentReport';
import CallInitiationButton from '../call/CallInitiationButton';
import { opportunityService, Opportunity, CreateOpportunityRequest } from '@/services/opportunityService';
import { pipelineService, Pipeline } from '@/services/pipelineService';
import { contactProfileService, ContactProfile } from '@/services/contactProfileService';
import { contactTagsAPI, ContactTag } from '@/lib/api/contactTags';
import ReactMarkdown from 'react-markdown';
import TemplatePickerModal from '@/components/email/TemplatePickerModal';
import { emailTemplateService, EmailTemplate } from '@/lib/services/emailTemplateService';

// Component uses types from imported services

export default function ChatInterface() {
  const { tenant, user, loading: authLoading, getToken, currentTenantId } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof conversationContacts>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({
    name: '',
    source: 'Conversation',
    pipelineId: '',
    stageId: '',
    description: '',
    expectedCloseDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  
  // User Notes state
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);

  // AI Profile state
  const [aiProfile, setAiProfile] = useState<ContactProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfileText, setEditedProfileText] = useState('');

  // Collapsible sections state
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [opportunitiesExpanded, setOpportunitiesExpanded] = useState(true);

  // Tags state
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [contactTags, setContactTags] = useState<ContactTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  
  // Use real Firestore data
  const {
    contacts: conversationContacts,
    messages,
    selectedContact,
    selectedContactId,
    loading: conversationsLoading,
    selecting: contactSelecting,
    error,
    selectContact: selectConversationContact,
    refreshContacts,
    // Message pagination
    hasMoreMessages,
    loadingMoreMessages,
    loadMoreMessages,
    // Contact pagination
    hasMoreContacts,
    loadingMoreContacts,
    loadMoreContacts,
    totalContactsCount,
    // Cache info
    cacheHit,
    autoSelected
  } = useConversations(tenant?.id || '');

  // Enhanced atomic contact selection with auth token
  const selectContactWithAuth = useCallback(async (contactId: string) => {
    if (!tenant?.id) return;

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const contact = conversationContacts.find(c => c.id === contactId);
      if (!contact) return;

      console.log(`👆 Starting atomic contact selection for ${contactId}`);
      
      // Create mark-as-read callback with proper auth
      const markAsReadCallback = async () => {
        if (!contact?.conversationId) return;
        
        console.log(`📖 Marking conversation ${contact.conversationId} as read (${contact.unread} unread messages)`);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/conversations/${tenant.id}/${contactId}/${contact.conversationId}/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });

        if (response.ok) {
          console.log(`✅ Successfully marked conversation ${contact.conversationId} as read`);
          // Refresh contacts to get updated unread counts
          refreshContacts();
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
          console.error('❌ Failed to mark conversation as read:', errorData);
          throw new Error('Failed to mark as read');
        }
      };
      
      // Use the atomic selectContact from the hook with mark-as-read callback
      await selectConversationContact(contactId, markAsReadCallback);
      
    } catch (error) {
      console.error('❌ Error in atomic contact selection:', error);
    }
  }, [tenant?.id, getToken, conversationContacts, selectConversationContact, refreshContacts]);

  // Debug pagination state
  useEffect(() => {
    console.log('🔍 Pagination State:', {
      hasMoreContacts,
      loadingMoreContacts,
      totalContactsCount,
      currentContactsCount: conversationContacts.length,
      searchQuery
    });
  }, [hasMoreContacts, loadingMoreContacts, totalContactsCount, conversationContacts.length, searchQuery]);

  // Debounced search effect
  useEffect(() => {
    const searchContacts = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const { conversationService } = await import('@/lib/services/conversationService');
        const results = await conversationService.searchContactsWithConversations(tenant?.id || '', searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching contacts:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchContacts, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, tenant?.id]);

  // Get ALL contacts (not just those with conversations)
  const { 
    contacts: allContacts, 
    loading: contactsLoading,
    refreshContacts: refreshManagementContacts
  } = useContactManagement(tenant?.id || '');

  // Additional state for comprehensive contact loading
  const [allPhoneRecords, setAllPhoneRecords] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [comprehensiveContactsLoading, setComprehensiveContactsLoading] = useState(false);

  // Extract unique agent IDs from messages for fetching agent data
  const agentIds = useMemo(() => {
    const uniqueAgentIds = new Set<string>();
    messages.forEach(message => {
      if (message.agent_id) {
        uniqueAgentIds.add(message.agent_id);
      }
    });
    return Array.from(uniqueAgentIds);
  }, [messages]);

  // Extract unique user IDs from messages for fetching user data
  const userIds = useMemo(() => {
    const uniqueUserIds = new Set<string>();
    messages.forEach(message => {
      if (message.user_id) {
        uniqueUserIds.add(message.user_id);
      }
    });
    return Array.from(uniqueUserIds);
  }, [messages]);

  // Use agents hook to get agent data for avatars
  const { agents } = useAgentsData(tenant?.id || '', agentIds);
  
  // Use users hook to get user data for avatars
  const { users } = useUserData(userIds);

  // Load phone records for the currently selected contact
  useEffect(() => {
    const loadPhoneRecords = async () => {
      if (!tenant?.id || !selectedContact?.id) {
        setAllPhoneRecords([]);
        setAllMessages([]);
        return;
      }

      try {
        setComprehensiveContactsLoading(true);
        
        // Load phone records for the selected contact
        const phoneRecords = await conversationService.getPhoneRecords(tenant.id, selectedContact.id);
        const phoneRecordsWithContact = phoneRecords.map(record => ({ 
          ...record, 
          contactId: selectedContact.id, 
          contactName: selectedContact.name 
        }));

        setAllPhoneRecords(phoneRecordsWithContact);
        
        // Add current messages for timeline display
        const messagesWithContact = messages.map(msg => ({ 
          ...msg, 
          contactId: selectedContact.id, 
          contactName: selectedContact.name 
        }));
        
        setAllMessages(messagesWithContact);
        
      } catch (error) {
        console.error('Error loading phone records:', error);
      } finally {
        setComprehensiveContactsLoading(false);
      }
    };

    loadPhoneRecords();
  }, [tenant?.id, selectedContact?.id, messages.length]); // Reload when contact or messages change

  // SIMPLIFIED: Use the optimized contacts from conversationService directly
  const contacts = conversationContacts;


  // Create merged timeline of messages and phone records for selected contact
  const timeline = useMemo(() => {
    if (!selectedContact) return [];
    
    const items: Array<{ type: 'message' | 'phone'; data: any; timestamp: Date }> = [];
    
    // Add messages for the selected contact
    const selectedContactMessages = allMessages.filter(msg => msg.contactId === selectedContact.id);
    selectedContactMessages.forEach(message => {
      items.push({
        type: 'message',
        data: message,
        timestamp: message.timestamp
      });
    });
    
    // Add phone records for the selected contact
    const selectedContactPhoneRecords = allPhoneRecords.filter(record => record.contactId === selectedContact.id);
    selectedContactPhoneRecords.forEach(record => {
      items.push({
        type: 'phone',
        data: record,
        timestamp: record.timestamp
      });
    });
    
    // Sort by timestamp
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [selectedContact, allMessages, allPhoneRecords]);

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

  // Auto scroll to bottom when messages change (only for new messages, not pagination)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only auto-scroll if we're not loading more messages (to avoid disrupting pagination scroll)
    if (!loadingMoreMessages) {
      scrollToBottom();
    }
  }, [timeline.length, loadingMoreMessages]); // Changed from timeline to timeline.length to be more specific

  // Use phone numbers hook
  const {
    phoneNumbers
  } = usePhoneNumbers();

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

  // Initialize edit values when contact is selected
  useEffect(() => {
    if (selectedContact) {
      const [firstName, lastName] = selectedContact.name.split(' ');
      setEditValues({
        firstName: firstName || '',
        lastName: lastName || '',
        email: selectedContact.email || '',
        phone: selectedContact.phone || ''
      });
    }
  }, [selectedContact]);

  // Load pipelines on component mount
  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const fetchedPipelines = await pipelineService.getPipelines();
        setPipelines(fetchedPipelines);
        
        // Set default pipeline and stage if available
        if (fetchedPipelines.length > 0 && !newOpportunity.pipelineId) {
          const firstPipeline = fetchedPipelines[0];
          setNewOpportunity(prev => ({
            ...prev,
            pipelineId: firstPipeline.id,
            stageId: firstPipeline.stages?.[0]?.id || ''
          }));
        }
      } catch (error) {
        console.error('Error loading pipelines:', error);
      }
    };
    
    loadPipelines();
  }, []);

  // Load opportunities for the selected contact
  useEffect(() => {
    const loadOpportunities = async () => {
      if (!selectedContact?.id) {
        setOpportunities([]);
        return;
      }

      try {
        setOpportunitiesLoading(true);
        const contactOpportunities = await opportunityService.getOpportunitiesByContact(selectedContact.id);
        setOpportunities(contactOpportunities);
      } catch (error) {
        console.error('Error loading opportunities:', error);
      } finally {
        setOpportunitiesLoading(false);
      }
    };

    loadOpportunities();
  }, [selectedContact?.id]);

  // Load contact tags
  useEffect(() => {
    const loadContactTags = async () => {
      if (!selectedContact) {
        setContactTags([]);
        return;
      }

      if (!selectedContact.tags || selectedContact.tags.length === 0) {
        setContactTags([]);
        return;
      }

      try {
        setTagsLoading(true);
        const token = await getToken();
        if (!token) return;

        const result = await contactTagsAPI.getAllTags(token);
        // Filter to only show tags that are assigned to this contact
        const assignedTags = result.tags.filter(tag =>
          selectedContact.tags?.includes(tag.tagId)
        );
        setContactTags(assignedTags);
      } catch (error) {
        console.error('Error loading contact tags:', error);
      } finally {
        setTagsLoading(false);
      }
    };

    loadContactTags();
  }, [selectedContact, selectedContact?.tags, getToken]);

  // Load user notes for the selected contact
  useEffect(() => {
    const loadUserNotes = async () => {
      if (!selectedContact?.id || !tenant?.id) {
        setUserNotes([]);
        return;
      }
      
      try {
        setNotesLoading(true);
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/notes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserNotes(data.notes || []);
        } else {
          console.error('Failed to load user notes');
        }
      } catch (error) {
        console.error('Error loading user notes:', error);
      } finally {
        setNotesLoading(false);
      }
    };
    
    loadUserNotes();
  }, [selectedContact?.id, tenant?.id, getToken]);

  // Load AI profile for the selected contact
  useEffect(() => {
    const loadAIProfile = async () => {
      if (!selectedContact?.id || !tenant?.id) {
        setAiProfile(null);
        return;
      }

      try {
        setProfileLoading(true);
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const profile = await contactProfileService.getLatestProfile(tenant.id, selectedContact.id, token);
        setAiProfile(profile);
      } catch (error) {
        console.error('Error loading AI profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadAIProfile();
  }, [selectedContact?.id, tenant?.id, getToken]);

  // Show loading state - prioritize conversations cache over contact management loading
  if (authLoading || (conversationsLoading && !cacheHit) || comprehensiveContactsLoading || contactSelecting) {
    return (
      <div className="fixed top-0 right-0 bottom-0 left-64 flex bg-gray-50 items-start justify-center pt-48">
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
          <span className="text-gray-600 text-lg">Loading conversations...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed top-0 right-0 bottom-0 left-64 flex bg-gray-50 items-center justify-center">
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

  // Filter contacts based on active tab
  const contactsToFilter = searchQuery.trim() ? searchResults : conversationContacts;

  // Deduplicate and filter contacts
  const seen = new Set<string>();
  const deduplicatedContacts = contactsToFilter.filter(contact => {
    if (seen.has(contact.id)) {
      console.warn(`🚨 Duplicate contact in UI: ${contact.id} - ${contact.name}`);
      return false;
    }
    seen.add(contact.id);
    return true;
  });

  const filteredContacts = deduplicatedContacts.filter(contact => {
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'unread' && contact.unread > 0) ||
      (activeTab === 'starred' && contact.isStarred) ||
      (activeTab === 'recents' && true); // All are recent for now

    return matchesTab;
  }).sort((a, b) => {
    // First prioritize starred conversations
    if (a.isStarred && !b.isStarred) return -1;
    if (!a.isStarred && b.isStarred) return 1;
    
    // Then sort by most recent activity (lastActivityTimestamp)
    // Handle cases where lastActivityTimestamp might be undefined
    const aTime = a.lastActivityTimestamp?.getTime() || 0;
    const bTime = b.lastActivityTimestamp?.getTime() || 0;
    return bTime - aTime;
  });

  const handleSaveField = async (field: string) => {
    if (!selectedContact || !tenant?.id) return;

    try {
      // Get auth token
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const updates: Record<string, string> = {};
      updates[field] = editValues[field as keyof typeof editValues];

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        console.log(`✅ Successfully updated ${field}`);
        // Refresh contacts to get updated data
        await refreshContacts();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
        console.error(`❌ Failed to update ${field}:`, errorData);
        // Revert to original values on error
        handleCancelEdit();
      }
    } catch (error) {
      console.error(`❌ Error updating ${field}:`, error);
      // Revert to original values on error
      handleCancelEdit();
    }

    setEditingField(null);
  };

  // Handler for ContactFieldsEditor component
  const handleFieldUpdate = async (fieldName: string, value: any) => {
    if (!selectedContact || !tenant?.id) throw new Error('No contact or tenant');

    const token = await getToken();
    if (!token) throw new Error('No auth token available');

    const updates: Record<string, any> = {};
    updates[fieldName] = value;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
      throw new Error(errorData.error || 'Failed to update field');
    }

    console.log(`✅ Successfully updated ${fieldName}`);
    // Refresh contacts to get updated data
    await refreshContacts();
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (selectedContact) {
      const [firstName, lastName] = selectedContact.name.split(' ');
      setEditValues({
        firstName: firstName || '',
        lastName: lastName || '',
        email: selectedContact.email || '',
        phone: selectedContact.phone || ''
      });
    }
    setEditingField(null);
  };

  // Handle opportunity creation
  const handleCreateOpportunity = async () => {
    if (!selectedContact || !newOpportunity.name.trim() || !newOpportunity.pipelineId || !newOpportunity.stageId) {
      return;
    }

    try {
      const opportunityData: CreateOpportunityRequest = {
        name: newOpportunity.name,
        source: newOpportunity.source,
        pipelineId: newOpportunity.pipelineId,
        stageId: newOpportunity.stageId,
        description: newOpportunity.description,
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactEmail: selectedContact.email,
        contactPhone: selectedContact.phone,
        expectedCloseDate: newOpportunity.expectedCloseDate,
        priority: newOpportunity.priority
      };

      const createdOpportunity = await opportunityService.createOpportunity(opportunityData);
      
      // Add to local state
      setOpportunities(prev => [createdOpportunity, ...prev]);
      
      // Reset form
      setNewOpportunity({
        name: '',
        source: 'Conversation',
        pipelineId: pipelines[0]?.id || '',
        stageId: pipelines[0]?.stages?.[0]?.id || '',
        description: '',
        expectedCloseDate: '',
        priority: 'medium'
      });
      
      setShowAddOpportunity(false);
      
      console.log('Opportunity created successfully:', createdOpportunity);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      // TODO: Show error toast
    }
  };

  // Handle user note creation
  const handleCreateUserNote = async () => {
    if (!selectedContact || !newNoteContent.trim() || !tenant?.id) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newNoteContent.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserNotes(prev => [data.note, ...prev]);
        setNewNoteContent('');
        setShowAddNote(false);
        console.log('User note created successfully:', data.note);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
        console.error('Failed to create user note:', errorData);
      }
    } catch (error) {
      console.error('Error creating user note:', error);
    }
  };

  // Handle user note editing
  const handleEditUserNote = async (noteId: string) => {
    if (!selectedContact || !editingNoteContent.trim() || !tenant?.id) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editingNoteContent.trim()
        }),
      });

      if (response.ok) {
        setUserNotes(prev => prev.map(note => 
          note.id === noteId 
            ? { ...note, content: editingNoteContent.trim(), isEdited: true }
            : note
        ));
        setEditingNoteId(null);
        setEditingNoteContent('');
        console.log('User note updated successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
        console.error('Failed to update user note:', errorData);
      }
    } catch (error) {
      console.error('Error updating user note:', error);
    }
  };

  // Handle user note deletion
  const handleDeleteUserNote = async (noteId: string) => {
    if (!selectedContact || !tenant?.id) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setUserNotes(prev => prev.filter(note => note.id !== noteId));
        console.log('User note deleted successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
        console.error('Failed to delete user note:', errorData);
      }
    } catch (error) {
      console.error('Error deleting user note:', error);
    }
  };

  // Handle AI profile edit
  const handleEditProfile = () => {
    if (aiProfile && aiProfile.data.text) {
      setEditedProfileText(aiProfile.data.text);
      setEditingProfile(true);
      setShowComprehensiveModal(true);
    }
  };

  // Handle AI profile save
  const handleSaveProfile = async () => {
    if (!aiProfile || !tenant?.id || !selectedContact?.id) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const updatedProfile = await contactProfileService.updateProfile(
        tenant.id,
        selectedContact.id,
        aiProfile.profileId,
        editedProfileText,
        token
      );

      setAiProfile(updatedProfile);
      setEditingProfile(false);
      setShowComprehensiveModal(false);
      console.log('AI profile updated successfully');
    } catch (error) {
      console.error('Error updating AI profile:', error);
    }
  };

  // Handle AI profile cancel
  const handleCancelProfileEdit = () => {
    setEditingProfile(false);
    setEditedProfileText('');
  };

  // Render avatar for user notes - similar to chat message avatars (compact version)
  const renderNoteAvatar = (note: any, size: string = 'w-4 h-4') => {
    // Check if it's the current user's note
    if (note.authorId === user?.uid && user) {
      // Use current authenticated user's avatar immediately
      if (user.avatarUrl) {
        return (
          <img 
            src={user.avatarUrl} 
            alt={`${user.name} Avatar`}
            className={`${size} rounded-full object-cover`}
          />
        );
      } else {
        // Generate initials from current user
        const name = user.name || user.email?.split('@')[0] || 'User';
        const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
        return (
          <div className={`${size} rounded-full flex items-center justify-center text-white text-xs font-medium bg-primary-600`}>
            {initials}
          </div>
        );
      }
    }

    // For other users' notes, try to use stored avatar or fallback to initials
    if (note.authorAvatarUrl) {
      return (
        <img
          src={note.authorAvatarUrl}
          alt={`${note.authorName} Avatar`}
          className={`${size} rounded-full object-cover`}
        />
      );
    } else {
      // Generate initials from author name
      const name = note.authorName || 'Unknown User';
      const initials = name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
      return (
        <div className={`${size} rounded-full flex items-center justify-center text-white text-xs font-medium bg-primary-600`}>
          {initials}
        </div>
      );
    }
  };

  // Format timestamp for notes (compact version)
  const formatNoteTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    let date: Date;
    
    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      // Handle serialized Firebase Timestamp
      date = new Date(timestamp._seconds * 1000 + Math.floor(timestamp._nanoseconds / 1000000));
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      console.warn('Unknown timestamp format:', timestamp);
      return '?';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date from timestamp:', timestamp);
      return '?';
    }
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleToggleStar = async (contact: typeof contacts[0], event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the contact
    
    if (!contact.conversationId || !tenant?.id) return;
    
    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/conversations/${tenant.id}/${contact.id}/${contact.conversationId}/toggle-star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        console.log(`✅ Successfully toggled star for conversation ${contact.conversationId}`);
        // Refresh contacts to get updated starred status
        await refreshContacts();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
        console.error('❌ Failed to toggle star:', errorData);
      }
    } catch (error) {
      console.error('❌ Error toggling star:', error);
    }
  };

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
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-primary-600">
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
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-primary-600">
            {userData.initials || 'U'}
          </div>
        );
      }
    }

    // Default fallback for outbound messages without user_id or inbound messages
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
        message.direction === 'outbound' ? 'bg-primary-600' : 'bg-primary-600'
      }`}>
        {message.direction === 'outbound' ? 'U' : selectedContact?.initials || '??'}
      </div>
    );
  };

  const getActivityIcon = (contact: any) => {
    // Get all messages and phone records for this contact to determine activity type
    const contactMessages = allMessages.filter(msg => msg.contactId === contact.id);
    const contactPhoneRecords = allPhoneRecords.filter(record => record.contactId === contact.id);
    
    // Create timeline to find most recent activity
    const timeline: Array<{ type: 'message' | 'phone'; data: any; timestamp: Date }> = [];
    
    contactMessages.forEach(message => {
      timeline.push({
        type: 'message',
        data: message,
        timestamp: message.timestamp
      });
    });
    
    contactPhoneRecords.forEach(record => {
      timeline.push({
        type: 'phone',
        data: record,
        timestamp: record.timestamp
      });
    });
    
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const latestActivity = timeline[0];
    
    if (latestActivity) {
      if (latestActivity.type === 'phone') {
        return <Phone className="h-4 w-4 text-primary-400" />;
      } else if (latestActivity.type === 'message') {
        const msg = latestActivity.data;
        if (msg.channel === 'EMAIL' || msg.subject) {
          return <Mail className="h-4 w-4 text-primary-400" />;
        } else {
          return <MessageSquare className="h-4 w-4 text-primary-400" />;
        }
      }
    }

    return <MessageSquare className="h-4 w-4 text-primary-400" />; // default
  };

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
        const requestBody: any = {
          tenantId: tenant.id,
          contactId: selectedContact.id,
          phoneNumber: selectedPhoneNumber,
          message: newMessage,
          to: selectedContact.phone,
          userId: user?.uid // Include user ID for avatar display
        };

        // Only include conversationId if it exists
        if (selectedContact.conversationId) {
          requestBody.conversationId = selectedContact.conversationId;
        }

        console.log('📨 Frontend SMS Payload (ChatInterface):', JSON.stringify(requestBody, null, 2));
        console.log('📨 User object (ChatInterface):', user);

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
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }));
          console.error('❌ Failed to send SMS:', errorData);
          alert('Failed to send SMS. Please try again.');
        }
      } else if (activeChannel === 'email') {
        const emailBody: any = {
          tenantId: tenant.id,
          contactId: selectedContact.id,
          conversationId: selectedContact.conversationId,
          emailAccountId: selectedEmailAccount,
          subject: emailSubject,
          to: selectedContact.email
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

  const tabs = [
    { id: 'unread', label: 'Unread', active: activeTab === 'unread' },
    { id: 'recents', label: 'Recents', active: activeTab === 'recents' },
    { id: 'starred', label: 'Starred', active: activeTab === 'starred' },
    { id: 'all', label: 'All', active: activeTab === 'all' }
  ];

  return (
    <div className="fixed top-0 right-0 bottom-0 left-64 flex bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="px-4 pt-4 pb-3">
            <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
          </div>
          <div className="flex px-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab.active
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Filter className="h-4 w-4 text-primary-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreHorizontal className="h-4 w-4 text-primary-400" />
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {searchQuery ? `${filteredContacts.length} RESULTS` : `Showing ${conversationContacts.length} of ${totalContactsCount}`}
          </span>
          <button className="text-gray-500 hover:text-gray-700">Latest-All</button>
        </div>

        {/* Contact List */}
        <div
          className="flex-1 overflow-y-auto min-h-0"
          onScroll={(e) => {
            const element = e.currentTarget;
            const scrollHeight = element.scrollHeight;
            const scrollTop = element.scrollTop;
            const clientHeight = element.clientHeight;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            const scrolledNearBottom = distanceFromBottom <= 200; // Increased from 100px to 200px

            // Load more contacts when scrolling near bottom
            if (scrolledNearBottom && hasMoreContacts && !loadingMoreContacts && !searchQuery) {
              console.log('📇 Infinite scroll triggered - loading more contacts');
              loadMoreContacts();
            }
          }}
        >
          {isSearching ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Searching...
              </div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery ? 'No contacts found' : 'No conversations yet'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? `Try searching for something else` : 'Send an SMS to your Twilio number to start a conversation'}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContactId === contact.id;
            
            return (
              <div
                key={contact.id}
                onClick={() => selectContactWithAuth(contact.id)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 border-l-2 transition-colors ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-600' 
                    : contact.unread > 0 
                      ? 'border-blue-300 bg-blue-50/30 hover:bg-blue-50' 
                      : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium bg-primary-600">
                    {contact.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className={`truncate ${contact.unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
                        {contact.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">{contact.date}</span>
                        {contact.unread > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {contact.unread}
                          </span>
                        )}
                        <button
                          onClick={(e) => handleToggleStar(contact, e)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={contact.isStarred ? 'Unstar conversation' : 'Star conversation'}
                        >
                          <Star 
                            className={`h-4 w-4 ${
                              contact.isStarred 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-400 hover:text-yellow-400'
                            }`} 
                          />
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm truncate flex items-center gap-1 ${
                      contact.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                    }`}>
                      <span className="text-gray-400">{getActivityIcon(contact)}</span> {contact.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
          )}

          {/* Loading indicator for contact pagination */}
          {loadingMoreContacts && (
            <div className="text-center py-4 border-t border-gray-100">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading more conversations...
              </div>
            </div>
          )}

          {/* Load more button - shows when there are more contacts and not currently loading */}
          {!loadingMoreContacts && hasMoreContacts && !searchQuery && conversationContacts.length > 0 && (
            <div className="text-center py-4 border-t border-gray-100">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  console.log('🔵 Load More button clicked');
                  console.log('🔵 Current state:', { hasMoreContacts, loadingMoreContacts, contactsCount: conversationContacts.length });
                  await loadMoreContacts();
                }}
                disabled={loadingMoreContacts}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                Load more conversations
              </button>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMoreContacts && conversationContacts.length > 0 && !searchQuery && (
            <div className="text-center py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">You've reached the end of the list</p>
            </div>
          )}
        </div>
      </div>

      {/* Middle - Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">{selectedContact.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <CallInitiationButton
                  contactId={selectedContact.id}
                  contactPhone={selectedContact.phone}
                  tenantId={tenant?.id}
                  onCallStarted={() => {
                    // Refresh both contact lists to show new call record
                    setTimeout(() => {
                      refreshContacts();
                      refreshManagementContacts();
                    }, 2000);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                />
              </div>
            </div>

            {/* Show conversation status */}
            {timeline.length === 0 && (
              <div className="bg-blue-50 text-blue-800 px-4 py-3 text-sm">
                No messages or call records yet in this conversation
              </div>
            )}

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4 min-h-0"
            >
              {/* Loading indicator for pagination */}
              {loadingMoreMessages && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
                        htmlStorageUrl={message.htmlStorageUrl}
                        media={message.media}
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
                          {/* Agent badge for agent messages */}
                          {message.agent_id && agents[message.agent_id] && (
                            <div className={`flex items-center gap-1 text-xs text-primary-600 font-medium mb-1 ${
                              message.direction === 'outbound' ? 'flex-row-reverse' : ''
                            }`}>
                              <Bot className="h-3 w-3 text-primary-400" />
                              <span>{agents[message.agent_id].name}</span>
                            </div>
                          )}
                          {/* Destination workflow indicator */}
                          {message.destination_key && (
                            <div className={`flex items-center gap-1 text-xs text-blue-600 font-medium mb-1 ${
                              message.direction === 'outbound' ? 'flex-row-reverse' : ''
                            }`}>
                              <Target className="h-3 w-3 text-primary-400" />
                              <span>Sent via {message.destination_key}</span>
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
                          {(() => {
                            // DEBUG: Log message media data in chat rendering
                            console.log('🖼️ Chat rendering message:', {
                              id: message.id,
                              hasMedia: !!message.media,
                              mediaLength: message.media?.length || 0,
                              mediaData: message.media
                            });
                            return null;
                          })()}
                          {message.media && message.media.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.media.map((media: { url: string; type: string }, index: number) => (
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
                                        <Paperclip className="h-4 w-4 text-primary-400" />
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
              
              <div className="mt-3 flex gap-2 items-start flex-wrap">
                <div className="text-sm text-gray-500 pt-2">From:</div>
                <div className="flex-1 min-w-0">
                  {activeChannel === 'sms' ? (
                    <select
                      className="text-sm border-0 focus:ring-0 p-0 w-full"
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
                      className="text-sm border-0 focus:ring-0 p-0 w-full"
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
                </div>
              </div>
              <div className="mt-2 flex gap-2 items-start flex-wrap">
                <div className="text-sm text-gray-500 pt-2">To:</div>
                <div className="text-sm text-gray-900 break-words flex-1 min-w-0 pt-2">
                  {activeChannel === 'sms'
                    ? (selectedContact?.phone || 'No phone number')
                    : (selectedContact?.email || 'No email address')
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
                    <FileText className="h-4 w-4 text-primary-400" />
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
                    <Paperclip className="h-4 w-4 text-primary-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Smile className="h-4 w-4 text-primary-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <DollarSign className="h-4 w-4 text-primary-400" />
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
                    <Send className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a conversation to view messages</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Details */}
      <div className="w-[280px] bg-white border-l border-gray-200 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {selectedContact ? (
          <>
            {/* Contact Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium bg-primary-600">
                {selectedContact.initials}
              </div>
              <h3 className="font-semibold text-gray-900">{selectedContact.name}</h3>
            </div>

            {/* AI Profile Section */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setProfileExpanded(!profileExpanded)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  {profileExpanded ? (
                    <ChevronDown className="h-4 w-4 text-primary-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary-400" />
                  )}
                  <h4 className="font-medium text-gray-900 text-sm">AI Profile</h4>
                </button>
                {profileExpanded && aiProfile && !editingProfile && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEditProfile}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3 text-primary-400" />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowComprehensiveModal(true)}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      View Full Profile
                    </button>
                  </div>
                )}
              </div>

              {profileExpanded && (
                <div className="space-y-2">
                  {profileLoading ? (
                    <div className="text-center py-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mx-auto mb-1"></div>
                      <p className="text-xs text-gray-500">Loading...</p>
                    </div>
                  ) : !aiProfile || !aiProfile.data.text ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500">No profile yet</p>
                    </div>
                  ) : (
                    <div
                      className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded p-2 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all"
                      onClick={() => setShowComprehensiveModal(true)}
                    >
                      <div className="prose prose-sm max-w-none max-h-24 overflow-y-auto text-xs">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="my-0.5 text-xs" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                            ul: ({node, ...props}) => <ul className="my-0.5 ml-3 text-xs" {...props} />,
                            li: ({node, ...props}) => <li className="my-0" {...props} />,
                          }}
                        >
                          {contactProfileService.extractPreview(aiProfile.data.text, 4)}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-purple-600 font-medium">Click for full</span>
                        <span className="text-gray-500 text-xs">
                          {contactProfileService.formatTimestamp(aiProfile.updatedAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Fields - Dynamic with Groups */}
            {tenant?.id && selectedContact && (
              <ContactFieldsEditor
                contactId={selectedContact.id}
                tenantId={tenant.id}
                getToken={getToken}
                onFieldUpdate={handleFieldUpdate}
              />
            )}

            {/* Tags Section */}
            <div className="mb-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Tags</h4>
                <button
                  onClick={() => setShowTagsModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-primary-400" />
                  Manage
                </button>
              </div>

              {tagsLoading ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              ) : contactTags.length === 0 ? (
                <div className="text-center py-3 px-3 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <Tag className="h-5 w-5 text-primary-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No tags</p>
                  <button
                    onClick={() => setShowTagsModal(true)}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Add tags
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contactTags.map((tag) => (
                    <div
                      key={tag.tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium group"
                    >
                      <Tag className="h-2.5 w-2.5 text-primary-400" />
                      {tag.tagName}
                      <button
                        onClick={async () => {
                          try {
                            const token = await getToken();
                            if (!token) return;

                            // Remove tag from contact
                            const updatedTags = selectedContact.tags?.filter(id => id !== tag.tagId) || [];
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                            const response = await fetch(`${apiUrl}/api/contacts/${selectedContact.id}/manage`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                              },
                              body: JSON.stringify({ tags: updatedTags }),
                            });

                            if (response.ok) {
                              await refreshContacts();
                            }
                          } catch (error) {
                            console.error('Error removing tag:', error);
                          }
                        }}
                        className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        title="Remove tag"
                      >
                        <X className="h-2.5 w-2.5 text-primary-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities Section */}
            <div className="mb-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setOpportunitiesExpanded(!opportunitiesExpanded)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  {opportunitiesExpanded ? (
                    <ChevronDown className="h-4 w-4 text-primary-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary-400" />
                  )}
                  <h4 className="font-medium text-gray-900">Opportunities</h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {opportunities.length}
                  </span>
                </button>
                {opportunitiesExpanded && (
                  <button
                    onClick={() => setShowAddOpportunity(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3 text-primary-400" />
                    Add
                  </button>
                )}
              </div>

              {/* Add Opportunity Form */}
              {opportunitiesExpanded && showAddOpportunity && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Create New Opportunity</h5>
                  
                  <div className="space-y-3">
                    {/* Opportunity Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newOpportunity.name}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Opportunity name"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>


                    {/* Pipeline */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Pipeline *
                      </label>
                      <select
                        value={newOpportunity.pipelineId}
                        onChange={(e) => {
                          const selectedPipeline = pipelines.find(p => p.id === e.target.value);
                          setNewOpportunity(prev => ({
                            ...prev,
                            pipelineId: e.target.value,
                            stageId: selectedPipeline?.stages?.[0]?.id || ''
                          }));
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Pipeline</option>
                        {pipelines.map(pipeline => (
                          <option key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Stage *
                      </label>
                      <select
                        value={newOpportunity.stageId}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, stageId: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!newOpportunity.pipelineId}
                      >
                        <option value="">Select Stage</option>
                        {pipelines.find(p => p.id === newOpportunity.pipelineId)?.stages?.map(stage => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newOpportunity.priority}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Expected Close Date */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Expected Close
                      </label>
                      <input
                        type="date"
                        value={newOpportunity.expectedCloseDate}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newOpportunity.description}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description"
                        rows={2}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleCreateOpportunity}
                        disabled={!newOpportunity.name.trim() || !newOpportunity.pipelineId || !newOpportunity.stageId}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowAddOpportunity(false)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Opportunities List */}
              {opportunitiesExpanded && (
                <div className="space-y-2">
                  {opportunitiesLoading ? (
                    <div className="text-center py-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Loading...</p>
                    </div>
                  ) : opportunities.length === 0 ? (
                    <div className="text-center py-4">
                      <Target className="h-6 w-6 text-primary-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-1">No opportunities</p>
                      <p className="text-xs text-gray-400">Create one to track this lead</p>
                    </div>
                  ) : (
                    <>
                      {/* Show max 3 opportunities with scrollable container for excess */}
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {opportunities.slice(0, 3).map((opportunity) => {
                          const pipeline = pipelines.find(p => p.id === opportunity.pipelineId);
                          const stage = pipeline?.stages?.find(s => s.id === opportunity.stageId);
                          
                          return (
                            <div key={opportunity.id} className="bg-white border border-gray-200 rounded p-2">
                              <div className="flex items-start justify-between mb-1">
                                <h6 className="font-medium text-gray-900 text-xs truncate">{opportunity.name}</h6>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${ 
                                  opportunity.priority === 'high' ? 'bg-red-500' :
                                  opportunity.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}>
                                  {opportunity.priority?.[0]?.toUpperCase() || 'L'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3 text-primary-400" />
                                  <span className="truncate">{stage?.name || 'Unknown'}</span>
                                </div>
                              </div>

                              {opportunity.expectedCloseDate && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 text-primary-400" />
                                  <span>{new Date(opportunity.expectedCloseDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              
                              {opportunity.description && (
                                <p className="text-xs text-gray-600 mt-1 truncate">{opportunity.description}</p>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Show remaining opportunities if more than 3 */}
                        {opportunities.length > 3 && (
                          <div className="space-y-2">
                            {opportunities.slice(3).map((opportunity) => {
                              const pipeline = pipelines.find(p => p.id === opportunity.pipelineId);
                              const stage = pipeline?.stages?.find(s => s.id === opportunity.stageId);
                              
                              return (
                                <div key={opportunity.id} className="bg-white border border-gray-200 rounded p-2">
                                  <div className="flex items-start justify-between mb-1">
                                    <h6 className="font-medium text-gray-900 text-xs truncate">{opportunity.name}</h6>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${ 
                                      opportunity.priority === 'high' ? 'bg-red-500' :
                                      opportunity.priority === 'medium' ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}>
                                      {opportunity.priority?.[0]?.toUpperCase() || 'L'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                                    <div className="flex items-center gap-1">
                                      <Target className="h-3 w-3 text-primary-400" />
                                      <span className="truncate">{stage?.name || 'Unknown'}</span>
                                    </div>
                                  </div>

                                  {opportunity.expectedCloseDate && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="h-3 w-3 text-primary-400" />
                                      <span>{new Date(opportunity.expectedCloseDate).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                  
                                  {opportunity.description && (
                                    <p className="text-xs text-gray-600 mt-1 truncate">{opportunity.description}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User Notes Section */}
            <div className="mb-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  {notesExpanded ? (
                    <ChevronDown className="h-4 w-4 text-primary-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary-400" />
                  )}
                  <h4 className="font-medium text-gray-900">Notes</h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {userNotes.length}
                  </span>
                </button>
                {notesExpanded && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3 text-primary-400" />
                    Add
                  </button>
                )}
              </div>

              {/* Add Note Form - Compact */}
              {notesExpanded && showAddNote && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateUserNote}
                        disabled={!newNoteContent.trim()}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddNote(false);
                          setNewNoteContent('');
                        }}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List - Compact */}
              {notesExpanded && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {notesLoading ? (
                    <div className="text-center py-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-1"></div>
                      <p className="text-xs text-gray-500">Loading...</p>
                    </div>
                  ) : userNotes.length === 0 ? (
                    <div className="text-center py-4">
                      <MessageSquare className="h-6 w-6 text-primary-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">No notes yet</p>
                    </div>
                  ) : (
                    <>
                      {/* Show only first 3 notes in compact view */}
                      {userNotes.slice(0, 3).map((note) => (
                        <div 
                          key={note.id} 
                          className="bg-white border border-gray-200 rounded p-2 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                          onClick={() => setShowComprehensiveModal(true)}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-1">
                              {renderNoteAvatar(note, 'w-4 h-4')}
                              <span className="text-xs font-medium text-gray-900 truncate">{note.authorName}</span>
                              <span className="text-xs text-gray-400">{formatNoteTimestamp(note.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                  setShowComprehensiveModal(true);
                                }}
                                className="p-0.5 text-gray-400 hover:text-blue-600 rounded"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3 text-primary-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteUserNote(note.id)}
                                className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3 text-primary-400" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-2">{note.content}</p>
                          
                          {/* Click indicator */}
                          <div className="mt-1 text-xs text-blue-600 opacity-75">
                            Click to view all notes
                          </div>
                        </div>
                      ))}
                      
                      {/* Show "View all" link if there are more than 3 notes */}
                      {userNotes.length > 3 && (
                        <button 
                          onClick={() => setShowComprehensiveModal(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 w-full text-center py-1 hover:bg-blue-50 rounded transition-colors"
                        >
                          View all {userNotes.length} notes
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Select a contact to view details</p>
          </div>
        )}
        </div>
      </div>
      
      {/* All Notes Modal - Compact Version */}
      {/* Comprehensive Contact Modal - AI Profile + User Notes */}
      {showComprehensiveModal && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowComprehensiveModal(false)}>
          <div className="bg-white rounded-lg max-w-6xl w-full mx-8 max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-primary-400" />
                <h2 className="text-xl font-semibold text-gray-900">Contact Details: {selectedContact?.name}</h2>
              </div>
              <button
                onClick={() => setShowComprehensiveModal(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-primary-400 rotate-45" />
              </button>
            </div>

            {/* Modal Content - 2 Column Layout */}
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 p-6 h-full overflow-y-auto">
                {/* Left Column - AI Profile */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 sticky top-0 bg-white pb-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">AI-Generated Profile</h3>
                    {aiProfile && (
                      <span className="text-xs text-gray-500 bg-purple-50 px-2 py-1 rounded-full ml-auto">
                        Updated {contactProfileService.formatTimestamp(aiProfile.updatedAt)}
                      </span>
                    )}
                    {aiProfile && !editingProfile && (
                      <button
                        onClick={handleEditProfile}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 ml-2"
                      >
                        <Edit2 className="h-4 w-4 text-primary-400" />
                        Edit
                      </button>
                    )}
                  </div>

                  {!aiProfile || !aiProfile.data.text ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-gray-500 font-medium mb-1">No AI profile yet</p>
                      <p className="text-sm text-gray-400">Profile will be automatically generated from conversations</p>
                    </div>
                  ) : editingProfile ? (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                      <textarea
                        value={editedProfileText}
                        onChange={(e) => setEditedProfileText(e.target.value)}
                        className="w-full h-96 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSaveProfile}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelProfileEdit}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 max-h-[60vh] overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="my-2" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                            ul: ({node, ...props}) => <ul className="my-2 ml-4 list-disc" {...props} />,
                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold my-3" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-base font-semibold my-2" {...props} />,
                          }}
                        >
                          {aiProfile.data.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - User Notes */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 sticky top-0 bg-white pb-3 border-b">
                    <MessageSquare className="h-5 w-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-gray-900">User Notes</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-auto">
                      {userNotes.length} notes
                    </span>
                    <button
                      onClick={() => setShowAddNote(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-2"
                    >
                      <Plus className="h-4 w-4 text-primary-400" />
                      Add Note
                    </button>
                  </div>

                  {/* Add Note Form - Inside Modal */}
                  {showAddNote && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Add User Note</h4>
                      <div className="space-y-3">
                        <textarea
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          placeholder="Add a note..."
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateUserNote}
                            disabled={!newNoteContent.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                          >
                            Add Note
                          </button>
                          <button
                            onClick={() => {
                              setShowAddNote(false);
                              setNewNoteContent('');
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {userNotes.length === 0 && !showAddNote ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-primary-400 mb-3" />
                      <p className="text-gray-500 font-medium mb-1">No notes yet</p>
                      <p className="text-sm text-gray-400">Add notes to track important information</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userNotes.map((note) => (
                        <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors shadow-sm">
                          {/* Note Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {renderNoteAvatar(note, 'w-8 h-8')}
                              <div>
                                <p className="font-medium text-gray-900">{note.authorName}</p>
                                <p className="text-sm text-gray-500">
                                  {formatNoteTimestamp(note.createdAt)}
                                  {note.isEdited && <span className="ml-1">(edited)</span>}
                                </p>
                              </div>
                            </div>

                            {/* Only show edit/delete for current user's notes */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Edit note"
                              >
                                <Edit2 className="h-4 w-4 text-primary-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteUserNote(note.id)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Delete note"
                              >
                                <Trash2 className="h-4 w-4 text-primary-400" />
                              </button>
                            </div>
                          </div>

                          {/* Note Content */}
                          {editingNoteId === note.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditUserNote(note.id)}
                                  disabled={!editingNoteContent.trim()}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteContent('');
                                  }}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              title="Click to edit this note"
                            >
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tags Modal */}
      {selectedContact && (
        <TagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          contactId={selectedContact.id}
          contactName={selectedContact.name}
          currentTags={selectedContact.tags || []}
          onTagsUpdated={refreshContacts}
        />
      )}

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