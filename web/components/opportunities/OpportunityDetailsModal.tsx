'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useContactManagement } from '@/hooks/useContactManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Opportunity, UpdateOpportunityRequest } from '../../services/opportunityService';

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


interface OpportunityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (opportunityId: string, updateData: UpdateOpportunityRequest) => Promise<void>;
  onDelete: (opportunityId: string) => Promise<void>;
  opportunity: Opportunity | null;
  pipelines: Pipeline[];
}

type TabType = 'details';

export default function OpportunityDetailsModal({
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  opportunity,
  pipelines
}: OpportunityDetailsModalProps) {
  const { tenant } = useAuth();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<UpdateOpportunityRequest>({});


  // Form data state
  const [formData, setFormData] = useState<UpdateOpportunityRequest>({
    name: '',
    source: '',
    value: 0,
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

  // Load opportunity data when modal opens or opportunity changes
  useEffect(() => {
    if (isOpen && opportunity) {
      const initialData = {
        name: opportunity.name,
        source: opportunity.source,
        value: opportunity.value,
        pipelineId: opportunity.pipelineId,
        stageId: opportunity.stageId,
        description: opportunity.description || '',
        contactId: opportunity.contactId || '',
        contactName: opportunity.contactName || '',
        contactEmail: opportunity.contactEmail || '',
        contactPhone: opportunity.contactPhone || '',
        expectedCloseDate: opportunity.expectedCloseDate || '',
        priority: opportunity.priority || 'medium',
        tags: opportunity.tags || []
      };
      
      setFormData(initialData);
      setOriginalFormData(initialData);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, opportunity]);

  // Get selected pipeline and its stages
  const selectedPipeline = pipelines.find(p => p.id === formData.pipelineId);
  const availableStages = selectedPipeline?.stages || [];

  // Check if form data has changed from original
  const checkForChanges = (newData: UpdateOpportunityRequest) => {
    const hasChanges = JSON.stringify(newData) !== JSON.stringify(originalFormData);
    setHasUnsavedChanges(hasChanges);
  };

  // Handle form field changes
  const handleFormChange = (field: keyof UpdateOpportunityRequest, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    checkForChanges(newFormData);
  };

  // Handle pipeline change
  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const newFormData = {
      ...formData,
      pipelineId,
      stageId: pipeline?.stages?.[0]?.id || formData.stageId
    };
    setFormData(newFormData);
    checkForChanges(newFormData);
  };

  // Handle save
  const handleSave = async () => {
    if (!opportunity) return;

    console.log('🔄 Saving opportunity with data:', formData);
    setSaving(true);
    try {
      await onUpdate(opportunity.id, formData);
      console.log('✅ Opportunity updated successfully');
      
      // Update the original data to match current data
      setOriginalFormData(formData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('❌ Error updating opportunity:', error);
      alert('Failed to update opportunity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!opportunity) return;

    setIsDeleting(true);
    try {
      await onDelete(opportunity.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      alert('Failed to delete opportunity. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSaving && !isDeleting) {
      if (hasUnsavedChanges) {
        const confirmClose = confirm('You have unsaved changes. Are you sure you want to close?');
        if (!confirmClose) return;
      }
      
      setShowDeleteConfirm(false);
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  if (!isOpen || !opportunity) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit &quot;{opportunity.name}&quot;
              {hasUnsavedChanges && <span className="text-orange-600">• Unsaved changes</span>}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add and edit opportunity details, tasks, notes and appointments.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSaving || isDeleting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
                {/* Contact Details Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Contact details</h3>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="hideEmpty" className="rounded border-gray-300" />
                      <label htmlFor="hideEmpty" className="text-sm text-gray-600">Hide Empty Fields</label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Contact Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contactName}
                        onChange={(e) => handleFormChange('contactName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Email</label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => handleFormChange('contactEmail', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone</label>
                      <input
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) => handleFormChange('contactPhone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Opportunity Details Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Opportunity Details</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opportunity Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline</label>
                      <select
                        value={formData.pipelineId}
                        onChange={(e) => handlePipelineChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
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
                        onChange={(e) => handleFormChange('stageId', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                        {availableStages.map(stage => (
                          <option key={stage.id} value={stage.id}>{stage.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                      <select
                        value={formData.source}
                        onChange={(e) => handleFormChange('source', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => handleFormChange('value', Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => handleFormChange('priority', e.target.value as 'low' | 'medium' | 'high')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
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
                        onChange={(e) => handleFormChange('expectedCloseDate', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Audit Information */}
                <div className="pt-6 border-t border-gray-200 text-sm text-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><span className="font-medium">Created By:</span> {opportunity.createdBy}</p>
                      <p><span className="font-medium">Created on:</span> {new Date(opportunity.dateCreated).toLocaleString()}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Last Modified:</span> {new Date(opportunity.lastModified).toLocaleString()}</p>
                      {opportunity.stageHistory && opportunity.stageHistory.length > 0 && (
                        <p><span className="font-medium">Stage History:</span> {opportunity.stageHistory.length} entries</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white rounded-b-xl">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            disabled={isSaving || isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSaving || isDeleting}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.name || !formData.pipelineId || !formData.stageId || !hasUnsavedChanges}
              className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                hasUnsavedChanges && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700 animate-pulse'
                  : 'bg-gray-400 cursor-not-allowed'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  Update
                  {hasUnsavedChanges && !isSaving && (
                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse ml-1"></span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Opportunity</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete &quot;{opportunity.name}&quot;? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}