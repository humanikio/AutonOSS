/**
 * useAgentEditor Hook
 *
 * Central state management for the agent editor.
 * Handles loading, saving, and real-time updates.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Agent } from '../types';
import * as agentApi from './agentApi';

export interface UseAgentEditorReturn {
  // State
  agent: Agent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  updateAgent: (updates: Partial<Agent>) => void;
  saveAgent: () => Promise<void>;
  refreshAgent: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateSystemPrompt: (prompt: string) => Promise<void>;
}

export function useAgentEditor(agentId: string): UseAgentEditorReturn {
  const { tenant, getToken } = useAuth();

  // State
  const [agent, setAgent] = useState<Agent | null>(null);
  const [originalAgent, setOriginalAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Subscribe to real-time agent updates
  useEffect(() => {
    if (!tenant?.id || !agentId) {
      setIsLoading(false);
      return;
    }

    const agentRef = doc(db, 'tenants', tenant.id, 'agents', agentId);

    const unsubscribe = onSnapshot(
      agentRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const agentData: Agent = {
            id: snapshot.id,
            name: data.name || '',
            description: data.description || '',
            status: data.status || 'draft',
            elevenLabsAgentId: data.elevenLabsAgentId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            lastRefreshedAt: data.lastRefreshedAt,
            botAvatarColor: data.botAvatarColor,
            botEntityImagePath: data.botEntityImagePath,
            botIconImagePath: data.botIconImagePath,
            currentVoiceId: data.currentVoiceId,
            voiceSettings: data.voiceSettings,
            voiceRecord: data.voiceRecord,
            supportedVoices: data.supportedVoices,
            pronunciationDictionaries: data.pronunciationDictionaries,
            asrSettings: data.asrSettings,
            turnSettings: data.turnSettings,
            conversationSettings: data.conversationSettings,
            agentSettings: data.agentSettings,
            llmSettings: data.llmSettings,
            prompt: data.prompt,
            toolIds: data.toolIds,
            builtInTools: data.builtInTools,
            customTools: data.customTools,
            knowledgeBase: data.knowledgeBase,
            knowledgeBaseDocuments: data.knowledgeBaseDocuments,
            ragSettings: data.ragSettings,
            lastKnowledgeBaseUpdate: data.lastKnowledgeBaseUpdate,
            mcpServerIds: data.mcpServerIds,
            nativeMcpServerIds: data.nativeMcpServerIds,
            channels: data.channels,
            agentPhoneNumber: data.agentPhoneNumber,
            agentPhoneNumberSid: data.agentPhoneNumberSid,
            agentEmail: data.agentEmail,
            agentEmailId: data.agentEmailId,
            platformSettings: data.platformSettings,
            elevenLabsPhoneNumbers: data.elevenLabsPhoneNumbers,
            elevenLabsMetadata: data.elevenLabsMetadata,
            elevenLabsTags: data.elevenLabsTags,
            elevenLabsFullConfig: data.elevenLabsFullConfig,
          };

          setAgent(agentData);
          setOriginalAgent(agentData);
          setError(null);
        } else {
          setError('Agent not found');
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error subscribing to agent:', err);
        setError('Failed to load agent');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenant?.id, agentId]);

  // Update local agent state (optimistic updates)
  const updateAgent = useCallback((updates: Partial<Agent>) => {
    setAgent((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Save all pending changes to backend
  const saveAgent = useCallback(async () => {
    if (!agent || !tenant?.id || !agent.elevenLabsAgentId) {
      console.error('Cannot save: missing agent or elevenLabsAgentId');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      // Build updates payload from current agent state
      const updates: Record<string, any> = {};

      // LLM Settings
      if (agent.llmSettings?.llm) updates.llm = agent.llmSettings.llm;
      if (agent.agentSettings?.language) updates.language = agent.agentSettings.language;
      if (agent.llmSettings?.temperature !== undefined) updates.temperature = agent.llmSettings.temperature;
      if (agent.llmSettings?.max_tokens !== undefined) updates.max_tokens = agent.llmSettings.max_tokens;
      if (agent.agentSettings?.first_message !== undefined) updates.first_message = agent.agentSettings.first_message;
      if (agent.builtInTools) updates.built_in_tools = agent.builtInTools;

      // Voice Settings
      if (agent.voiceSettings?.model_id) updates.tts_model_id = agent.voiceSettings.model_id;
      if (agent.voiceSettings?.agent_output_audio_format) updates.agent_output_audio_format = agent.voiceSettings.agent_output_audio_format;
      if (agent.voiceSettings?.speed !== undefined) updates.speed = agent.voiceSettings.speed;
      if (agent.voiceSettings?.stability !== undefined) updates.stability = agent.voiceSettings.stability;
      if (agent.voiceSettings?.similarity_boost !== undefined) updates.similarity_boost = agent.voiceSettings.similarity_boost;
      if (agent.voiceSettings?.optimize_streaming_latency !== undefined) updates.optimize_streaming_latency = agent.voiceSettings.optimize_streaming_latency;

      // ASR Settings
      if (agent.asrSettings?.quality) updates.asr_quality = agent.asrSettings.quality;
      if (agent.asrSettings?.user_input_audio_format) updates.user_input_audio_format = agent.asrSettings.user_input_audio_format;
      if (agent.asrSettings?.provider) updates.asr_provider = agent.asrSettings.provider;
      if (agent.asrSettings?.keywords) updates.keywords = agent.asrSettings.keywords;

      // Turn Settings
      if (agent.turnSettings?.mode) updates.turn_mode = agent.turnSettings.mode;
      if (agent.turnSettings?.turn_timeout !== undefined) updates.turn_timeout = agent.turnSettings.turn_timeout;
      if (agent.turnSettings?.silence_end_call_timeout !== undefined) updates.silence_end_call_timeout = agent.turnSettings.silence_end_call_timeout;

      // Conversation Settings
      if (agent.conversationSettings?.text_only !== undefined) updates.text_only = agent.conversationSettings.text_only;
      if (agent.conversationSettings?.max_duration_seconds !== undefined) updates.max_duration_seconds = agent.conversationSettings.max_duration_seconds;
      if (agent.conversationSettings?.client_events) updates.client_events = agent.conversationSettings.client_events;

      await agentApi.updateAgentConfig(token, agentId, agent.elevenLabsAgentId, updates);

      setHasUnsavedChanges(false);
      setOriginalAgent(agent);
    } catch (err) {
      console.error('Error saving agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setIsSaving(false);
    }
  }, [agent, tenant?.id, agentId, getToken]);

  // Refresh agent from 11Labs
  const refreshAgent = useCallback(async () => {
    if (!agent?.elevenLabsAgentId || !tenant?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      await agentApi.refreshAgentConfig(token, agentId, agent.elevenLabsAgentId);
      // Real-time subscription will update the agent state
    } catch (err) {
      console.error('Error refreshing agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh agent');
    } finally {
      setIsSaving(false);
    }
  }, [agent?.elevenLabsAgentId, tenant?.id, agentId, getToken]);

  // Update agent name
  const updateName = useCallback(async (name: string) => {
    if (!tenant?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      await agentApi.updateAgentName(token, agentId, name);
      // Real-time subscription will update the agent state
    } catch (err) {
      console.error('Error updating name:', err);
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setIsSaving(false);
    }
  }, [tenant?.id, agentId, getToken]);

  // Update system prompt
  const updateSystemPrompt = useCallback(async (prompt: string) => {
    if (!tenant?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      await agentApi.updateSystemPrompt(token, agentId, prompt);
      // Update local state
      updateAgent({ prompt });
    } catch (err) {
      console.error('Error updating system prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to update system prompt');
    } finally {
      setIsSaving(false);
    }
  }, [tenant?.id, agentId, getToken, updateAgent]);

  return {
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
  };
}
