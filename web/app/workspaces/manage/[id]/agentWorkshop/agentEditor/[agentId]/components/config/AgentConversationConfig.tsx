/**
 * AgentConversationConfig
 *
 * Minimal conversation, LLM, ASR, and turn handling settings.
 */

'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Agent,
  LLM_OPTIONS,
  LANGUAGE_OPTIONS,
  ASR_QUALITY_OPTIONS,
  AUDIO_FORMAT_OPTIONS,
  TURN_MODE_OPTIONS,
} from '../../types';

interface AgentConversationConfigProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
  onUpdateSystemPrompt: (prompt: string) => Promise<void>;
}

export default function AgentConversationConfig({
  agent,
  onUpdate,
  onUpdateSystemPrompt,
}: AgentConversationConfigProps) {
  const [promptText, setPromptText] = useState(agent.prompt || agent.llmSettings?.prompt || '');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  const agentSettings = agent.agentSettings || {};
  const llmSettings = agent.llmSettings || {};
  const asrSettings = agent.asrSettings || {};
  const turnSettings = agent.turnSettings || {};
  const conversationSettings = agent.conversationSettings || {};

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await onUpdateSystemPrompt(promptText);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const promptChanged = promptText !== (agent.prompt || agent.llmSettings?.prompt || '');

  return (
    <div className="space-y-6">
      {/* Language & LLM */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Language
          </label>
          <select
            value={agentSettings.language || 'en'}
            onChange={(e) =>
              onUpdate({
                agentSettings: { ...agentSettings, language: e.target.value },
              })
            }
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            LLM Model
          </label>
          <select
            value={llmSettings.llm || 'gemini-2.0-flash'}
            onChange={(e) =>
              onUpdate({
                llmSettings: { ...llmSettings, llm: e.target.value },
              })
            }
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {LLM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Temperature */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Temperature
          </label>
          <span className="text-xs text-slate-600 font-medium">
            {llmSettings.temperature?.toFixed(2) || '0.25'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={llmSettings.temperature || 0.25}
          onChange={(e) =>
            onUpdate({
              llmSettings: { ...llmSettings, temperature: parseFloat(e.target.value) },
            })
          }
          className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>Deterministic</span>
          <span>Creative</span>
        </div>
      </div>

      {/* First Message */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          First Message
          <span className="text-slate-400 ml-1 normal-case">(optional)</span>
        </label>
        <textarea
          value={agentSettings.first_message || ''}
          onChange={(e) =>
            onUpdate({
              agentSettings: { ...agentSettings, first_message: e.target.value },
            })
          }
          rows={2}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
          placeholder="Hello, how can I help you today?"
        />
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          System Prompt
        </label>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none font-mono"
          placeholder="Define your agent's personality and behavior..."
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-slate-400">
            {promptText.length} chars
          </span>
          <button
            onClick={handleSavePrompt}
            disabled={isSavingPrompt || !promptChanged}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors ${
              promptChanged
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-slate-100 text-slate-400'
            } disabled:opacity-50 disabled:cursor-default`}
          >
            {isSavingPrompt ? (
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* ASR Settings */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">
          Speech Recognition
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Quality
            </label>
            <select
              value={asrSettings.quality || 'high'}
              onChange={(e) =>
                onUpdate({
                  asrSettings: { ...asrSettings, quality: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {ASR_QUALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Input Format
            </label>
            <select
              value={asrSettings.user_input_audio_format || 'pcm_16000'}
              onChange={(e) =>
                onUpdate({
                  asrSettings: { ...asrSettings, user_input_audio_format: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {AUDIO_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Turn Handling */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">
          Turn Handling
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Mode
            </label>
            <select
              value={turnSettings.mode || 'silence'}
              onChange={(e) =>
                onUpdate({
                  turnSettings: { ...turnSettings, mode: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {TURN_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Timeout
              </label>
              <span className="text-xs text-slate-600 font-medium">
                {turnSettings.turn_timeout || 5}s
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="1"
              value={turnSettings.turn_timeout || 5}
              onChange={(e) =>
                onUpdate({
                  turnSettings: { ...turnSettings, turn_timeout: parseInt(e.target.value) },
                })
              }
              className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>3s</span>
              <span>15s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Max Duration */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Max Duration
          </label>
          <span className="text-xs text-slate-600 font-medium">
            {Math.floor((conversationSettings.max_duration_seconds || 600) / 60)} min
          </span>
        </div>
        <input
          type="range"
          min="60"
          max="3600"
          step="60"
          value={conversationSettings.max_duration_seconds || 600}
          onChange={(e) =>
            onUpdate({
              conversationSettings: {
                ...conversationSettings,
                max_duration_seconds: parseInt(e.target.value),
              },
            })
          }
          className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>1 min</span>
          <span>60 min</span>
        </div>
      </div>
    </div>
  );
}
