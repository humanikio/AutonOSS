/**
 * AgentVoiceConfig
 *
 * Voice configuration with real 11Labs voice library integration.
 */

'use client';

import { useState } from 'react';
import { Agent } from '../../types';
import { useVoiceLibrary } from '../../services/useVoiceLibrary';
import { Voice } from '@/lib/services/voiceService';
import VoiceLibraryBrowser from './voice/VoiceLibraryBrowser';
import VoiceSettingsPanel from './voice/VoiceSettingsPanel';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AgentVoiceConfigProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}

export default function AgentVoiceConfig({ agent, onUpdate }: AgentVoiceConfigProps) {
  const [showSettings, setShowSettings] = useState(false);

  // Initialize current voice from agent config
  const initialVoice = agent.voiceRecord
    ? ({
        voice_id: agent.voiceRecord.voiceId || '',
        name: agent.voiceRecord.voiceName || 'Unknown Voice',
        description: agent.voiceRecord.voiceDescription || '',
        category: agent.voiceRecord.voiceCategory || 'unknown',
        labels: agent.voiceRecord.voiceLabels || {},
        preview_url: agent.voiceRecord.voicePreviewUrl || '',
        available_for_tiers: [],
        settings: {
          stability: agent.voiceSettings?.stability || 0.5,
          use_speaker_boost: false,
          similarity_boost: agent.voiceSettings?.similarity_boost || 0.8,
          style: 0,
          speed: agent.voiceSettings?.speed || 1,
        },
        is_owner: false,
        is_legacy: false,
        is_mixed: false,
        created_at_unix: 0,
      } as Voice)
    : null;

  const {
    voices,
    currentVoiceForAgent,
    isLoading,
    isSelectingVoice,
    playingVoiceId,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectVoiceForAgent,
    playPreview,
  } = useVoiceLibrary(agent.id!, initialVoice);

  const handleVoiceSelect = async (voice: Voice) => {
    try {
      await selectVoiceForAgent(voice, {
        stability: agent.voiceSettings?.stability || 0.5,
        speed: agent.voiceSettings?.speed || 1,
        similarity_boost: agent.voiceSettings?.similarity_boost || 0.8,
      });

      // Update agent config with new voice
      onUpdate({
        voiceRecord: {
          voiceId: voice.voice_id,
          voiceName: voice.name,
          voiceDescription: voice.description,
          voiceCategory: voice.category,
          voiceLabels: voice.labels,
          voicePreviewUrl: voice.preview_url,
        },
      });
    } catch (err) {
      console.error('Failed to select voice:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Voice Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose your agent's voice and configure speech settings
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Selection Loading State */}
      {isSelectingVoice && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-primary-600 animate-spin" />
          <p className="text-sm text-primary-900">Selecting voice...</p>
        </div>
      )}

      {/* Voice Settings Panel */}
      <VoiceSettingsPanel
        currentVoice={currentVoiceForAgent}
        agent={agent}
        onUpdate={onUpdate}
        onPlayPreview={
          currentVoiceForAgent?.preview_url
            ? () => playPreview(currentVoiceForAgent.preview_url, currentVoiceForAgent.voice_id)
            : undefined
        }
      />

      {/* Voice Library Browser */}
      <VoiceLibraryBrowser
        voices={voices}
        currentVoiceId={currentVoiceForAgent?.voice_id}
        playingVoiceId={playingVoiceId}
        isLoading={isLoading}
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        onSearchChange={setSearchTerm}
        onCategoryChange={setSelectedCategory}
        onVoiceSelect={handleVoiceSelect}
        onVoicePreview={playPreview}
      />
    </div>
  );
}
