/**
 * VoiceCard
 *
 * Individual voice display with preview and selection.
 */

'use client';

import { Play, Pause, Check } from 'lucide-react';
import { Voice } from '@/lib/services/voiceService';

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'premade':
      return 'bg-blue-100 text-blue-800';
    case 'professional':
      return 'bg-purple-100 text-purple-800';
    case 'cloned':
      return 'bg-green-100 text-green-800';
    case 'generated':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const getGenderSymbol = (labels: { [key: string]: string }) => {
  const gender = labels.gender;
  if (gender === 'female') return '♀';
  if (gender === 'male') return '♂';
  return '●';
};

export default function VoiceCard({
  voice,
  isSelected,
  isPlaying,
  onSelect,
  onPreview,
}: VoiceCardProps) {
  return (
    <div
      className={`relative p-4 rounded-xl border transition-all ${
        isSelected
          ? 'bg-primary-50/50 border-primary-300 shadow-sm ring-2 ring-primary-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Check Mark - Top Right Corner */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Voice Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-6">
          <div className="mb-1">
            <p className="text-sm font-medium text-slate-800 truncate">
              {voice.name} {getGenderSymbol(voice.labels)}
            </p>
          </div>
          <span
            className={`inline-block px-2 py-0.5 text-xs rounded-full ${getCategoryColor(
              voice.category
            )}`}
          >
            {voice.category}
          </span>
        </div>
      </div>

      {/* Description */}
      {voice.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
          {voice.description}
        </p>
      )}

      {/* Tags */}
      {voice.labels && Object.keys(voice.labels).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {Object.entries(voice.labels)
            .filter(([key]) => key !== 'gender')
            .slice(0, 3)
            .map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
              >
                {value}
              </span>
            ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Preview Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5 text-slate-700" />
              <span className="text-xs font-medium text-slate-700">Playing</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 text-slate-700" />
              <span className="text-xs font-medium text-slate-700">Preview</span>
            </>
          )}
        </button>

        {/* Select Button */}
        {!isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="px-4 py-2 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Select
          </button>
        )}
      </div>

      {/* Voice Settings Preview */}
      {voice.settings && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Speed: {voice.settings.speed.toFixed(1)}x</span>
          <span>Stability: {voice.settings.stability.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
