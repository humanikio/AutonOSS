'use client';

import { useState, useEffect } from 'react';
import { CallAgentRequest } from '@/types';

interface StepBasicInfoProps {
  data: Partial<CallAgentRequest>;
  onUpdate: (data: Partial<CallAgentRequest>) => void;
}

export default function StepBasicInfo({ data, onUpdate }: StepBasicInfoProps) {
  const [formData, setFormData] = useState({
    name: data.name || '',
    description: data.description || '',
    purpose: data.purpose || 'sales' as const,
    businessGoals: data.businessGoals || '',
    targetAudience: data.targetAudience || '',
    keyChallenges: data.keyChallenges || '',
    successMetrics: data.successMetrics || '',
    conversationStyle: data.conversationStyle || 'professional' as const,
    industryContext: data.industryContext || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    validateAndUpdate();
  }, [formData]);

  const validateAndUpdate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Agent name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    // Enhanced validation for better AI prompt generation
    if (formData.businessGoals && formData.businessGoals.length > 0 && formData.businessGoals.length < 10) {
      newErrors.businessGoals = 'Please provide more detailed business goals (at least 10 characters)';
    }

    if (formData.targetAudience && formData.targetAudience.length > 0 && formData.targetAudience.length < 5) {
      newErrors.targetAudience = 'Please provide more detail about your target audience';
    }

    setErrors(newErrors);

    // Only update parent if all fields are valid
    if (Object.keys(newErrors).length === 0) {
      onUpdate(formData);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const purposeOptions = [
    { 
      value: 'sales', 
      label: 'Sales', 
      description: 'Convert leads and close deals' 
    },
    { 
      value: 'support', 
      label: 'Customer Support', 
      description: 'Help customers with questions and issues' 
    },
    { 
      value: 'appointment', 
      label: 'Appointment Booking', 
      description: 'Schedule meetings and manage calendars' 
    },
    { 
      value: 'information', 
      label: 'Information Gathering', 
      description: 'Collect data and qualify prospects' 
    },
    { 
      value: 'custom', 
      label: 'Custom Purpose', 
      description: 'Define your own specific use case' 
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Let's start with the basics
        </h3>
        <p className="text-gray-600 mb-6">
          Give your agent a name and tell us what it's designed to do.
        </p>
      </div>

      <div className="space-y-6">
        {/* Agent Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Sales Assistant, Support Bot, Appointment Setter"
            className={`input ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Choose a clear, descriptive name for your agent
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe what your agent does and how it helps customers..."
            rows={4}
            className={`input min-h-[100px] ${errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            This helps train your agent and provides context for conversations
          </p>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Primary Purpose
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {purposeOptions.map((option) => (
              <div
                key={option.value}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  formData.purpose === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateField('purpose', option.value)}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="purpose"
                    value={option.value}
                    checked={formData.purpose === option.value}
                    onChange={() => updateField('purpose', option.value)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">
                    {option.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Context Fields */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-3">🚀 AI-Powered Prompt Generation</h4>
          <p className="text-sm text-purple-800 mb-4">
            Provide additional context below to generate more effective, personalized conversation prompts using AI.
          </p>
          
          <div className="space-y-4">
            {/* Business Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Goals (Optional)
              </label>
              <textarea
                value={formData.businessGoals}
                onChange={(e) => updateField('businessGoals', e.target.value)}
                placeholder="What do you want this agent to achieve? e.g., 'Increase lead qualification by 25% and reduce unqualified appointments'..."
                rows={2}
                className={`input min-h-[60px] text-sm ${errors.businessGoals ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.businessGoals && (
                <p className="mt-1 text-sm text-red-600">{errors.businessGoals}</p>
              )}
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => updateField('targetAudience', e.target.value)}
                placeholder="Who calls this agent? e.g., 'Small business owners looking for marketing solutions'..."
                className={`input text-sm ${errors.targetAudience ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.targetAudience && (
                <p className="mt-1 text-sm text-red-600">{errors.targetAudience}</p>
              )}
            </div>

            {/* Conversation Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation Style (Optional)
              </label>
              <select
                value={formData.conversationStyle}
                onChange={(e) => updateField('conversationStyle', e.target.value)}
                className="input text-sm"
              >
                <option value="professional">Professional - Formal, business-focused tone</option>
                <option value="friendly">Friendly - Warm, approachable, and personable</option>
                <option value="consultative">Consultative - Advisory, expert-guidance focused</option>
                <option value="enthusiastic">Enthusiastic - High-energy, positive, motivational</option>
                <option value="empathetic">Empathetic - Understanding, supportive, caring</option>
              </select>
            </div>

            {/* Collapsible Advanced Fields */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-purple-700 hover:text-purple-900">
                <span className="group-open:hidden">▶️ Show Advanced Options</span>
                <span className="hidden group-open:inline">▼ Hide Advanced Options</span>
              </summary>
              
              <div className="mt-3 space-y-4 border-t border-purple-100 pt-4">
                {/* Key Challenges */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Challenges
                  </label>
                  <textarea
                    value={formData.keyChallenges}
                    onChange={(e) => updateField('keyChallenges', e.target.value)}
                    placeholder="What challenges does this agent need to overcome? e.g., 'Customers often hang up quickly, need to build trust fast'..."
                    rows={2}
                    className="input min-h-[60px] text-sm"
                  />
                </div>

                {/* Success Metrics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Success Metrics
                  </label>
                  <input
                    type="text"
                    value={formData.successMetrics}
                    onChange={(e) => updateField('successMetrics', e.target.value)}
                    placeholder="How do you measure success? e.g., 'Appointment booking rate, call duration, customer satisfaction'..."
                    className="input text-sm"
                  />
                </div>

                {/* Industry Context */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry Context
                  </label>
                  <input
                    type="text"
                    value={formData.industryContext}
                    onChange={(e) => updateField('industryContext', e.target.value)}
                    placeholder="What industry are you in? e.g., 'Real estate', 'SaaS technology', 'Healthcare'..."
                    className="input text-sm"
                  />
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Success</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Choose a name that reflects the agent's role and personality</li>
            <li>• Write a detailed description - this helps the AI understand its purpose</li>
            <li>• Select the purpose that best matches your business goals</li>
            <li>• More context = better AI-generated prompts and conversation flows</li>
            <li>• You can always modify these settings later</li>
          </ul>
        </div>
      </div>
    </div>
  );
}