/**
 * PanelContainer
 *
 * Wrapper component for all panels in the workspace.
 * Provides consistent UI chrome (header, close button, etc.)
 */

'use client';

import { X, GripVertical } from 'lucide-react';
import { PanelConfig } from '@/types/workspace/panel.types';

interface PanelContainerProps {
  panelId: string;
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export default function PanelContainer({
  panelId,
  title,
  onClose,
  children
}: PanelContainerProps) {
  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Panel Header - Drag handle */}
      <div className="h-10 px-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0 cursor-move">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            title="Close panel"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
