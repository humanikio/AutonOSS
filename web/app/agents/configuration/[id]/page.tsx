// @ts-nocheck
'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Bot, Save, Brain, Mic, Wrench, MessageSquare, RefreshCw, MessageCircle, Check, Webhook } from 'lucide-react';
import { AgentConfiguration, ConfigSection } from '../types';
import VoiceSection from '../components/voice/VoiceSection';
import KnowledgeSection from '../components/knowledge/KnowledgeSection';
import ToolsSection from '../components/tools/ToolsSection';
import ChannelsSection from '../components/channels/ChannelsSection';
import WebhooksSection from '../components/webhooks/WebhooksSection';
import { SystemPromptEditor } from '../components/SystemPromptEditor';
import { AgentService, FirestoreAgent } from '@/lib/services/agentService';

interface AgentConfigurationPageProps {
  params: Promise<{
    id: string;
  }>;
}


export default function AgentConfigurationPage({ params }: AgentConfigurationPageProps) {
  const router = useRouter();
  const { tenant, getToken } = useAuth();
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  
  // Agent configuration states
  const [agentConfig, setAgentConfig] = useState<AgentConfiguration>({
    id: agentId,
    name: '',
    conversation: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<ConfigSection>('voice');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [tempAgentName, setTempAgentName] = useState('');
  
  // System prompt state (separate from main config)
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalSystemPrompt, setOriginalSystemPrompt] = useState('');
  const [isSystemPromptSaving, setIsSystemPromptSaving] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(null);


  // Load agent data from Firestore and auto-refresh from 11Labs
  useEffect(() => {
    if (!tenant?.id || !agentId) return;

    const loadAgent = async () => {
      try {
        setIsLoading(true);
        
        // First, get the current agent to check if we have an 11Labs agent ID
        const firestoreAgent = await AgentService.getAgent(tenant.id, agentId);
        
        if (firestoreAgent) {
          // Auto-refresh from 11Labs if we have an agent ID
          if (firestoreAgent.elevenLabsAgentId) {
            try {
              console.log('Auto-refreshing agent configuration from 11Labs...');
              
              const token = await getToken();
              if (token) {
                const response = await fetch(`/api/agents/${agentId}/refresh`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    elevenLabsAgentId: firestoreAgent.elevenLabsAgentId
                  })
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log('Auto-refresh successful:', result);
                  
                  // Re-fetch the agent after refresh to get updated data
                  const refreshedAgent = await AgentService.getAgent(tenant.id, agentId);
                  if (refreshedAgent) {
                    setAgentConfigFromFirestore(refreshedAgent);
                  }
                } else {
                  console.warn('Auto-refresh failed, using cached data');
                  setAgentConfigFromFirestore(firestoreAgent);
                }
              } else {
                console.warn('No auth token, using cached data');
                setAgentConfigFromFirestore(firestoreAgent);
              }
            } catch (error) {
              console.warn('Auto-refresh error, using cached data:', error);
              setAgentConfigFromFirestore(firestoreAgent);
            }
          } else {
            console.log('No 11Labs agent ID found, using cached data');
            setAgentConfigFromFirestore(firestoreAgent);
          }
        } else {
          // Agent not found
          console.error('Agent not found');
          router.push('/agents');
        }
      } catch (error) {
        console.error('Error loading agent:', error);
        // Handle error - maybe show toast
      } finally {
        setIsLoading(false);
      }
    };

    loadAgent();
  }, [tenant?.id, agentId, router, getToken]);

  // Bot avatar state
  const [botEntityImagePath, setBotEntityImagePath] = useState<string>('/robot-agent-long.png');
  const [botIconImagePath, setBotIconImagePath] = useState<string | undefined>(undefined);

  // Helper function to convert Firestore agent to AgentConfiguration
  const setAgentConfigFromFirestore = (firestoreAgent: FirestoreAgent) => {
    // Update bot entity image if available
    if (firestoreAgent.botEntityImagePath) {
      setBotEntityImagePath(firestoreAgent.botEntityImagePath);
    }
    
    // Update bot icon image if available
    if (firestoreAgent.botIconImagePath) {
      setBotIconImagePath(firestoreAgent.botIconImagePath);
    }
    
    // Initialize temp name if not set
    if (!tempAgentName && firestoreAgent.name) {
      setTempAgentName(firestoreAgent.name);
    }
    
    setAgentConfig({
      id: firestoreAgent.id,
      name: firestoreAgent.name,
      voice: {
        // Current voice selection
        voiceId: firestoreAgent.currentVoiceId || firestoreAgent.selectedVoiceId || firestoreAgent.voiceRecord?.voiceId,
        selectedVoiceName: firestoreAgent.selectedVoiceName || firestoreAgent.voiceRecord?.voiceName,
        selectedVoiceDescription: firestoreAgent.selectedVoiceDescription || firestoreAgent.voiceRecord?.voiceDescription,
        selectedVoiceCategory: firestoreAgent.selectedVoiceCategory || firestoreAgent.voiceRecord?.voiceCategory,
        selectedVoiceLabels: {} as { [key: string]: string },
        selectedVoicePreviewUrl: firestoreAgent.selectedVoicePreviewUrl || firestoreAgent.voiceRecord?.voicePreviewUrl,
        
        // Voice settings from 11Labs data
        speed: firestoreAgent.voiceSettings?.speed || 1,
        stability: firestoreAgent.voiceSettings?.stability || 0.40,
        similarity_boost: firestoreAgent.voiceSettings?.similarity_boost || 0.72,
        optimize_streaming_latency: firestoreAgent.voiceSettings?.optimize_streaming_latency || 3,
        model_id: firestoreAgent.voiceSettings?.model_id || 'eleven_turbo_v2',
        agent_output_audio_format: firestoreAgent.voiceSettings?.agent_output_audio_format || 'pcm_8000',
        
        // Legacy compatibility
        pitch: firestoreAgent.voiceSettings?.stability || 0.5,
        volume: firestoreAgent.voiceSettings?.similarity_boost || 0.8,
        
        // Advanced settings
        supportedVoices: firestoreAgent.supportedVoices || [],
        pronunciationDictionaries: firestoreAgent.pronunciationDictionaries || [],
        
        voiceRecord: firestoreAgent.voiceRecord as any
      },
      conversation: {
        // Agent/LLM settings from 11Labs
        language: firestoreAgent.agentSettings?.language || 'en',
        first_message: firestoreAgent.agentSettings?.first_message || '',
        llm: firestoreAgent.llmSettings?.llm || 'gemini-2.0-flash',
        temperature: firestoreAgent.llmSettings?.temperature || 0.25,
        max_tokens: firestoreAgent.llmSettings?.max_tokens || 250,
        prompt: firestoreAgent.prompt || firestoreAgent.llmSettings?.prompt || '',
        timezone: firestoreAgent.llmSettings?.timezone || undefined,
        ignore_default_personality: firestoreAgent.llmSettings?.ignore_default_personality || false,
        
        // ASR settings
        asr: firestoreAgent.asrSettings ? {
          provider: firestoreAgent.asrSettings.provider || 'elevenlabs',
          quality: firestoreAgent.asrSettings.quality || 'high',
          user_input_audio_format: firestoreAgent.asrSettings.user_input_audio_format || 'pcm_8000',
          keywords: firestoreAgent.asrSettings.keywords || []
        } : undefined,
        
        // Turn handling
        turn: firestoreAgent.turnSettings ? {
          mode: firestoreAgent.turnSettings.mode || 'silence',
          turn_timeout: firestoreAgent.turnSettings.turn_timeout || 5,
          silence_end_call_timeout: firestoreAgent.turnSettings.silence_end_call_timeout || -1
        } : undefined,
        
        // Conversation settings
        conversation: firestoreAgent.conversationSettings ? {
          text_only: firestoreAgent.conversationSettings.text_only || false,
          max_duration_seconds: firestoreAgent.conversationSettings.max_duration_seconds || 900,
          client_events: firestoreAgent.conversationSettings.client_events || []
        } : undefined,
        
        // Tools and integrations
        toolIds: firestoreAgent.toolIds || [],
        builtInTools: firestoreAgent.builtInTools || {
          // Default enabled tools for new agents
          end_call: {
            name: 'end_call',
            description: 'Gives agent the ability to end the call with the user.'
          },
          language_detection: {
            name: 'language_detection',
            description: 'Gives agent the ability to change the language during conversation.'
          }
        },
        customTools: firestoreAgent.customTools || [],
        knowledgeBase: firestoreAgent.knowledgeBase || [],
        ragSettings: firestoreAgent.ragSettings || undefined,
        mcpServerIds: firestoreAgent.mcpServerIds || [],
        nativeMcpServerIds: firestoreAgent.nativeMcpServerIds || []
      },
      channels: {
        phone: {
          phoneNumber: firestoreAgent.agentPhoneNumber,
          enabled: firestoreAgent.channels?.voice?.enabled || false
        },
        sms: {
          enabled: firestoreAgent.channels?.sms?.enabled || false
        },
        email: {
          email: firestoreAgent.agentEmail,
          enabled: firestoreAgent.channels?.email?.enabled || false
        },
        webhook: {
          enabled: firestoreAgent.channels?.webhook?.enabled || false
        }
      }
    });
  };

  // Set up real-time updates
  useEffect(() => {
    if (!tenant?.id || !agentId) return;

    const unsubscribe = AgentService.subscribeToAgent(
      tenant.id,
      agentId,
      (firestoreAgent) => {
        if (firestoreAgent) {
          // Update bot entity image if available
          if (firestoreAgent.botEntityImagePath) {
            setBotEntityImagePath(firestoreAgent.botEntityImagePath);
          }
          
          // Update bot icon image if available
          if (firestoreAgent.botIconImagePath) {
            setBotIconImagePath(firestoreAgent.botIconImagePath);
          }
          
          // Initialize temp name if not set
          if (!tempAgentName && firestoreAgent.name) {
            setTempAgentName(firestoreAgent.name);
          }
          
          // Load system prompt separately
          const promptText = firestoreAgent.prompt || firestoreAgent.llmSettings?.prompt || '';
          setSystemPrompt(promptText);
          setOriginalSystemPrompt(promptText);

          setAgentConfig({
            id: firestoreAgent.id,
            name: firestoreAgent.name,
            voice: {
              // Current voice selection
              voiceId: firestoreAgent.currentVoiceId || firestoreAgent.selectedVoiceId || firestoreAgent.voiceRecord?.voiceId,
              selectedVoiceName: firestoreAgent.selectedVoiceName || firestoreAgent.voiceRecord?.voiceName,
              selectedVoiceDescription: firestoreAgent.selectedVoiceDescription || firestoreAgent.voiceRecord?.voiceDescription,
              selectedVoiceCategory: firestoreAgent.selectedVoiceCategory || firestoreAgent.voiceRecord?.voiceCategory,
              selectedVoiceLabels: {} as { [key: string]: string },
              selectedVoicePreviewUrl: firestoreAgent.selectedVoicePreviewUrl || firestoreAgent.voiceRecord?.voicePreviewUrl,
              
              // Voice settings from 11Labs data
              speed: firestoreAgent.voiceSettings?.speed || 1,
              stability: firestoreAgent.voiceSettings?.stability || 0.40,
              similarity_boost: firestoreAgent.voiceSettings?.similarity_boost || 0.72,
              optimize_streaming_latency: firestoreAgent.voiceSettings?.optimize_streaming_latency || 3,
              model_id: firestoreAgent.voiceSettings?.model_id || 'eleven_turbo_v2',
              agent_output_audio_format: firestoreAgent.voiceSettings?.agent_output_audio_format || 'pcm_8000',
              
              // Legacy compatibility
              pitch: firestoreAgent.voiceSettings?.stability || 0.5,
              volume: firestoreAgent.voiceSettings?.similarity_boost || 0.8,
              
              // Advanced settings
              supportedVoices: firestoreAgent.supportedVoices || [],
              pronunciationDictionaries: firestoreAgent.pronunciationDictionaries || [],
              
              voiceRecord: firestoreAgent.voiceRecord as any
            },
            conversation: {
              // Agent/LLM settings from 11Labs
              language: firestoreAgent.agentSettings?.language || 'en',
              first_message: firestoreAgent.agentSettings?.first_message || '',
              llm: firestoreAgent.llmSettings?.llm || 'gemini-2.0-flash',
              temperature: firestoreAgent.llmSettings?.temperature || 0.25,
              max_tokens: firestoreAgent.llmSettings?.max_tokens || 250,
              prompt: firestoreAgent.llmSettings?.prompt || '',
              timezone: firestoreAgent.llmSettings?.timezone || undefined,
              ignore_default_personality: firestoreAgent.llmSettings?.ignore_default_personality || false,
              
              // ASR, Turn, Conversation settings
              asr: firestoreAgent.asrSettings,
              turn: firestoreAgent.turnSettings,
              conversation: firestoreAgent.conversationSettings,
              
              // Tools and integrations
              toolIds: firestoreAgent.toolIds || [],
              builtInTools: firestoreAgent.builtInTools || {
                // Default enabled tools for new agents
                end_call: {
                  name: 'end_call',
                  description: 'Gives agent the ability to end the call with the user.'
                },
                language_detection: {
                  name: 'language_detection',
                  description: 'Gives agent the ability to change the language during conversation.'
                }
              },
              customTools: firestoreAgent.customTools || [],
              knowledgeBase: firestoreAgent.knowledgeBase || [],
              ragSettings: firestoreAgent.ragSettings || undefined,
              mcpServerIds: firestoreAgent.mcpServerIds || [],
              nativeMcpServerIds: firestoreAgent.nativeMcpServerIds || []
            },
            channels: {
              phone: {
                phoneNumber: firestoreAgent.agentPhoneNumber,
                enabled: firestoreAgent.channels?.voice?.enabled || false
              } as any,
              sms: {
                enabled: firestoreAgent.channels?.sms?.enabled || false
              },
              email: {
                email: firestoreAgent.agentEmail,
                enabled: firestoreAgent.channels?.email?.enabled || false
              } as any,
              webhook: {
                enabled: firestoreAgent.channels?.webhook?.enabled || false
              }
            }
          });
        }
      },
      (error) => {
        console.error('Error with real-time agent updates:', error);
      }
    );

    return () => unsubscribe();
  }, [tenant?.id, agentId]);

  // Debug agentConfig state changes
  useEffect(() => {
    console.log('🔍 agentConfig state changed:', agentConfig);
    if ((agentConfig.conversation as any)?.agent_output_audio_format) {
      console.log('🔍 Current audio format in state:', (agentConfig.conversation as any).agent_output_audio_format);
    }
  }, [agentConfig]);

  const handleSave = async () => {
    if (!tenant?.id || !agentId) return;
    
    setIsSaving(true);
    try {
      // Get the current agent to find the 11Labs agent ID
      const firestoreAgent = await AgentService.getAgent(tenant.id, agentId);
      
      if (!firestoreAgent?.elevenLabsAgentId) {
        console.error('No 11Labs agent ID found for this agent');
        // TODO: Show error toast
        return;
      }

      console.log('Saving agent configuration...');
      
      // Get the authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Build the updates payload from current agentConfig (excluding KB, voice selection, and channels)
      const updates: any = {};

      console.log('🔍 Current agentConfig for mapping:', agentConfig);

      // Detailed debugging for audio formats
      console.log('🔍 Audio format debugging:', {
        'voice.agent_output_audio_format': agentConfig.voice?.agent_output_audio_format,
        'conversation.asr.user_input_audio_format': agentConfig.conversation?.asr?.user_input_audio_format,
        'voice object': agentConfig.voice,
        'conversation.asr object': agentConfig.conversation?.asr
      });

      // LLM & Language Settings
      if (agentConfig.conversation?.llm) updates.llm = agentConfig.conversation.llm;
      if (agentConfig.conversation?.language) updates.language = agentConfig.conversation.language;
      if (agentConfig.conversation?.temperature !== undefined) updates.temperature = agentConfig.conversation.temperature;
      if (agentConfig.conversation?.max_tokens !== undefined) updates.max_tokens = agentConfig.conversation.max_tokens;
      // NOTE: System prompt now handled by dedicated save button and endpoint
      // Do NOT include prompt in main config updates to avoid conflicts
      // if (agentConfig.conversation?.prompt !== undefined) {
      //   updates.prompt = agentConfig.conversation.prompt;
      //   console.log('✅ Mapped prompt:', agentConfig.conversation.prompt);
      // }
      if (agentConfig.conversation?.timezone) updates.timezone = agentConfig.conversation.timezone;
      if (agentConfig.conversation?.ignore_default_personality !== undefined) updates.ignore_default_personality = agentConfig.conversation.ignore_default_personality;
      if (agentConfig.conversation?.first_message !== undefined) {
        updates.first_message = agentConfig.conversation.first_message;
        console.log('✅ Mapped first_message:', agentConfig.conversation.first_message);
      }
      if (agentConfig.conversation?.builtInTools !== undefined) {
        updates.built_in_tools = agentConfig.conversation.builtInTools;
        console.log('✅ Mapped built-in tools:', Object.keys(agentConfig.conversation.builtInTools));
      }

      // TTS Settings (excluding voice selection - handled by voice service)
      if (agentConfig.voice?.model_id) {
        updates.tts_model_id = agentConfig.voice.model_id;
        console.log('✅ Mapped TTS model:', agentConfig.voice.model_id);
      }
      if (agentConfig.voice?.agent_output_audio_format) {
        updates.agent_output_audio_format = agentConfig.voice.agent_output_audio_format;
        console.log('✅ Mapped TTS audio format:', agentConfig.voice.agent_output_audio_format);
      }
      if (agentConfig.voice?.speed !== undefined) {
        updates.speed = agentConfig.voice.speed;
        console.log('✅ Mapped speed:', agentConfig.voice.speed);
      }
      if (agentConfig.voice?.stability !== undefined) {
        updates.stability = agentConfig.voice.stability;
        console.log('✅ Mapped stability:', agentConfig.voice.stability);
      }
      if (agentConfig.voice?.similarity_boost !== undefined) {
        updates.similarity_boost = agentConfig.voice.similarity_boost;
        console.log('✅ Mapped similarity:', agentConfig.voice.similarity_boost);
      }
      if (agentConfig.voice?.optimize_streaming_latency !== undefined) {
        updates.optimize_streaming_latency = agentConfig.voice.optimize_streaming_latency;
        console.log('✅ Mapped latency:', agentConfig.voice.optimize_streaming_latency);
      }

      // ASR Settings
      if (agentConfig.conversation?.asr?.quality) {
        updates.asr_quality = agentConfig.conversation.asr.quality;
        console.log('✅ Mapped ASR quality:', agentConfig.conversation.asr.quality);
      }
      if (agentConfig.conversation?.asr?.user_input_audio_format) {
        updates.user_input_audio_format = agentConfig.conversation.asr.user_input_audio_format;
        console.log('✅ Mapped ASR audio format:', agentConfig.conversation.asr.user_input_audio_format);
      }
      if (agentConfig.conversation?.asr?.provider) {
        updates.asr_provider = agentConfig.conversation.asr.provider;
        console.log('✅ Mapped ASR provider:', agentConfig.conversation.asr.provider);
      }
      if (agentConfig.conversation?.asr?.keywords) {
        updates.keywords = agentConfig.conversation.asr.keywords;
        console.log('✅ Mapped ASR keywords:', agentConfig.conversation.asr.keywords);
      }

      // Turn & Conversation Settings
      if (agentConfig.conversation?.turn?.mode) updates.turn_mode = agentConfig.conversation.turn.mode;
      if (agentConfig.conversation?.turn?.turn_timeout !== undefined) updates.turn_timeout = agentConfig.conversation.turn.turn_timeout;
      if (agentConfig.conversation?.turn?.silence_end_call_timeout !== undefined) updates.silence_end_call_timeout = agentConfig.conversation.turn.silence_end_call_timeout;
      if (agentConfig.conversation?.conversation?.text_only !== undefined) updates.text_only = agentConfig.conversation.conversation.text_only;
      if (agentConfig.conversation?.conversation?.max_duration_seconds !== undefined) updates.max_duration_seconds = agentConfig.conversation.conversation.max_duration_seconds;
      if (agentConfig.conversation?.conversation?.client_events) updates.client_events = agentConfig.conversation.conversation.client_events;

      // Advanced Settings (excluding KB)
      if (agentConfig.voice?.pronunciationDictionaries) updates.pronunciation_dictionary_locators = agentConfig.voice.pronunciationDictionaries;
      if (agentConfig.voice?.supportedVoices) updates.supported_voices = agentConfig.voice.supportedVoices;

      console.log('Updates to send:', updates);
      
      // Always send at least the language and model to avoid empty updates error
      if (Object.keys(updates).length === 0) {
        const language = agentConfig.conversation?.language || 'en';
        // Use correct model for English agents (11Labs validation: English must use turbo or flash v2, not v2_5)
        const defaultModel = language === 'en' ? 'eleven_turbo_v2' : 'eleven_turbo_v2_5';
        
        updates.language = language;
        updates.tts_model_id = agentConfig.voice?.model_id || defaultModel;
        console.log('⚠️ No specific updates, sending minimal update:', updates);
      }

      // Final payload debugging
      const finalPayload = {
        elevenLabsAgentId: firestoreAgent.elevenLabsAgentId,
        updates
      };
      console.log('🚀 Final payload being sent to backend:', JSON.stringify(finalPayload, null, 2));
      
      // Check specifically for audio format fields
      console.log('🎵 Audio format check in final payload:', {
        'updates.agent_output_audio_format': finalPayload.updates.agent_output_audio_format,
        'updates.user_input_audio_format': finalPayload.updates.user_input_audio_format
      });

      // Call the bulk configuration update API endpoint
      const response = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          elevenLabsAgentId: firestoreAgent.elevenLabsAgentId,
          updates
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent configuration');
      }

      const result = await response.json();
      console.log('Save result:', result);
      
      // Show success message
      console.log(`✅ Successfully updated agent configuration. Updated fields: ${result.data?.updatedFields?.join(', ')}`);
      setHasUnsavedChanges(false);
      
      // Show brief success feedback
      setTimeout(() => {
        console.log('Configuration saved successfully!');
      }, 100);
      
    } catch (error) {
      console.error('Error saving agent configuration:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (!tenant?.id || !agentId) return;
    
    setIsRefreshing(true);
    try {
      // Get the current agent to find the 11Labs agent ID
      const firestoreAgent = await AgentService.getAgent(tenant.id, agentId);
      
      if (!firestoreAgent?.elevenLabsAgentId) {
        console.error('No 11Labs agent ID found for this agent');
        // TODO: Show error toast
        return;
      }

      console.log(`Refreshing agent configuration from 11Labs...`);
      
      // Get the authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Call the refresh API endpoint
      const response = await fetch(`/api/agents/${agentId}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          elevenLabsAgentId: firestoreAgent.elevenLabsAgentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh agent configuration');
      }

      const result = await response.json();
      console.log('Refresh result:', result);
      
      // TODO: Show success toast
      console.log(`Successfully refreshed agent configuration. Updated fields: ${result.data?.updatedFields?.join(', ')}`);
      
    } catch (error) {
      console.error('Error refreshing agent configuration:', error);
      // TODO: Show error toast
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debounced save function - saves 2 seconds after user stops making changes
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Auto-saving changes...');
      handleSave();
    }, 2000); // 2 second delay
  }, []);

  const handleConfigUpdate = (updates: Partial<AgentConfiguration>) => {
    console.log('🔄 Configuration updated:', updates);
    console.log('🔄 Previous agentConfig:', agentConfig);
    
    setAgentConfig(prev => {
      const newConfig = { ...prev, ...updates };
      console.log('🔄 New agentConfig after update:', newConfig);
      return newConfig;
    });
    
    setHasUnsavedChanges(true);
    // Remove auto-save to prevent interference with manual save
    // debouncedSave();
  };

  // Clear debounced save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleBack = () => {
    router.push('/agents');
  };

  const handleSaveSystemPrompt = async () => {
    if (!tenant?.id || !agentId) return;
    
    setIsSystemPromptSaving(true);
    setSystemPromptError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      console.log(`💾 Saving system prompt for agent: ${agentId} (${systemPrompt.length} characters)`);
      
      const response = await fetch(`/api/agents/${agentId}/prompt`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: systemPrompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save system prompt');
      }

      const result = await response.json();
      console.log('✅ System prompt saved successfully');
      
      // Update original prompt to match saved version
      setOriginalSystemPrompt(systemPrompt);
      
    } catch (error) {
      console.error('❌ Error saving system prompt:', error);
      setSystemPromptError(error instanceof Error ? error.message : 'Failed to save system prompt');
    } finally {
      setIsSystemPromptSaving(false);
    }
  };

  const handleSaveAgentName = async () => {
    const newName = tempAgentName.trim();
    if (!newName || newName === agentConfig.name) {
      return;
    }

    setIsUpdatingName(true);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/agents/${agentId}/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'updateName',
          name: newName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent name');
      }

      console.log('Agent name updated successfully');
      
      // Update local config immediately
      setAgentConfig(prev => ({ ...prev, name: newName }));
      
    } catch (error) {
      console.error('Error updating agent name:', error);
      alert(`Failed to update agent name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleNodeClick = (section: ConfigSection) => {
    setActiveSection(section);
    // Play video when switching sections
    if (videoRef.current) {
      videoRef.current.play();
      // Pause after 3 seconds
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agent configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div>
                {botIconImagePath ? (
                  <img 
                    src={botIconImagePath} 
                    alt={`${agentConfig.name} Bot Icon`}
                    className="h-8 w-8 object-cover rounded-full"
                  />
                ) : (
                  <div className="p-2 bg-primary-50 rounded-full">
                    <Bot className="h-5 w-5 text-primary-600" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{agentConfig.name}</h1>
                <p className="text-sm text-gray-500">
                  Agent Configuration
                  {hasUnsavedChanges && (
                    <span className="ml-2 text-orange-600 font-medium">• Unsaved changes</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh configuration from 11Labs"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                hasUnsavedChanges
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Robot Visualization - Fixed */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col p-4 relative overflow-hidden flex-shrink-0">
          {/* Agent Name Field */}
          <div className="relative z-10 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempAgentName}
                onChange={(e) => setTempAgentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveAgentName();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter agent name"
                disabled={isUpdatingName}
              />
              <button
                onClick={handleSaveAgentName}
                disabled={isUpdatingName || !tempAgentName.trim() || tempAgentName.trim() === agentConfig.name}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isUpdatingName || !tempAgentName.trim() || tempAgentName.trim() === agentConfig.name
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isUpdatingName ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Save
                  </>
                )}
              </button>
            </div>
            {isUpdatingName && (
              <p className="text-sm text-primary-600 mt-1">
                Updating agent name...
              </p>
            )}
          </div>
          
          {/* Video Background to match mascot video */}
          <div className="absolute inset-x-0 bottom-0 top-24 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-600 via-transparent to-slate-700 opacity-60"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-800/30 to-slate-900/50"></div>
          </div>
          
          {/* Robot Image Container */}
          <div className="relative z-10 flex-1 flex items-center justify-start">
            <img 
              src={botEntityImagePath} 
              alt="AI Agent Robot" 
              className="w-80 h-[400px] object-contain ml-4 border-4 border-white rounded-lg shadow-lg"
            />
          </div>
          
          {/* Interactive Nodes - positioned independently with glowing effects */}
          {/* Voice Node - speech functionality - 1st position */}
          <div className="absolute bottom-[425px] right-[20px] flex items-center z-20">
            <div className={`w-8 h-0.5 mr-2 ${
              activeSection === 'voice' ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-gray-300'
            }`}></div>
            <button
              onClick={() => handleNodeClick('voice')}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                activeSection === 'voice' 
                  ? 'bg-primary-500 border-primary-400 text-white shadow-lg shadow-primary-400/50 animate-pulse' 
                  : 'bg-white border-primary-300 text-primary-500 hover:border-primary-500 hover:shadow-lg shadow-md'
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          {/* Conversation Node - conversation functionality - 2nd position */}
          <div className="absolute bottom-[355px] right-[20px] flex items-center z-20">
            <div className={`w-8 h-0.5 mr-2 ${
              activeSection === 'conversation' ? 'bg-primary-400 shadow-lg shadow-primary-400/50' : 'bg-gray-300'
            }`}></div>
            <button
              onClick={() => handleNodeClick('conversation')}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                activeSection === 'conversation' 
                  ? 'bg-primary-500 border-primary-400 text-white shadow-lg shadow-primary-400/50 animate-pulse' 
                  : 'bg-white border-primary-300 text-primary-500 hover:border-primary-500 hover:shadow-lg shadow-md'
              }`}
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Knowledge Node - brain functionality - 3rd position */}
          <div className="absolute bottom-[285px] right-[20px] flex items-center z-20">
            <div className={`w-8 h-0.5 mr-2 ${
              activeSection === 'knowledge' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-300'
            }`}></div>
            <button
              onClick={() => handleNodeClick('knowledge')}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                activeSection === 'knowledge' 
                  ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-400/50 animate-pulse' 
                  : 'bg-white border-green-300 text-green-500 hover:border-green-500 hover:shadow-lg shadow-md'
              }`}
            >
              <Brain className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tools Node - hands/actions functionality - 4th position */}
          <div className="absolute bottom-[215px] right-[20px] flex items-center z-20">
            <div className={`w-8 h-0.5 mr-2 ${
              activeSection === 'tools' ? 'bg-amber-400 shadow-lg shadow-amber-400/50' : 'bg-gray-300'
            }`}></div>
            <button
              onClick={() => handleNodeClick('tools')}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                activeSection === 'tools' 
                  ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-400/50 animate-pulse' 
                  : 'bg-white border-amber-300 text-amber-500 hover:border-amber-500 hover:shadow-lg shadow-md'
              }`}
            >
              <Wrench className="h-5 w-5" />
            </button>
          </div>
          
          {/* Channels Node - communication functionality - 5th position */}
          <div className="absolute bottom-[145px] right-[20px] flex items-center z-20">
            <div className={`w-8 h-0.5 mr-2 ${
              activeSection === 'channels' ? 'bg-purple-400 shadow-lg shadow-purple-400/50' : 'bg-gray-300'
            }`}></div>
            <button
              onClick={() => handleNodeClick('channels')}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                activeSection === 'channels' 
                  ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-400/50 animate-pulse' 
                  : 'bg-white border-purple-300 text-purple-500 hover:border-purple-500 hover:shadow-lg shadow-md'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>

          {/* Webhooks Node - webhook functionality - 6th position */}
          <div className="absolute bottom-[75px] right-[20px] flex items-center z-20">
            <div className={`w-8 h-0.5 mr-2 ${
              activeSection === 'webhooks' ? 'bg-orange-400 shadow-lg shadow-orange-400/50' : 'bg-gray-300'
            }`}></div>
            <button
              onClick={() => handleNodeClick('webhooks')}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                activeSection === 'webhooks' 
                  ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-400/50 animate-pulse' 
                  : 'bg-white border-orange-300 text-orange-500 hover:border-orange-500 hover:shadow-lg shadow-md'
              }`}
            >
              <Webhook className="h-5 w-5" />
            </button>
          </div>
          
        </div>

        {/* Right Side - Configuration Panels - Scrollable */}
        <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
          {/* Section Tabs - Fixed position */}
          <div className="px-8 pt-8 flex-shrink-0">
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'voice', label: 'Voice', icon: Mic },
              { id: 'conversation', label: 'Conversation', icon: MessageCircle },
              { id: 'knowledge', label: 'Knowledge', icon: Brain },
              { id: 'tools', label: 'Tools', icon: Wrench },
              { id: 'channels', label: 'Channels', icon: MessageSquare },
              { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as ConfigSection)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeSection === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
            </div>
          </div>

          {/* Configuration Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
            {(activeSection as string) === 'overview' && (
              <OverviewSection
                agentId={agentId}
                config={agentConfig}
                onUpdate={handleConfigUpdate}
              />
            )}

            {activeSection === 'voice' && (
              <VoiceSection
                agentId={agentId}
                config={agentConfig}
                onUpdate={handleConfigUpdate}
              />
            )}

            {activeSection === 'conversation' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Voice & Audio Configuration</h2>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-6">
                    
                    {/* LLM & Language Settings */}
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Language & LLM</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Language */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Language
                          </label>
                          <select 
                            value={agentConfig.conversation?.language || 'en'}
                            onChange={(e) => {
                              const newLanguage = e.target.value;
                              const updates: any = {
                                conversation: {
                                  ...agentConfig.conversation,
                                  language: newLanguage
                                }
                              };
                              
                              // Auto-select compatible TTS model for non-English languages
                              if (newLanguage !== 'en' && agentConfig.voice?.model_id === 'eleven_turbo_v2') {
                                updates.voice = {
                                  ...agentConfig.voice,
                                  model_id: 'eleven_turbo_v2_5'
                                };
                                console.log('🔄 Auto-switching to turbo v2.5 for non-English language');
                              }
                              
                              handleConfigUpdate(updates);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                          </select>
                        </div>

                        {/* LLM Model */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            LLM Model
                          </label>
                          <select 
                            value={agentConfig.conversation?.llm || 'gemini-2.0-flash'}
                            onChange={(e) => {
                              handleConfigUpdate({
                                conversation: {
                                  ...agentConfig.conversation,
                                  llm: e.target.value
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="gpt-4">GPT-4</option>
                            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                          </select>
                        </div>

                        {/* Temperature */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Temperature ({agentConfig.conversation?.temperature || 0.25})
                          </label>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={agentConfig.conversation?.temperature || 0.25}
                            onChange={(e) => {
                              handleConfigUpdate({
                                conversation: {
                                  ...agentConfig.conversation,
                                  temperature: parseFloat(e.target.value)
                                }
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Deterministic</span>
                            <span>Creative</span>
                          </div>
                        </div>

                      </div>
                      
                      {/* First Message */}
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Message
                          <span className="text-xs text-gray-500 ml-2">(Leave empty for user to start)</span>
                        </label>
                        <textarea
                          value={agentConfig.conversation?.first_message || ''}
                          onChange={(e) => {
                            handleConfigUpdate({
                              conversation: {
                                ...agentConfig.conversation,
                                first_message: e.target.value
                              }
                            });
                          }}
                          placeholder="e.g. Hello, how can I help you today?"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      {/* System Prompt - Separate Save with Expression Insertion */}
                      <div className="mt-6">
                        <SystemPromptEditor
                          value={systemPrompt}
                          onChange={(value) => {
                            setSystemPrompt(value);
                            setSystemPromptError(null);
                          }}
                          onSave={handleSaveSystemPrompt}
                          isSaving={isSystemPromptSaving}
                          hasChanges={systemPrompt !== originalSystemPrompt}
                          error={systemPromptError}
                        />
                      </div>
                    </div>

                    {/* TTS Settings */}
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Text-to-Speech</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* TTS Model - Hidden for now */}
                        {false && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              TTS Model
                            </label>
                            <select 
                              value={agentConfig.voice?.model_id || 'eleven_turbo_v2_5'}
                              onChange={(e) => {
                                handleConfigUpdate({
                                  voice: {
                                    ...agentConfig.voice,
                                    model_id: e.target.value
                                  }
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Recommended)</option>
                              <option value="eleven_flash_v2_5">Eleven Flash v2.5</option>
                              <option value="eleven_turbo_v2">Eleven Turbo v2 (English Only)</option>
                              <option value="eleven_flash_v2">Eleven Flash v2 (English Only)</option>
                            </select>
                          </div>
                        )}

                        {/* Audio Output Format */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Audio Output Format
                          </label>
                          <select 
                            value={agentConfig.voice?.agent_output_audio_format || 'pcm_8000'}
                            onChange={(e) => {
                              console.log('🔧 TTS Audio Format changed from', agentConfig.voice?.agent_output_audio_format, 'to', e.target.value);
                              handleConfigUpdate({
                                voice: {
                                  ...agentConfig.voice,
                                  agent_output_audio_format: e.target.value
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="pcm_8000">PCM 8kHz (Telephony)</option>
                            <option value="pcm_16000">PCM 16kHz (High Quality)</option>
                            <option value="pcm_22050">PCM 22kHz</option>
                            <option value="pcm_44100">PCM 44kHz</option>
                          </select>
                        </div>

                      </div>

                      {/* Voice Quality Sliders */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        {/* Speed */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Speed ({agentConfig.voice?.speed || 1.0}x)
                          </label>
                          <input 
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={agentConfig.voice?.speed || 1.0}
                            onChange={(e) => {
                              handleConfigUpdate({
                                voice: {
                                  ...agentConfig.voice,
                                  speed: parseFloat(e.target.value)
                                }
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0.5x</span>
                            <span>2x</span>
                          </div>
                        </div>

                        {/* Stability */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stability ({agentConfig.voice?.stability || 0.40})
                          </label>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={agentConfig.voice?.stability || 0.40}
                            onChange={(e) => {
                              handleConfigUpdate({
                                voice: {
                                  ...agentConfig.voice,
                                  stability: parseFloat(e.target.value)
                                }
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Variable</span>
                            <span>Stable</span>
                          </div>
                        </div>

                        {/* Similarity Boost */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Similarity ({agentConfig.voice?.similarity_boost || 0.72})
                          </label>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={agentConfig.voice?.similarity_boost || 0.72}
                            onChange={(e) => {
                              handleConfigUpdate({
                                voice: {
                                  ...agentConfig.voice,
                                  similarity_boost: parseFloat(e.target.value)
                                }
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Creative</span>
                            <span>Accurate</span>
                          </div>
                        </div>

                        {/* Latency Optimization */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Latency ({agentConfig.voice?.optimize_streaming_latency || 3})
                          </label>
                          <input 
                            type="range"
                            min="0"
                            max="4"
                            step="1"
                            value={agentConfig.voice?.optimize_streaming_latency || 3}
                            onChange={(e) => {
                              handleConfigUpdate({
                                voice: {
                                  ...agentConfig.voice,
                                  optimize_streaming_latency: parseInt(e.target.value)
                                }
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Lowest</span>
                            <span>Highest</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Turn & ASR Settings */}
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Conversation Flow</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Turn Mode */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Turn Mode
                          </label>
                          <select 
                            value={agentConfig.conversation?.turn?.mode || 'silence'}
                            onChange={(e) => {
                              handleConfigUpdate({
                                conversation: {
                                  ...agentConfig.conversation,
                                  turn: {
                                    ...agentConfig.conversation?.turn,
                                    mode: e.target.value
                                  }
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="silence">Silence Detection</option>
                            <option value="turn">Turn Based</option>
                          </select>
                        </div>

                        {/* Turn Timeout */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Turn Timeout ({agentConfig.conversation?.turn?.turn_timeout || 5}s)
                          </label>
                          <input 
                            type="range"
                            min="3"
                            max="15"
                            step="1"
                            value={agentConfig.conversation?.turn?.turn_timeout || 5}
                            onChange={(e) => {
                              handleConfigUpdate({
                                conversation: {
                                  ...agentConfig.conversation,
                                  turn: {
                                    ...agentConfig.conversation?.turn,
                                    turn_timeout: parseInt(e.target.value)
                                  }
                                }
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>3s</span>
                            <span>15s</span>
                          </div>
                        </div>

                        {/* ASR Quality */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ASR Quality
                          </label>
                          <select 
                            value={agentConfig.conversation?.asr?.quality || 'high'}
                            onChange={(e) => {
                              handleConfigUpdate({
                                conversation: {
                                  ...agentConfig.conversation,
                                  asr: {
                                    ...agentConfig.conversation?.asr,
                                    quality: e.target.value
                                  }
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>

                      </div>

                      {/* ASR Audio Format */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ASR Audio Format
                        </label>
                        <select 
                          value={agentConfig.conversation?.asr?.user_input_audio_format || 'pcm_8000'}
                          onChange={(e) => {
                            console.log('🔧 ASR Audio Format changed from', agentConfig.conversation?.asr?.user_input_audio_format, 'to', e.target.value);
                            handleConfigUpdate({
                              conversation: {
                                ...agentConfig.conversation,
                                asr: {
                                  ...agentConfig.conversation?.asr,
                                  user_input_audio_format: e.target.value
                                }
                              }
                            });
                          }}
                          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="pcm_8000">PCM 8kHz (Telephony)</option>
                          <option value="pcm_16000">PCM 16kHz (High Quality)</option>
                          <option value="pcm_22050">PCM 22kHz</option>
                          <option value="pcm_44100">PCM 44kHz</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {activeSection === 'knowledge' && (
              <KnowledgeSection
                agentId={agentId}
                config={agentConfig}
                onUpdate={handleConfigUpdate}
              />
            )}

            {activeSection === 'tools' && (
              <ToolsSection
                agentId={agentId}
                config={agentConfig}
                onUpdate={handleConfigUpdate}
              />
            )}

            {activeSection === 'channels' && (
              <ChannelsSection
                agentId={agentId}
                config={agentConfig}
                onUpdate={handleConfigUpdate}
              />
            )}

            {activeSection === 'webhooks' && (
              <WebhooksSection
                agentId={agentId}
                config={agentConfig}
                onUpdate={handleConfigUpdate}
              />
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}