'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, User, Cog } from 'lucide-react';
import { useContactManagement } from '@/hooks/useContactManagement';
import { useAuth } from '@/contexts/AuthContext';

interface Pipeline {
  id: string;
  name: string;
  stages?: PipelineStage[];
}

interface PipelineStage {
  id: string;
  name: string;
  order?: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  initials: string;
  avatarColor: string;
}

interface OpportunityFormData {
  name: string;
  source: string;
  value: number | '';
  pipelineId: string;
  stageId: string;
  description?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  expectedCloseDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface AddOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (opportunityData: OpportunityFormData) => Promise<void>;
  pipelines: Pipeline[];
}

export default function AddOpportunityModal({ 
  isOpen, 
  onClose, 
  onSave, 
  pipelines 
}: AddOpportunityModalProps) {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'contact'>('details');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get contacts for selection
  const { contacts, loading: contactsLoading } = useContactManagement(tenant?.id || '');

  // Form data
  const [formData, setFormData] = useState<OpportunityFormData>({
    name: '',
    source: 'Website',
    value: '',
    pipelineId: '',
    stageId: '',
    description: '',
    contactId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    expectedCloseDate: '',
    priority: 'medium',
    tags: []
  });

  // Set default pipeline when pipelines are loaded
  useEffect(() => {
    if (pipelines.length > 0 && !formData.pipelineId) {
      const firstPipeline = pipelines[0];
      setFormData(prev => ({
        ...prev,
        pipelineId: firstPipeline.id,
        stageId: firstPipeline.stages?.[0]?.id || ''
      }));
    }
  }, [pipelines, formData.pipelineId]);

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    contact.phone.includes(contactSearchTerm) ||
    contact.email.toLowerCase().includes(contactSearchTerm.toLowerCase())
  ).slice(0, 10); // Limit to 10 results

  // Get selected pipeline and its stages
  const selectedPipeline = pipelines.find(p => p.id === formData.pipelineId);
  const availableStages = selectedPipeline?.stages || [];

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData(prev => ({
      ...prev,
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone
    }));
    setShowContactDropdown(false);
    setContactSearchTerm('');
  };

  // Clear selected contact
  const clearSelectedContact = () => {
    setSelectedContact(null);
    setFormData(prev => ({
      ...prev,
      contactId: '',
      contactName: '',
      contactEmail: '',
      contactPhone: ''
    }));
  };

  // Handle pipeline change
  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    setFormData(prev => ({
      ...prev,
      pipelineId,
      stageId: pipeline?.stages?.[0]?.id || ''
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.name || !formData.pipelineId || !formData.stageId) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        value: Number(formData.value)
      });
      
      // Reset form
      setFormData({
        name: '',
        source: 'Website',
        value: '',
        pipelineId: pipelines[0]?.id || '',
        stageId: pipelines[0]?.stages?.[0]?.id || '',
        description: '',
        contactId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        expectedCloseDate: '',
        priority: 'medium',
        tags: []
      });
      setSelectedContact(null);
      setActiveTab('details');
      onClose();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      alert('Failed to create opportunity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add new opportunity</h2>
            <p className="text-sm text-gray-500 mt-1">Create new opportunity by filling in details and selecting a contact</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tab Navigation */}
          <div className="w-64 border-r border-gray-200 bg-gray-50">
            <div className="p-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'details'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Opportunity Details
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Contact Details Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact details</h3>
                  
                  {/* Primary Contact Name */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Contact Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowContactDropdown(!showContactDropdown)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <span className="text-gray-500">
                            {selectedContact ? selectedContact.name : 'Select Contact'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>

                        {/* Contact Dropdown */}
                        {showContactDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {/* Search Input */}
                            <div className="p-2 border-b border-gray-200">
                              <input
                                type="text"
                                placeholder="Search contacts..."
                                value={contactSearchTerm}
                                onChange={(e) => setContactSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            {/* Contact List */}
                            <div className="max-h-48 overflow-y-auto">
                              {contactsLoading ? (
                                <div className="p-4 text-center text-gray-500">Loading contacts...</div>
                              ) : filteredContacts.length > 0 ? (
                                filteredContacts.map((contact) => (
                                  <button
                                    key={contact.id}
                                    onClick={() => handleContactSelect(contact)}
                                    className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${contact.avatarColor}`}>
                                      {contact.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">{contact.name}</div>
                                      <div className="text-xs text-gray-500 truncate">{contact.phone}</div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-gray-500">No contacts found</div>
                              )}
                            </div>

                            {/* Manual Entry Option */}
                            <div className="p-2 border-t border-gray-200">
                              <button
                                onClick={() => {
                                  clearSelectedContact();
                                  setShowContactDropdown(false);
                                }}
                                className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                              >
                                Enter contact details manually
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Email</label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="Enter Email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Primary Phone */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="Phone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Opportunity Details Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Opportunity Details</h3>
                  
                  {/* Opportunity Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opportunity Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter opportunity name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Source and Value */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Source
                      </label>
                      <select
                        value={formData.source}
                        onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Website">Website</option>
                        <option value="Referral">Referral</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Email Campaign">Email Campaign</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Value
                      </label>
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value === '' ? '' : (isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)) }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Pipeline and Stage */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline</label>
                      <select
                        value={formData.pipelineId}
                        onChange={(e) => handlePipelineChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {pipelines.map(pipeline => (
                          <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
                      <select
                        value={formData.stageId}
                        onChange={(e) => setFormData(prev => ({ ...prev, stageId: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {availableStages.map(stage => (
                          <option key={stage.id} value={stage.id}>{stage.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add opportunity description..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Priority and Expected Close Date */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expected Close Date</label>
                      <input
                        type="date"
                        value={formData.expectedCloseDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Add/Manage Fields */}
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <Cog className="h-4 w-4" />
                  Add/Manage Fields
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-white rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name || !formData.pipelineId || !formData.stageId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}