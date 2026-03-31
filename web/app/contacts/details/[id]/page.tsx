'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useContactManagementCached } from '@/hooks/useContactManagementCached';
import ContactChatInterfaceOptimized from '@/components/chat/ContactChatInterfaceOptimized';
import ContactFieldsEditor from '@/components/contacts/ContactFieldsEditor';
import TagsModal from '@/components/contacts/TagsModal';
import { opportunityService, Opportunity, CreateOpportunityRequest } from '@/services/opportunityService';
import { pipelineService, Pipeline } from '@/services/pipelineService';
import { contactProfileService, ContactProfile } from '@/services/contactProfileService';
import { contactTagsAPI, ContactTag } from '@/lib/api/contactTags';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Edit2,
  Plus,
  Calendar,
  User,
  Target,
  MessageSquare,
  Trash2,
  Sparkles,
  Tag,
  X,
  RefreshCw
} from 'lucide-react';

export default function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const contactId = resolvedParams.id;
  const router = useRouter();
  const { tenant, user, getToken } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: ''
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({
    name: '',
    source: 'Contact',
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
  
  // State for individually fetched contact (when not in loaded contacts)
  const [individualContact, setIndividualContact] = useState<any | null>(null);
  const [loadingIndividual, setLoadingIndividual] = useState(false);

  // Chat refresh trigger - increment this to force chat interface to re-mount and refresh
  const [chatRefreshKey, setChatRefreshKey] = useState(0);

  // Refresh contact state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get all contacts for management (including those without conversations) with caching
  const {
    contacts,
    loading: contactsLoading,
    error,
    refreshContacts,
    refreshSingleContact,
    cacheHit,
    findContactById
  } = useContactManagementCached(tenant?.id || '');

  // Find the selected contact from all contacts - optimized with cache lookup
  // Falls back to individually fetched contact if not in loaded set
  const selectedContact = findContactById(contactId) || contacts.find(contact => contact.id === contactId) || individualContact || null;

  // Lazy load individual contact if not found in loaded contacts
  useEffect(() => {
    const loadIndividualContact = async () => {
      // Only fetch if:
      // 1. We have a contactId
      // 2. Contact is not already found in loaded contacts
      // 3. We haven't already fetched it individually
      // 4. We're not currently fetching
      // 5. Initial contacts have loaded
      const contactFound = findContactById(contactId) || contacts.find(c => c.id === contactId);

      if (contactId && !contactFound && !individualContact && !loadingIndividual && !contactsLoading) {
        try {
          setLoadingIndividual(true);
          console.log(`🔍 Contact not in loaded set, fetching individually: ${contactId}`);

          const contact = await refreshSingleContact(contactId);

          if (contact) {
            setIndividualContact(contact);
            console.log(`✅ Individually fetched contact: ${contact.name}`);
          } else {
            console.log(`❌ Contact not found: ${contactId}`);
          }
        } catch (error) {
          console.error('Error loading individual contact:', error);
        } finally {
          setLoadingIndividual(false);
        }
      }
    };

    loadIndividualContact();
  }, [contactId, contacts, individualContact, loadingIndividual, contactsLoading, findContactById, refreshSingleContact]);

  // Initialize edit values when contact is selected
  useEffect(() => {
    if (selectedContact) {
      const [firstName, lastName] = selectedContact.name.split(' ');
      setEditValues({
        firstName: firstName || '',
        lastName: lastName || '',
        email: selectedContact.email || '',
        phone: selectedContact.phone || '',
        dateOfBirth: ''
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

  // Load opportunities for the contact
  useEffect(() => {
    const loadOpportunities = async () => {
      if (!contactId) return;
      
      try {
        setOpportunitiesLoading(true);
        const contactOpportunities = await opportunityService.getOpportunitiesByContact(contactId);
        setOpportunities(contactOpportunities);
      } catch (error) {
        console.error('Error loading opportunities:', error);
      } finally {
        setOpportunitiesLoading(false);
      }
    };
    
    loadOpportunities();
  }, [contactId]);

  // Load user notes for the contact
  useEffect(() => {
    const loadUserNotes = async () => {
      if (!contactId || !tenant?.id) return;
      
      try {
        setNotesLoading(true);
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/contacts/${contactId}/notes`, {
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
  }, [contactId, tenant?.id, getToken]);

  // Load AI profile for the contact
  useEffect(() => {
    const loadAIProfile = async () => {
      if (!contactId || !tenant?.id) return;

      try {
        setProfileLoading(true);
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const profile = await contactProfileService.getLatestProfile(tenant.id, contactId, token);
        setAiProfile(profile);
      } catch (error) {
        console.error('Error loading AI profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadAIProfile();
  }, [contactId, tenant?.id, getToken]);

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

        // Refresh just this contact instead of all contacts
        const updatedContact = await refreshSingleContact(contactId);
        if (updatedContact && individualContact) {
          // Update individual contact state if this contact was individually loaded
          setIndividualContact(updatedContact);
        }

        // If phone or email was updated, force chat interface to refresh
        if (field === 'phone' || field === 'email') {
          console.log('📱 Phone/email updated, forcing chat refresh');
          setChatRefreshKey(prev => prev + 1);
        }
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
    if (!tenant?.id) throw new Error('No tenant ID');

    const token = await getToken();
    if (!token) throw new Error('No auth token available');

    const updates: Record<string, any> = {};
    updates[fieldName] = value;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/contacts/${contactId}/manage`, {
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

    // Refresh just this contact instead of all contacts
    const updatedContact = await refreshSingleContact(contactId);
    if (updatedContact && individualContact) {
      // Update individual contact state if this contact was individually loaded
      setIndividualContact(updatedContact);
    }

    // If phone or email was updated, force chat interface to refresh
    if (fieldName === 'phoneNumber' || fieldName === 'email') {
      console.log('📱 Phone/email updated, forcing chat refresh');
      setChatRefreshKey(prev => prev + 1);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (selectedContact) {
      const [firstName, lastName] = selectedContact.name.split(' ');
      setEditValues({
        firstName: firstName || '',
        lastName: lastName || '',
        email: selectedContact.email || '',
        phone: selectedContact.phone || '',
        dateOfBirth: ''
      });
    }
    setEditingField(null);
  };

  // Handle contact refresh
  const handleRefreshContact = async () => {
    if (!contactId) return;

    try {
      setIsRefreshing(true);
      console.log(`🔄 Manually refreshing contact: ${contactId}`);

      // Fetch fresh contact data from Firestore
      const freshContact = await refreshSingleContact(contactId);

      if (freshContact) {
        console.log(`✅ Contact refreshed successfully with conversationId: ${freshContact.conversationId || 'none'}`);

        // Update individual contact if needed
        if (individualContact) {
          setIndividualContact(freshContact);
        }

        // Force chat interface to reload with fresh contact data
        setChatRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error refreshing contact:', error);
    } finally {
      setIsRefreshing(false);
    }
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
        source: 'Contact',
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
        // Add new note to the beginning of the list
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
        // Update note in local state
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
        // Remove note from local state
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
    }
  };

  // Handle AI profile save
  const handleSaveProfile = async () => {
    if (!aiProfile || !tenant?.id || !contactId) {
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
        contactId,
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

  // Start editing a note
  const startEditingNote = (noteId: string, currentContent: string) => {
    setEditingNoteId(noteId);
    setEditingNoteContent(currentContent);
  };

  // Cancel editing a note
  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  // Render avatar for user notes - similar to chat message avatars
  const renderNoteAvatar = (note: any, size: string = 'w-6 h-6') => {
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
        <div className={`${size} rounded-full flex items-center justify-center text-white text-xs font-medium bg-gray-600`}>
          {initials}
        </div>
      );
    }
  };

  // Format timestamp for notes
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
      return 'Unknown time';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date from timestamp:', timestamp);
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if ((contactsLoading && !cacheHit) || loadingIndividual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loadingIndividual ? 'Loading contact...' : cacheHit ? 'Loading from cache...' : 'Loading contact details...'}
          </p>
        </div>
      </div>
    );
  }

  if (!selectedContact) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Contact not found</p>
          <button 
            onClick={() => router.push('/contacts')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-64 bg-gray-50 overflow-hidden">
      <div className="flex h-full w-full relative">
        {/* Left Side - Contact Details */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => router.push('/contacts')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">{selectedContact.name}</h1>
              <button
                onClick={handleRefreshContact}
                disabled={isRefreshing}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh contact data"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-sm text-gray-500">
                1 of {contacts.length} selected
              </div>
              <ChevronRight className="h-4 w-4 text-primary-600" />
            </div>
            
          </div>


          {/* AI Profile Section - Above all other content */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setProfileExpanded(!profileExpanded)}
                className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
              >
                {profileExpanded ? (
                  <ChevronDown className="h-4 w-4 text-purple-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-purple-600" />
                )}
                <h3 className="text-sm font-medium text-purple-600">AI Profile</h3>
              </button>
              {profileExpanded && aiProfile && !editingProfile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEditProfile}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowComprehensiveModal(true)}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    View Full Profile
                  </button>
                </div>
              )}
            </div>

            {/* Profile Content */}
            {profileExpanded && (
              <div className="space-y-3">
                {profileLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">Loading AI profile...</p>
                  </div>
                ) : !aiProfile || !aiProfile.data.text ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-1">No AI profile yet</p>
                    <p className="text-xs text-gray-400">Profile will be generated automatically from conversations</p>
                  </div>
                ) : editingProfile ? (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <textarea
                      value={editedProfileText}
                      onChange={(e) => setEditedProfileText(e.target.value)}
                      className="w-full h-64 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleSaveProfile}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelProfileEdit}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                    onClick={() => setShowComprehensiveModal(true)}
                  >
                    {/* Profile Preview with Markdown */}
                    <div className="prose prose-sm max-w-none max-h-32 overflow-y-auto text-sm text-gray-700">
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="my-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                          ul: ({node, ...props}) => <ul className="my-1 ml-4" {...props} />,
                          li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                        }}
                      >
                        {contactProfileService.extractPreview(aiProfile.data.text, 6)}
                      </ReactMarkdown>
                    </div>

                    {/* Click indicator and timestamp */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-purple-600 font-medium">
                        Click to view full profile
                      </span>
                      <span className="text-gray-500">
                        Updated {contactProfileService.formatTimestamp(aiProfile.updatedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* Contact Fields - Dynamic with Groups */}
            {tenant?.id && (
              <ContactFieldsEditor
                contactId={contactId}
                tenantId={tenant.id}
                getToken={getToken}
                onFieldUpdate={handleFieldUpdate}
              />
            )}

            {/* Tags Section */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Tags</h3>
                <button
                  onClick={() => setShowTagsModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Manage Tags
                </button>
              </div>

              {tagsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                </div>
              ) : contactTags.length === 0 ? (
                <div className="text-center py-4 px-3 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <Tag className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No tags assigned</p>
                  <button
                    onClick={() => setShowTagsModal(true)}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                  >
                    Add tags
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contactTags.map((tag) => (
                    <div
                      key={tag.tagId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium group"
                    >
                      <Tag className="h-3 w-3" />
                      {tag.tagName}
                      <button
                        onClick={async () => {
                          try {
                            const token = await getToken();
                            if (!token) return;

                            // Remove tag from contact
                            const updatedTags = selectedContact.tags?.filter((id: string | null | undefined) => id !== tag.tagId) || [];
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                            const response = await fetch(`${apiUrl}/api/contacts/${contactId}/manage`, {
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
                        className="ml-1 hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                        title="Remove tag"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities Section */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setOpportunitiesExpanded(!opportunitiesExpanded)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  {opportunitiesExpanded ? (
                    <ChevronDown className="h-4 w-4 text-primary-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary-600" />
                  )}
                  <h3 className="text-sm font-medium text-primary-600">Opportunities</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {opportunities.length}
                  </span>
                </button>
                {opportunitiesExpanded && (
                  <button
                    onClick={() => setShowAddOpportunity(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Opportunity
                  </button>
                )}
              </div>

              {/* Add Opportunity Form */}
              {opportunitiesExpanded && showAddOpportunity && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Opportunity</h4>
                  
                  <div className="space-y-3">
                    {/* Opportunity Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Opportunity Name *
                      </label>
                      <input
                        type="text"
                        value={newOpportunity.name}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter opportunity name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Value and Pipeline */}
                    <div className="grid grid-cols-2 gap-3">
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Pipeline</option>
                          {pipelines.map(pipeline => (
                            <option key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Stage and Priority */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Stage *
                        </label>
                        <select
                          value={newOpportunity.stageId}
                          onChange={(e) => setNewOpportunity(prev => ({ ...prev, stageId: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={newOpportunity.priority}
                          onChange={(e) => setNewOpportunity(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    {/* Expected Close Date */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Expected Close Date
                      </label>
                      <input
                        type="date"
                        value={newOpportunity.expectedCloseDate}
                        onChange={(e) => setNewOpportunity(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                        placeholder="Enter opportunity description"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleCreateOpportunity}
                        disabled={!newOpportunity.name.trim() || !newOpportunity.pipelineId || !newOpportunity.stageId}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Create Opportunity
                      </button>
                      <button
                        onClick={() => setShowAddOpportunity(false)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Opportunities List */}
              {opportunitiesExpanded && (
                <div className="space-y-3">
                  {opportunitiesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Loading opportunities...</p>
                    </div>
                  ) : opportunities.length === 0 ? (
                    <div className="text-center py-6">
                      <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-1">No opportunities yet</p>
                      <p className="text-xs text-gray-400">Create an opportunity to start tracking this lead</p>
                    </div>
                  ) : (
                    <>
                      {/* Show max 3 opportunities with scrollable container for excess */}
                      <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                        {opportunities.slice(0, 3).map((opportunity) => {
                          const pipeline = pipelines.find(p => p.id === opportunity.pipelineId);
                          const stage = pipeline?.stages?.find(s => s.id === opportunity.stageId);
                          
                          return (
                            <div key={opportunity.id} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 text-sm">{opportunity.name}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  opportunity.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {opportunity.priority}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  <span>{stage?.name || 'Unknown Stage'}</span>
                                </div>
                                {opportunity.expectedCloseDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(opportunity.expectedCloseDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              
                              {opportunity.description && (
                                <p className="text-xs text-gray-600 mt-2">{opportunity.description}</p>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Show remaining opportunities if more than 3 */}
                        {opportunities.length > 3 && (
                          <div className="space-y-3">
                            {opportunities.slice(3).map((opportunity) => {
                              const pipeline = pipelines.find(p => p.id === opportunity.pipelineId);
                              const stage = pipeline?.stages?.find(s => s.id === opportunity.stageId);
                              
                              return (
                                <div key={opportunity.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{opportunity.name}</h4>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      opportunity.priority === 'high' ? 'bg-red-100 text-red-700' :
                                      opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {opportunity.priority}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Target className="h-3 w-3" />
                                      <span>{stage?.name || 'Unknown Stage'}</span>
                                    </div>
                                    {opportunity.expectedCloseDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{new Date(opportunity.expectedCloseDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {opportunity.description && (
                                    <p className="text-xs text-gray-600 mt-2">{opportunity.description}</p>
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
            <div className="mb-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  {notesExpanded ? (
                    <ChevronDown className="h-4 w-4 text-primary-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary-600" />
                  )}
                  <h3 className="text-sm font-medium text-primary-600">User Notes</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {userNotes.length}
                  </span>
                </button>
                {notesExpanded && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Note
                  </button>
                )}
              </div>

              {/* Add Note Form */}
              {notesExpanded && showAddNote && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Add User Note</h4>
                  
                  <div className="space-y-3">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Enter your note..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateUserNote}
                        disabled={!newNoteContent.trim()}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add Note
                      </button>
                      <button
                        onClick={() => {
                          setShowAddNote(false);
                          setNewNoteContent('');
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {notesExpanded && (
                <div className="space-y-3">
                  {notesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Loading notes...</p>
                    </div>
                  ) : userNotes.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-1">No notes yet</p>
                      <p className="text-xs text-gray-400">Add a note to keep track of important information</p>
                    </div>
                  ) : (
                    <>
                      {/* Show only first 3 notes */}
                      {userNotes.slice(0, 3).map((note) => (
                        <div
                          key={note.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all duration-200"
                          onClick={() => setShowComprehensiveModal(true)}
                        >
                          {/* Note Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {renderNoteAvatar(note, 'w-6 h-6')}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{note.authorName}</p>
                                <p className="text-xs text-gray-500">
                                  {formatNoteTimestamp(note.createdAt)}
                                  {note.isEdited && <span className="ml-1">(edited)</span>}
                                </p>
                              </div>
                            </div>
                            
                            {/* Only show edit/delete for current user's notes */}
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  startEditingNote(note.id, note.content);
                                  setShowComprehensiveModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Edit note"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteUserNote(note.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title="Delete note"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Note Content Preview */}
                          <p className="text-sm text-gray-700 line-clamp-2">{note.content}</p>
                          
                          {/* Click indicator */}
                          <div className="mt-2 text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view all notes
                          </div>
                        </div>
                      ))}
                      
                      {/* View all button if more than 3 notes */}
                      {userNotes.length > 3 && (
                        <button
                          onClick={() => setShowComprehensiveModal(true)}
                          className="w-full text-center py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          View all {userNotes.length} notes
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comprehensive Contact Modal - AI Profile + User Notes */}
        {showComprehensiveModal && (
          <div className="fixed inset-y-0 right-0 left-0 lg:left-64 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowComprehensiveModal(false)}>
            <div className="bg-white rounded-lg max-w-6xl w-full mx-8 max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Contact Details: {selectedContact?.name}</h2>
                </div>
                <button
                  onClick={() => setShowComprehensiveModal(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-500 rotate-45" />
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
                          <Edit2 className="h-4 w-4" />
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
                      <MessageSquare className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">User Notes</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-auto">
                        {userNotes.length} notes
                      </span>
                      <button
                        onClick={() => setShowAddNote(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Note
                      </button>
                    </div>

                    {/* Add Note Form - Inside Modal */}
                    {showAddNote && (
                      <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Add User Note</h4>
                        <div className="space-y-3">
                          <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Add a note..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleCreateUserNote}
                              disabled={!newNoteContent.trim()}
                              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
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
                        <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium mb-1">No notes yet</p>
                        <p className="text-sm text-gray-400">Add notes to track important information</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userNotes.map((note) => (
                          <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors shadow-sm">
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
                                  onClick={() => startEditingNote(note.id, note.content)}
                                  className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50 transition-colors"
                                  title="Edit note"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUserNote(note.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditUserNote(note.id)}
                                    disabled={!editingNoteContent.trim()}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors text-sm"
                                  >
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={cancelEditingNote}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="prose prose-sm max-w-none cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                                onClick={() => startEditingNote(note.id, note.content)}
                                title="Click to edit this note"
                              >
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
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

        {/* Right Side - Conversation */}
        <ContactChatInterfaceOptimized
          key={`${contactId}-${chatRefreshKey}`} // Force re-mount when contactId changes OR when contact is updated
          contactId={contactId}
          contact={selectedContact ? {
            id: selectedContact.id,
            name: selectedContact.name,
            email: selectedContact.email,
            phone: selectedContact.phone
          } : null}
        />
      </div>

      {/* Tags Modal */}
      {selectedContact && (
        <TagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          contactId={contactId}
          contactName={selectedContact.name}
          currentTags={selectedContact.tags || []}
          onTagsUpdated={refreshContacts}
        />
      )}
    </div>
  );
}