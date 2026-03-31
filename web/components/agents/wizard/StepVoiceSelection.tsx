'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, Loader } from 'lucide-react';
import { CallAgentRequest, ElevenLabsVoice } from '@/types';
import { voicesAPI } from '@/lib/api/voices';

interface StepVoiceSelectionProps {
  data: Partial<CallAgentRequest>;
  onUpdate: (data: Partial<CallAgentRequest>) => void;
}

export default function StepVoiceSelection({ data, onUpdate }: StepVoiceSelectionProps) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(
    data.voiceConfig?.voiceId || ''
  );
  const [voiceSettings, setVoiceSettings] = useState({
    model: data.voiceConfig?.model || 'eleven_turbo_v2_5' as const,
    stability: data.voiceConfig?.stability || 0.5,
    similarity: data.voiceConfig?.similarity || 0.8,
    speed: data.voiceConfig?.speed || 1.0
  });
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Load voices from ElevenLabs API
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setLoadingVoices(true);
        const voicesData = await voicesAPI.getVoices();
        setVoices(voicesData);
        
        // Set default voice if none selected
        if (!selectedVoice && voicesData.length > 0) {
          setSelectedVoice(voicesData[0].voice_id);
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
        // Use fallback voices if API fails
        setVoices([]);
      } finally {
        setLoadingVoices(false);
      }
    };

    loadVoices();
  }, [selectedVoice]);

  useEffect(() => {
    const selectedVoiceData = voices.find(v => v.voice_id === selectedVoice);
    
    onUpdate({
      voiceConfig: {
        voiceId: selectedVoice,
        voiceName: selectedVoiceData?.name,
        ...voiceSettings
      }
    });
  }, [selectedVoice, voiceSettings, voices, onUpdate]);

  const handleVoicePreview = async (voiceId: string) => {
    if (playingVoice === voiceId) {
      // Stop current audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }
      setPlayingVoice(null);
      return;
    }

    try {
      setPlayingVoice(voiceId);
      
      // Generate preview text
      const previewText = "Hello! Thank you for calling. My name is " + 
        (voices.find(v => v.voice_id === voiceId)?.name || "Assistant") + 
        " and I'm here to help you today. How can I assist you?";
      
      // Get audio blob from API
      const audioBlob = await voicesAPI.generateVoicePreview(voiceId, previewText);
      
      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);
      
      audio.onended = () => {
        setPlayingVoice(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setPlayingVoice(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        console.error('Failed to play voice preview');
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Failed to generate voice preview:', error);
      setPlayingVoice(null);
    }
  };

  const updateVoiceSetting = (setting: string, value: number | string) => {
    setVoiceSettings(prev => ({ ...prev, [setting]: value }));
  };

  const modelOptions = [
    { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5 (Fastest, Good Quality)', latency: 'Low' },
    { value: 'eleven_turbo_v2', label: 'Turbo v2 (Fast, Standard Quality)', latency: 'Low' },
    { value: 'eleven_flash_v2_5', label: 'Flash v2.5 (Balanced)', latency: 'Medium' },
    { value: 'eleven_flash_v2', label: 'Flash v2 (High Quality)', latency: 'Medium' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Choose Your Agent's Voice
        </h3>
        <p className="text-gray-600 mb-6">
          Select a voice that matches your brand and configure its settings for the best experience.
        </p>
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Voice Selection
        </label>
        
        {loadingVoices ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading voices...</span>
          </div>
        ) : voices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No voices available. Please check your connection and try again.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voices.map((voice) => (
            <div
              key={voice.voice_id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedVoice === voice.voice_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedVoice(voice.voice_id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="voice"
                    value={voice.voice_id}
                    checked={selectedVoice === voice.voice_id}
                    onChange={() => setSelectedVoice(voice.voice_id)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">{voice.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {voice.labels?.gender && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {voice.labels.gender}
                        </span>
                      )}
                      {voice.labels?.accent && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {voice.labels.accent}
                        </span>
                      )}
                      {voice.category && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          {voice.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVoicePreview(voice.voice_id);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                >
                  {playingVoice === voice.voice_id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 ml-6">
                {voice.description || 'No description available'}
              </p>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          AI Model
        </label>
        <div className="space-y-2">
          {modelOptions.map((model) => (
            <div
              key={model.value}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                voiceSettings.model === model.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => updateVoiceSetting('model', model.value)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="model"
                    value={model.value}
                    checked={voiceSettings.model === model.value}
                    onChange={() => updateVoiceSetting('model', model.value)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">{model.label}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {model.latency} Latency
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Preview Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Volume2 className="h-5 w-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">Voice Preview</h4>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Preview text: "Hello! Thank you for calling. My name is {voices.find(v => v.voice_id === selectedVoice)?.name || 'Assistant'} and I'm here to help you today. How can I assist you?"
        </p>
        <button
          onClick={() => handleVoicePreview(selectedVoice)}
          className="btn-secondary flex items-center gap-2"
          disabled={playingVoice !== null}
        >
          {playingVoice === selectedVoice ? (
            <>
              <Pause className="h-4 w-4" />
              Playing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Play Preview
            </>
          )}
        </button>
      </div>
    </div>
  );
}