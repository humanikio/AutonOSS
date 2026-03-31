/**
 * useVoiceLibrary Hook
 *
 * Manages voice library state, search, filtering, playback, and selection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceService, Voice, VoiceDetails, ListVoicesParams } from '@/lib/services/voiceService';

interface UseVoiceLibraryReturn {
  // State
  voices: Voice[];
  selectedVoice: VoiceDetails | null;
  currentVoiceForAgent: Voice | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  isSelectingVoice: boolean;
  currentAudio: HTMLAudioElement | null;
  playingVoiceId: string | null;
  error: string | null;

  // Search & Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  // Pagination
  hasMore: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;

  // Actions
  loadVoices: (params?: ListVoicesParams) => Promise<void>;
  loadVoiceDetails: (voiceId: string) => Promise<void>;
  selectVoiceForAgent: (voice: Voice, settings?: {
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  }) => Promise<void>;
  playPreview: (previewUrl: string, voiceId: string) => void;
  stopPreview: () => void;
  refreshVoices: () => Promise<void>;
}

export function useVoiceLibrary(agentId: string, initialVoice?: Voice | null): UseVoiceLibraryReturn {
  // State
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceDetails | null>(null);
  const [currentVoiceForAgent, setCurrentVoiceForAgent] = useState<Voice | null>(initialVoice || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSelectingVoice, setIsSelectingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Audio Playback
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // Update current voice when initialVoice changes
  useEffect(() => {
    if (initialVoice) {
      setCurrentVoiceForAgent(initialVoice);
    }
  }, [initialVoice]);

  /**
   * Load voices from API
   */
  const loadVoices = useCallback(async (params: ListVoicesParams = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams: ListVoicesParams = {
        pageSize: 50,
        ...params,
      };

      if (searchTerm) queryParams.search = searchTerm;
      if (selectedCategory !== 'all') queryParams.category = selectedCategory;

      const response = await VoiceService.listVoices(agentId, queryParams);

      setVoices(response.voices);
      setHasMore(response.has_more);
    } catch (err) {
      console.error('Error loading voices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, searchTerm, selectedCategory]);

  /**
   * Load voice details
   */
  const loadVoiceDetails = useCallback(async (voiceId: string) => {
    try {
      setIsLoadingDetails(true);
      const details = await VoiceService.getVoice(agentId, voiceId);
      setSelectedVoice(details);
    } catch (err) {
      console.error('Error loading voice details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voice details');
    } finally {
      setIsLoadingDetails(false);
    }
  }, [agentId]);

  /**
   * Select voice for agent
   */
  const selectVoiceForAgent = useCallback(async (
    voice: Voice,
    settings?: {
      stability?: number;
      speed?: number;
      similarity_boost?: number;
    }
  ) => {
    try {
      setIsSelectingVoice(true);
      setError(null);

      await VoiceService.selectVoice(agentId, voice.voice_id, settings);

      // Update local state
      setCurrentVoiceForAgent(voice);

      // Load full details
      await loadVoiceDetails(voice.voice_id);

      console.log(`✅ Successfully selected voice: ${voice.name}`);
    } catch (err) {
      console.error('Error selecting voice:', err);
      setError(err instanceof Error ? err.message : 'Failed to select voice');
      throw err; // Re-throw to allow caller to handle
    } finally {
      setIsSelectingVoice(false);
    }
  }, [agentId, loadVoiceDetails]);

  /**
   * Play voice preview
   */
  const playPreview = useCallback((previewUrl: string, voiceId: string) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingVoiceId(null);
    }

    // If clicking the same voice that's playing, just stop it
    if (playingVoiceId === voiceId) {
      setCurrentAudio(null);
      setPlayingVoiceId(null);
      audioRef.current = null;
      return;
    }

    // Create new audio instance
    const audio = new Audio(previewUrl);

    // Set up event listeners
    audio.addEventListener('loadstart', () => {
      setPlayingVoiceId(voiceId);
    });

    audio.addEventListener('ended', () => {
      setCurrentAudio(null);
      setPlayingVoiceId(null);
      audioRef.current = null;
    });

    audio.addEventListener('error', () => {
      setCurrentAudio(null);
      setPlayingVoiceId(null);
      audioRef.current = null;
      console.error('Audio playback error');
    });

    // Store reference and play
    audioRef.current = audio;
    setCurrentAudio(audio);

    audio.play().catch((err) => {
      console.error('Error playing audio:', err);
      setCurrentAudio(null);
      setPlayingVoiceId(null);
      audioRef.current = null;
    });
  }, [playingVoiceId]);

  /**
   * Stop voice preview
   */
  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setCurrentAudio(null);
    setPlayingVoiceId(null);
  }, []);

  /**
   * Refresh voices (reload current page)
   */
  const refreshVoices = useCallback(async () => {
    await loadVoices();
  }, [loadVoices]);

  // Load voices on mount and when filters change
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  return {
    // State
    voices,
    selectedVoice,
    currentVoiceForAgent,
    isLoading,
    isLoadingDetails,
    isSelectingVoice,
    currentAudio,
    playingVoiceId,
    error,

    // Search & Filters
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,

    // Pagination
    hasMore,
    currentPage,
    setCurrentPage,

    // Actions
    loadVoices,
    loadVoiceDetails,
    selectVoiceForAgent,
    playPreview,
    stopPreview,
    refreshVoices,
  };
}
