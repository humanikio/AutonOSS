/**
 * VoiceSettingsPanel
 *
 * Voice configuration panel with current voice display and settings controls.
 */

'use client';

import { Mic, Volume2, SlidersHorizontal } from 'lucide-react';
import { Voice } from '@/lib/services/voiceService';
import { Agent, TTS_MODEL_OPTIONS, AUDIO_FORMAT_OPTIONS } from '../../../types';

interface VoiceSettingsPanelProps {
  currentVoice: Voice | null;
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
  onPlayPreview?: () => void;
}

export default function VoiceSettingsPanel({
  currentVoice,
  agent,
  onUpdate,
  onPlayPreview,
}: VoiceSettingsPanelProps) {
  const voiceSettings = agent.voiceSettings || {};

  const updateVoiceSettings = (updates: Partial<typeof voiceSettings>) => {
    onUpdate({
      voiceSettings: { ...voiceSettings, ...updates },
    });
  };

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-5">
      {/* Current Voice Display */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-medium text-slate-700">Voice Settings</h3>
        </div>

        {currentVoice ? (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {currentVoice.name}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {currentVoice.category}
                </p>
              </div>
            </div>
            {currentVoice.preview_url && onPlayPreview && (
              <button
                onClick={onPlayPreview}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Play voice preview"
              >
                <Volume2 className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
            <Mic className="h-6 w-6 text-slate-300 mx-auto mb-1" />
            <p className="text-xs text-slate-500">No voice selected</p>
          </div>
        )}
      </div>

      {/* Model & Format */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            TTS Model
          </label>
          <select
            value={voiceSettings.model_id || 'eleven_turbo_v2_5'}
            onChange={(e) => updateVoiceSettings({ model_id: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {TTS_MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Output Format
          </label>
          <select
            value={voiceSettings.agent_output_audio_format || 'pcm_16000'}
            onChange={(e) =>
              updateVoiceSettings({ agent_output_audio_format: e.target.value })
            }
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {AUDIO_FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-4">
        {/* Speed */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase">
              Speed
            </span>
            <span className="text-xs text-slate-600">
              {voiceSettings.speed?.toFixed(1) || '1.0'}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={voiceSettings.speed || 1.0}
            onChange={(e) =>
              updateVoiceSettings({ speed: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
          />
        </div>

        {/* Stability */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase">
              Stability
            </span>
            <span className="text-xs text-slate-600">
              {voiceSettings.stability?.toFixed(2) || '0.50'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={voiceSettings.stability || 0.5}
            onChange={(e) =>
              updateVoiceSettings({ stability: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
          />
        </div>
      </div>

      {/* Similarity Boost */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">
            Similarity Boost
          </span>
          <span className="text-xs text-slate-600">
            {voiceSettings.similarity_boost?.toFixed(2) || '0.75'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={voiceSettings.similarity_boost || 0.75}
          onChange={(e) =>
            updateVoiceSettings({ similarity_boost: parseFloat(e.target.value) })
          }
          className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
        />
      </div>
    </div>
  );
}
