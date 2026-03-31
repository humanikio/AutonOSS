/**
 * VoiceLibraryBrowser
 *
 * Voice library browser with search, filters, and voice grid display.
 */

'use client';

import { Search, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { Voice } from '@/lib/services/voiceService';
import VoiceCard from './VoiceCard';

interface VoiceLibraryBrowserProps {
  voices: Voice[];
  currentVoiceId?: string;
  playingVoiceId: string | null;
  isLoading: boolean;
  searchTerm: string;
  selectedCategory: string;
  onSearchChange: (term: string) => void;
  onCategoryChange: (category: string) => void;
  onVoiceSelect: (voice: Voice) => void;
  onVoicePreview: (previewUrl: string, voiceId: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Voices' },
  { id: 'premade', label: 'Premade' },
  { id: 'professional', label: 'Professional' },
  { id: 'cloned', label: 'Cloned' },
  { id: 'generated', label: 'Generated' },
];

export default function VoiceLibraryBrowser({
  voices,
  currentVoiceId,
  playingVoiceId,
  isLoading,
  searchTerm,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onVoiceSelect,
  onVoicePreview,
}: VoiceLibraryBrowserProps) {
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search voices by name or description..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Voice Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          {isLoading ? 'Loading...' : `${voices.length} voice${voices.length !== 1 ? 's' : ''}`}
        </h3>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading voices...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && voices.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <Filter className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No voices found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      )}

      {/* Voice Grid */}
      {!isLoading && voices.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {voices.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              isSelected={voice.voice_id === currentVoiceId}
              isPlaying={voice.voice_id === playingVoiceId}
              onSelect={() => onVoiceSelect(voice)}
              onPreview={() => onVoicePreview(voice.preview_url, voice.voice_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
