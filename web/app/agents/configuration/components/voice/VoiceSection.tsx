'use client';

import { useState, useEffect } from 'react';
import { ConfigurationSectionProps } from '../../types';
import { VoiceService, Voice, VoiceDetails } from '@/lib/services/voiceService';
import { Play, Pause, Search, Filter, ChevronDown, ChevronUp, Volume2, Settings, User, Star, Check, X } from 'lucide-react';

export default function VoiceSection({ agentId, config, onUpdate }: ConfigurationSectionProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isSelectingVoice, setIsSelectingVoice] = useState(false);
  const [selectedVoiceForAgent, setSelectedVoiceForAgent] = useState<Voice | null>(null);

  const handleVoiceUpdate = (voiceUpdates: any) => {
    onUpdate({
      voice: {
        ...config.voice,
        ...voiceUpdates
      }
    });
  };

  // Load voices on component mount
  useEffect(() => {
    loadVoices();
  }, [agentId, searchTerm, selectedCategory]);

  // Initialize selected voice from config
  useEffect(() => {
    if (config.voice?.voiceId && config.voice?.selectedVoiceName) {
      // Create a voice object from the stored data
      const storedVoice: Voice = {
        voice_id: config.voice.voiceId,
        name: config.voice.selectedVoiceName,
        description: config.voice.selectedVoiceDescription || '',
        category: config.voice.selectedVoiceCategory || 'unknown',
        labels: config.voice.selectedVoiceLabels || {},
        preview_url: config.voice.selectedVoicePreviewUrl || '',
        available_for_tiers: [],
        settings: {
          stability: config.voice.pitch || 0.5,
          use_speaker_boost: false,
          similarity_boost: config.voice.volume || 0.8,
          style: 0,
          speed: config.voice.speed || 1
        },
        is_owner: false,
        is_legacy: false,
        is_mixed: false,
        created_at_unix: 0
      };
      setSelectedVoiceForAgent(storedVoice);
    }
  }, [config.voice]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  const loadVoices = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        pageSize: 50
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      
      const response = await VoiceService.listVoices(agentId, params);
      setVoices(response.voices);
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVoiceDetails = async (voiceId: string) => {
    try {
      setIsLoadingDetails(true);
      const details = await VoiceService.getVoice(agentId, voiceId);
      setSelectedVoice(details);
    } catch (error) {
      console.error('Error loading voice details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleVoiceSelect = async (voice: Voice) => {
    try {
      setIsSelectingVoice(true);
      
      // Call API to select voice for the agent
      await VoiceService.selectVoice(agentId, voice.voice_id, {
        stability: config.voice?.pitch || 0.5,
        speed: config.voice?.speed || 1,
        similarity_boost: 0.8
      });
      
      // Update local state
      setSelectedVoiceForAgent(voice);
      handleVoiceUpdate({ voiceId: voice.voice_id });
      loadVoiceDetails(voice.voice_id);
      
      console.log(`Successfully selected voice ${voice.name} for agent`);
    } catch (error) {
      console.error('Error selecting voice:', error);
      // TODO: Show error toast
    } finally {
      setIsSelectingVoice(false);
    }
  };

  const handlePlayPreview = (previewUrl: string, voiceId: string) => {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setPlayingVoiceId(null);
    }

    // If clicking the same voice that's playing, just stop it
    if (playingVoiceId === voiceId) {
      setCurrentAudio(null);
      setPlayingVoiceId(null);
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
    });
    
    audio.addEventListener('error', () => {
      setCurrentAudio(null);
      setPlayingVoiceId(null);
      console.error('Audio playback error');
    });

    // Store reference and play
    setCurrentAudio(audio);
    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      setCurrentAudio(null);
      setPlayingVoiceId(null);
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'premade': return 'bg-blue-100 text-blue-800';
      case 'professional': return 'bg-purple-100 text-purple-800';
      case 'cloned': return 'bg-green-100 text-green-800';
      case 'generated': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGenderIcon = (labels: { [key: string]: string }) => {
    const gender = labels.gender;
    if (gender === 'female') return '♀';
    if (gender === 'male') return '♂';
    return '●';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Voice Configuration</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading voices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Voice Configuration</h3>
        <p className="text-gray-600 mt-1">Choose your agent's voice and configure speech settings</p>
      </div>

      {/* Selected Voice Display */}
      {selectedVoiceForAgent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-900">Selected Voice: {selectedVoiceForAgent.name}</h4>
                <p className="text-sm text-green-700">
                  {selectedVoiceForAgent.description} • {selectedVoiceForAgent.category}
                  {selectedVoiceForAgent.labels.accent && ` • ${selectedVoiceForAgent.labels.accent}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayPreview(selectedVoiceForAgent.preview_url, selectedVoiceForAgent.voice_id)}
                className="p-2 hover:bg-green-100 rounded-full transition-colors"
                title="Play preview"
              >
                {playingVoiceId === selectedVoiceForAgent.voice_id ? (
                  <Pause className="h-4 w-4 text-green-600" />
                ) : (
                  <Play className="h-4 w-4 text-green-600" />
                )}
              </button>
              <button
                onClick={() => setSelectedVoiceForAgent(null)}
                className="p-2 hover:bg-green-100 rounded-full transition-colors"
                title="Clear selection"
              >
                <X className="h-4 w-4 text-green-600" />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search voices by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="premade">Premade</option>
                <option value="professional">Professional</option>
                <option value="cloned">Cloned</option>
                <option value="generated">Generated</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Voice Library */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Voice Library ({voices?.length || 0} voices)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {voices?.map((voice) => (
            <div
              key={voice.voice_id}
              className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                selectedVoiceForAgent?.voice_id === voice.voice_id
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                  : config.voice?.voiceId === voice.voice_id
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">{voice.name}</span>
                    <span className="text-sm text-gray-500">{getGenderIcon(voice.labels)}</span>
                    {voice.is_owner && <User className="h-3 w-3 text-blue-500" />}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(voice.category)}`}>
                      {voice.category}
                    </span>
                    {voice.labels.accent && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {voice.labels.accent}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">{voice.description}</p>
                  
                  {voice.labels.age && (
                    <p className="text-xs text-gray-500 mt-1">Age: {voice.labels.age}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(voice.preview_url, voice.voice_id);
                    }}
                    className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${
                      playingVoiceId === voice.voice_id ? 'bg-primary-100 text-primary-600' : ''
                    }`}
                    title={playingVoiceId === voice.voice_id ? "Stop preview" : "Play preview"}
                  >
                    {playingVoiceId === voice.voice_id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  
                  {selectedVoiceForAgent?.voice_id === voice.voice_id ? (
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Selected
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoiceSelect(voice);
                      }}
                      disabled={isSelectingVoice}
                      className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSelectingVoice ? 'Selecting...' : 'Select'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Voice Details */}
      {config.voice?.voiceId && selectedVoice && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="h-5 w-5 text-primary-600" />
            <h4 className="text-lg font-medium text-primary-900">Selected Voice: {selectedVoice.name}</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-primary-800 mb-2">Voice Details</h5>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Category:</span> {selectedVoice.category}</p>
                <p><span className="font-medium">Gender:</span> {selectedVoice.labels.gender || 'N/A'}</p>
                <p><span className="font-medium">Accent:</span> {selectedVoice.labels.accent || 'N/A'}</p>
                <p><span className="font-medium">Age:</span> {selectedVoice.labels.age || 'N/A'}</p>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium text-primary-800 mb-2">Voice Settings</h5>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Stability:</span> {selectedVoice.settings.stability}</p>
                <p><span className="font-medium">Similarity:</span> {selectedVoice.settings.similarity_boost}</p>
                <p><span className="font-medium">Style:</span> {selectedVoice.settings.style}</p>
                <p><span className="font-medium">Speaker Boost:</span> {selectedVoice.settings.use_speaker_boost ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-primary-700 mt-4">{selectedVoice.description}</p>
          
          <button
            onClick={() => handlePlayPreview(selectedVoice.preview_url, selectedVoice.voice_id)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            {playingVoiceId === selectedVoice.voice_id ? (
              <>
                <Pause className="h-4 w-4" />
                Stop Preview
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Play Preview
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}