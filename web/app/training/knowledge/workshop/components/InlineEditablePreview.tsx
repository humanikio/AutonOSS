'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Edit2 } from 'lucide-react';

interface InlineEditablePreviewProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: (content: string) => void; // Optional save callback for persisting to backend
}

export default function InlineEditablePreview({ content, onChange, onSave }: InlineEditablePreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Split content into editable sections (by paragraphs/lines)
  const sections = content.split('\n').filter(line => line.trim() !== '');

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editValue.length, editValue.length);
    }
  }, [editingIndex, editValue]);

  const startEditing = (index: number, currentValue: string) => {
    setEditingIndex(index);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const newSections = [...sections];
    newSections[editingIndex] = editValue;
    
    // Reconstruct content with original spacing
    const newContent = newSections.join('\n\n');
    onChange(newContent);
    setEditingIndex(null);
    setEditValue('');
    
    // Trigger backend save if callback is provided
    if (onSave) {
      // Pass the content directly to avoid race conditions
      onSave(newContent);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const renderSection = (section: string, index: number) => {
    const isEditing = editingIndex === index;

    if (isEditing) {
      return (
        <div key={index} className="relative group mb-4">
          <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[80px] p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your content..."
            />
            <div className="flex items-center justify-end space-x-2 mt-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors"
              >
                <Check className="h-3 w-3" />
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Press Ctrl+Enter to save, Escape to cancel
            </p>
          </div>
        </div>
      );
    }

    // Render the section based on its markdown type
    const renderContent = () => {
      // Headers
      if (section.startsWith('# ')) {
        return (
          <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
            {section.substring(2)}
          </h1>
        );
      } else if (section.startsWith('## ')) {
        return (
          <h2 className="text-2xl font-semibold text-gray-900 mt-6 mb-3">
            {section.substring(3)}
          </h2>
        );
      } else if (section.startsWith('### ')) {
        return (
          <h3 className="text-xl font-medium text-gray-900 mt-5 mb-2">
            {section.substring(4)}
          </h3>
        );
      }
      // Bold text
      else if (section.startsWith('**') && section.endsWith('**') && section.length > 4) {
        return (
          <p className="font-semibold text-gray-900 mb-2">
            {section.substring(2, section.length - 2)}
          </p>
        );
      }
      // List items
      else if (section.startsWith('- ') || section.startsWith('• ')) {
        return (
          <li className="text-gray-700 mb-1 ml-4">
            {section.substring(2)}
          </li>
        );
      }
      // Numbered lists
      else if (/^\d+\. /.test(section)) {
        const match = section.match(/^\d+\. (.+)/);
        if (match) {
          return (
            <li className="text-gray-700 mb-1 ml-4 list-decimal">
              {match[1]}
            </li>
          );
        }
      }
      // Bold inline formatting
      else if (section.includes('**')) {
        const parts = section.split('**');
        const formatted = parts.map((part, partIndex) => 
          partIndex % 2 === 1 ? <strong key={partIndex} className="font-semibold">{part}</strong> : part
        );
        return (
          <p className="text-gray-700 mb-2 leading-relaxed">
            {formatted}
          </p>
        );
      }
      // Regular paragraphs
      else {
        return (
          <p className="text-gray-700 mb-3 leading-relaxed">
            {section}
          </p>
        );
      }
    };

    return (
      <div 
        key={index} 
        className="relative group cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors mb-2"
        onClick={() => startEditing(index, section)}
      >
        {renderContent()}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEditing(index, section);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 text-gray-600 hover:text-gray-800 rounded shadow-sm transition-colors"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="markdown-content">
      {sections.map(renderSection)}
      {sections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No content yet. Click to start editing.</p>
          <button
            onClick={() => {
              const initialContent = '# New Document\n\nStart writing your content here...';
              onChange(initialContent);
              // Trigger backend save for initial content
              if (onSave) {
                onSave(initialContent);
              }
            }}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Content
          </button>
        </div>
      )}
    </div>
  );
}