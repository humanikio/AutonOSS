/**
 * EditorHeader
 *
 * Header with tabs to switch between Editor and Configure views.
 */

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RotateCw, Sparkles, Settings } from 'lucide-react';
import { Agent } from '../../types';

export type EditorView = 'editor' | 'configure';

interface EditorHeaderProps {
  agent: Agent;
  activeView: EditorView;
  onViewChange: (view: EditorView) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onRefresh: () => void;
  workspaceId: string;
}

export default function EditorHeader({
  agent,
  activeView,
  onViewChange,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onRefresh,
  workspaceId,
}: EditorHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push(`/workspaces/manage/${workspaceId}/agentWorkshop`);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Back + Agent Info */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          {agent.botIconImagePath ? (
            <img
              src={agent.botIconImagePath}
              alt={agent.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {agent.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-sm font-semibold text-slate-800">{agent.name}</h1>
            {hasUnsavedChanges && (
              <p className="text-[10px] text-amber-600">Unsaved changes</p>
            )}
          </div>
        </div>
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => onViewChange('editor')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === 'editor'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Editor
        </button>
        <button
          onClick={() => onViewChange('configure')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === 'configure'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="h-4 w-4" />
          Configure
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isSaving}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 transition-colors"
          title="Refresh from 11Labs"
        >
          <RotateCw className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-all disabled:opacity-40 ${
            hasUnsavedChanges
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </header>
  );
}
