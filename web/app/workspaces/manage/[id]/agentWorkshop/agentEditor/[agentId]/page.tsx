/**
 * Agent Editor Page
 *
 * Modular agent configuration with AI-assisted chat panel and manual config panels.
 * Split layout: Chat on left, Config on right.
 */

'use client';

import { use } from 'react';
import { useAgentEditor } from './services/useAgentEditor';
import { useChimeraChat } from './services/useChimeraChat';
import AgentEditorLayout from './components/layout/AgentEditorLayout';
import AgentChatPanel from './components/chat/AgentChatPanel';
import AgentConfigPanel from './components/config/AgentConfigPanel';

interface AgentEditorParams {
  params: Promise<{ id: string; agentId: string }>;
}

export default function AgentEditorPage({ params }: AgentEditorParams) {
  const resolvedParams = use(params);
  const { agentId, id: workspaceId } = resolvedParams;

  const {
    agent,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    updateAgent,
    saveAgent,
    refreshAgent,
    updateName,
    updateSystemPrompt,
  } = useAgentEditor(agentId);

  // Chimera backend chat
  const {
    chats,
    currentChatId,
    messages,
    isLoading: isChimeraLoading,
    isSending,
    createChat,
    sendMessage,
    setCurrentChatId,
    deleteChat,
  } = useChimeraChat();

  return (
    <AgentEditorLayout
      agent={agent}
      isLoading={isLoading}
      isSaving={isSaving}
      error={error}
      hasUnsavedChanges={hasUnsavedChanges}
      onSave={saveAgent}
      onRefresh={refreshAgent}
      workspaceId={workspaceId}
    >
      {/* Left Panel - Chat */}
      <AgentChatPanel
        chats={chats}
        currentChatId={currentChatId}
        messages={messages}
        isLoading={isChimeraLoading}
        isSending={isSending}
        onSendMessage={sendMessage}
        onCreateChat={createChat}
        onSelectChat={setCurrentChatId}
        onDeleteChat={deleteChat}
        agentName={agent?.name}
      />

      {/* Right Panel - Config */}
      {agent && (
        <AgentConfigPanel
          agent={agent}
          onUpdate={updateAgent}
          onUpdateName={updateName}
          onUpdateSystemPrompt={updateSystemPrompt}
        />
      )}
    </AgentEditorLayout>
  );
}
