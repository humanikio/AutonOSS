'use client';

import { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Tag, Save } from 'lucide-react';

interface TrainingAsset {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'policy' | 'procedure' | 'guide' | 'script' | 'reference';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: string;
}

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Omit<TrainingAsset, 'id' | 'createdAt' | 'updatedAt' | 'author'>) => void;
  asset?: TrainingAsset | null;
}

const ASSET_TYPE_TEMPLATES = {
  policy: {
    title: 'Company Policy',
    example: 'e.g., Refund Policy, Privacy Policy, Code of Conduct',
    template: `## Policy Overview
[Brief description of what this policy covers]

## Scope
[Who this applies to and when]

## Policy Statement
[Clear policy guidelines]

## Procedures
1. [Step-by-step instructions]
2. [Implementation details]
3. [Compliance requirements]

## Exceptions
[Any special circumstances]

## Related Policies
[Links to related policies]

## Contact Information
[Who to contact for questions]`
  },
  procedure: {
    title: 'Standard Procedure',
    example: 'e.g., Customer Onboarding, Account Setup, Escalation Process',
    template: `## Procedure Overview
[What this procedure accomplishes]

## When to Use
[Circumstances requiring this procedure]

## Prerequisites
[What needs to be ready before starting]

## Step-by-Step Instructions
1. [First step with details]
2. [Second step with details]
3. [Continue with all steps]

## Quality Checks
[How to verify completion]

## Troubleshooting
[Common issues and solutions]

## Tools Required
[Systems, forms, or resources needed]`
  },
  guide: {
    title: 'Reference Guide',
    example: 'e.g., Product Features, System Navigation, Best Practices',
    template: `## Guide Purpose
[What this guide helps with]

## Key Information
[Essential facts and details]

## Quick Reference
- [Important point 1]
- [Important point 2]
- [Important point 3]

## Detailed Explanations
### Section 1
[Detailed information]

### Section 2
[More detailed information]

## Examples
[Real-world scenarios and examples]

## Additional Resources
[Links to more information]`
  },
  script: {
    title: 'Conversation Script',
    example: 'e.g., Welcome Script, Complaint Handling, Sales Pitch',
    template: `## Script Purpose
[When and why to use this script]

## Opening
"[Standard greeting and introduction]"

## Discovery Questions
1. "[Question to understand situation]"
2. "[Follow-up question]"
3. "[Clarifying question]"

## Key Messages
- [Important point to communicate]
- [Value proposition or benefit]
- [Call to action]

## Handling Objections
**Objection:** "[Common objection]"
**Response:** "[Suggested response]"

## Closing
"[Summary and next steps]"

## Notes
- [Tone and style guidance]
- [Things to avoid]
- [Personalization tips]`
  },
  reference: {
    title: 'Quick Reference',
    example: 'e.g., Contact Directory, Pricing Sheet, FAQ',
    template: `## Quick Reference: [Topic]

### Key Information
| Item | Details |
|------|---------|
| [Field 1] | [Value 1] |
| [Field 2] | [Value 2] |
| [Field 3] | [Value 3] |

### Common Questions
**Q:** [Frequently asked question]
**A:** [Clear answer]

**Q:** [Another common question]
**A:** [Clear answer]

### Contact Information
- [Department/Role]: [Contact details]
- [Emergency contact]: [Details]

### Important Notes
- [Critical information]
- [Special considerations]
- [Update schedule]`
  }
};

export default function AssetModal({ isOpen, onClose, onSave, asset }: AssetModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    type: 'guide' as 'policy' | 'procedure' | 'guide' | 'script' | 'reference',
    tags: [] as string[]
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (asset) {
      setFormData({
        title: asset.title,
        description: asset.description,
        content: asset.content,
        type: asset.type,
        tags: asset.tags
      });
    } else {
      setFormData({
        title: '',
        description: '',
        content: ASSET_TYPE_TEMPLATES.guide.template,
        type: 'guide',
        tags: []
      });
    }
  }, [asset]);

  const handleTypeChange = (newType: 'policy' | 'procedure' | 'guide' | 'script' | 'reference') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      content: prev.content === ASSET_TYPE_TEMPLATES[prev.type].template 
        ? ASSET_TYPE_TEMPLATES[newType].template 
        : prev.content
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      content: ASSET_TYPE_TEMPLATES.guide.template,
      type: 'guide',
      tags: []
    });
    setTagInput('');
    setErrors({});
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const currentTemplate = ASSET_TYPE_TEMPLATES[formData.type];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {asset ? 'Edit' : 'Create'} Training Asset
              </h2>
              <p className="text-sm text-gray-500">
                {asset ? 'Update' : 'Add'} a reference document for your agents
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
            {/* Document Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Document Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(ASSET_TYPE_TEMPLATES).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type as any)}
                    className={`p-3 text-sm rounded-lg border-2 transition-colors ${
                      formData.type === type
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {config.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={currentTemplate.example}
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  setErrors(prev => ({ ...prev, title: '' }));
                }}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of when and how to use this document"
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                  setErrors(prev => ({ ...prev, description: '' }));
                }}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add tags to categorize this document"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Tag className="h-4 w-4" />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content *
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none ${
                  errors.content ? 'border-red-300' : 'border-gray-300'
                }`}
                rows={16}
                placeholder="Document content will appear here..."
                value={formData.content}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, content: e.target.value }));
                  setErrors(prev => ({ ...prev, content: '' }));
                }}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.content}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Use Markdown formatting for better organization and readability
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
              {asset ? 'Update' : 'Create'} Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}