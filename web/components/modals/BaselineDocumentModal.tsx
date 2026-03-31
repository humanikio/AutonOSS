'use client';

import { useState, useEffect } from 'react';
import { X, Book, Save, AlertCircle, Plus } from 'lucide-react';

interface BaselineDocument {
  companyName: string;
  industry: string;
  mission: string;
  values: string[];
  targetAudience: string;
  businessHours: string;
  supportChannels: string[];
  keyDifferentiators: string;
  lastUpdated?: string;
}

interface BaselineDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: BaselineDocument) => void;
  document: BaselineDocument;
}

export default function BaselineDocumentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  document 
}: BaselineDocumentModalProps) {
  const [formData, setFormData] = useState<BaselineDocument>({
    companyName: '',
    industry: '',
    mission: '',
    values: [],
    targetAudience: '',
    businessHours: '',
    supportChannels: [],
    keyDifferentiators: '',
  });

  const [valueInput, setValueInput] = useState('');
  const [channelInput, setChannelInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (document) {
      setFormData(document);
    }
  }, [document]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
    if (!formData.mission.trim()) newErrors.mission = 'Mission statement is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave(formData);
  };

  const handleClose = () => {
    setErrors({});
    setValueInput('');
    setChannelInput('');
    onClose();
  };

  const addValue = () => {
    if (valueInput.trim() && !formData.values.includes(valueInput.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        values: [...prev.values, valueInput.trim()] 
      }));
      setValueInput('');
    }
  };

  const removeValue = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      values: prev.values.filter(v => v !== value) 
    }));
  };

  const addChannel = () => {
    if (channelInput.trim() && !formData.supportChannels.includes(channelInput.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        supportChannels: [...prev.supportChannels, channelInput.trim()] 
      }));
      setChannelInput('');
    }
  };

  const removeChannel = (channel: string) => {
    setFormData(prev => ({ 
      ...prev, 
      supportChannels: prev.supportChannels.filter(c => c !== channel) 
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Book className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Company Baseline Document
              </h2>
              <p className="text-sm text-gray-500">
                Core information accessible to all your agents
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 p-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.companyName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Your company name"
                value={formData.companyName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, companyName: e.target.value }));
                  setErrors(prev => ({ ...prev, companyName: '' }));
                }}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.industry ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Technology, Healthcare, Finance"
                value={formData.industry}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, industry: e.target.value }));
                  setErrors(prev => ({ ...prev, industry: '' }));
                }}
              />
              {errors.industry && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.industry}
                </p>
              )}
            </div>

            {/* Mission Statement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mission Statement *
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                  errors.mission ? 'border-red-300' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="What drives your company forward? What problem do you solve?"
                value={formData.mission}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, mission: e.target.value }));
                  setErrors(prev => ({ ...prev, mission: '' }));
                }}
              />
              {errors.mission && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.mission}
                </p>
              )}
            </div>

            {/* Company Values */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Core Values
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add a core value"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addValue}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {formData.values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.values.map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => removeValue(value)}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Values that guide how agents should make decisions and interact with customers
              </p>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., B2B enterprises, consumers, small businesses"
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Who your company primarily serves
              </p>
            </div>

            {/* Business Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Hours
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Mon-Fri 9AM-6PM EST"
                value={formData.businessHours}
                onChange={(e) => setFormData(prev => ({ ...prev, businessHours: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                When customers can expect support or contact
              </p>
            </div>

            {/* Support Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support Channels
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add a support channel"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChannel();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addChannel}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {formData.supportChannels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.supportChannels.map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {channel}
                      <button
                        type="button"
                        onClick={() => removeChannel(channel)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                How customers can reach your company for support
              </p>
            </div>

            {/* Key Differentiators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Differentiators
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="What makes your company unique? Why do customers choose you over competitors?"
                value={formData.keyDifferentiators}
                onChange={(e) => setFormData(prev => ({ ...prev, keyDifferentiators: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Unique selling points agents should emphasize
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Baseline Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}