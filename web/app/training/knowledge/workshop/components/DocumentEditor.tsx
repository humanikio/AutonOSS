'use client';

import { useRef } from 'react';
import { Copy } from 'lucide-react';
import InlineEditablePreview from './InlineEditablePreview';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: (content: string) => void;
  isMinimized: boolean;
}

export default function DocumentEditor({
  content,
  onChange,
  onSave,
  isMinimized
}: DocumentEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const handleCopyContent = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
    } else {
      // Fallback for older browsers
      editorRef.current?.select();
      document.execCommand('copy');
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col transition-all duration-300" 
      style={{ 
        marginLeft: isMinimized ? '4rem' : '24rem',
        height: 'calc(100vh - 5rem)'
      }}
    >
      <div className="flex-1 flex items-stretch justify-center p-4 overflow-hidden">
        <div className="w-full max-w-3xl mx-auto flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Document Editor</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {content.length} characters
                  </span>
                  <button 
                    onClick={handleCopyContent}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy content"
                  >
                    <Copy className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="prose prose-gray max-w-none">
                <InlineEditablePreview content={content} onChange={onChange} onSave={onSave} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}