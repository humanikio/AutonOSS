/**
 * AgentEditorLayout
 *
 * Main layout with tab switching between Editor and Configure views.
 */

'use client';

import { ReactNode, Children, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Agent } from '../../types';
import EditorHeader, { EditorView } from './EditorHeader';
import PreviewArea from './PreviewArea';

interface AgentEditorLayoutProps {
  agent: Agent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRefresh: () => void;
  workspaceId: string;
  children: ReactNode;
}

export default function AgentEditorLayout({
  agent,
  isLoading,
  isSaving,
  error,
  hasUnsavedChanges,
  onSave,
  onRefresh,
  workspaceId,
  children,
}: AgentEditorLayoutProps) {
  const [activeView, setActiveView] = useState<EditorView>('editor');

  const childArray = Children.toArray(children);
  const chatPanel = childArray[0] || null;
  const configPanel = childArray[1] || null;

  if (isLoading) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-primary-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">{error || 'Agent not found'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header with Tabs */}
      <EditorHeader
        agent={agent}
        activeView={activeView}
        onViewChange={setActiveView}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={onSave}
        onRefresh={onRefresh}
        workspaceId={workspaceId}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'editor' ? (
          <>
            {/* Chat Sidebar - Narrow */}
            <div className="w-80 flex-shrink-0 border-r border-slate-200">
              {chatPanel}
            </div>

            {/* Preview Area - Main */}
            <div className="flex-1">
              <PreviewArea agent={agent} />
            </div>
          </>
        ) : (
          /* Configure View - Full Width Config Panel */
          <div className="flex-1 overflow-hidden">
            {configPanel}
          </div>
        )}
      </div>
    </div>
  );
}
