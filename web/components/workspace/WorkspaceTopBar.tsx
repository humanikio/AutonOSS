'use client';

import { ArrowLeft, Settings } from 'lucide-react';

interface WorkspaceTopBarProps {
  workspaceName: string;
  onBack: () => void;
  onToggleInspector: () => void;
}

export default function WorkspaceTopBar({
  workspaceName,
  onBack,
  onToggleInspector
}: WorkspaceTopBarProps) {
  return (
    <div className="h-14 border-b border-gray-200 flex items-center px-6 flex-shrink-0 bg-white">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to workspaces"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-gray-900">{workspaceName}</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Workspace</span>
        </div>
      </div>
    </div>
  );
}
