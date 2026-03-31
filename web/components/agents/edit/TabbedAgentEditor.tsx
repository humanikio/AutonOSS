'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Mic, 
  MessageSquare, 
  Settings, 
  Database, 
  Save, 
  X, 
  Edit3,
  Check,
  AlertCircle,
  Play,
  Pause 
} from 'lucide-react';
import { CallAgent, ElevenLabsVoice, BusinessInfo, Product, FAQ, BrandGuidelines } from '@/types';
import { voicesAPI } from '@/lib/api/voices';
import { customToolsAPI, CustomTool } from '@/lib/api/customTools';
import { knowledgeAPI } from '@/lib/api/knowledge';
import CustomToolModal from './CustomToolModal';

interface TabbedAgentEditorProps {
  agent: CallAgent;
  onUpdate: (section: string, data: any) => Promise<void>;
  onClose: () => void;
}

type TabType = 'basic' | 'voice' | 'conversation' | 'behavior' | 'knowledge';

interface EditState {
  section: TabType | null;
  data: any;
  loading: boolean;
  error: string | null;
}

export default function TabbedAgentEditor({ agent, onUpdate, onClose }: TabbedAgentEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [editState, setEditState] = useState<EditState>({
    section: null,
    data: {},
    loading: false,
    error: null
  });

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [loadingCustomTools, setLoadingCustomTools] = useState(false);
  const [showCreateToolModal, setShowCreateToolModal] = useState(false);
  
  // Knowledge base data
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  
  const [formData, setFormData] = useState({
    basic: {
      name: agent.name,
      description: agent.description,
      status: agent.status
    },
    voice: {
      voiceId: agent.voiceConfig.voiceId,
      voiceName: agent.voiceConfig.voiceName,
      stability: agent.voiceConfig.stability,
      similarityBoost: agent.voiceConfig.similarity,
      style: (agent.voiceConfig as any).style || 0,
      useSpeakerBoost: (agent.voiceConfig as any).useSpeakerBoost || false
    },
    conversation: {
      systemPrompt: agent.conversationConfig.systemPrompt,
      firstMessage: agent.conversationConfig.firstMessage,
      language: agent.conversationConfig.language
    },
    behavior: {
      // System tools
      systemTools: {
        endCall: agent.behaviorSettings?.systemTools?.endCall ?? true,
        detectLanguage: agent.behaviorSettings?.systemTools?.detectLanguage ?? false,
        skipTurn: agent.behaviorSettings?.systemTools?.skipTurn ?? false,
        transferToAgent: agent.behaviorSettings?.systemTools?.transferToAgent ?? false,
        transferToNumber: agent.behaviorSettings?.systemTools?.transferToNumber ?? false,
        playKeypardTouchTone: agent.behaviorSettings?.systemTools?.playKeypardTouchTone ?? false,
        voicemailDetection: agent.behaviorSettings?.systemTools?.voicemailDetection ?? true,
      },
      // Legacy/compatibility settings
      endCallOnGoodbye: agent.behaviorSettings?.endCallOnGoodbye ?? true,
      voicemailDetection: agent.behaviorSettings?.voicemailDetection ?? true,
      voicemailMessage: agent.behaviorSettings?.voicemailMessage || 'Hi, this is an automated message. I\'ll try calling you back later. Thanks!',
      transferEnabled: agent.behaviorSettings?.transferEnabled ?? false,
      transferNumbers: agent.behaviorSettings?.transferNumbers || [],
      // Advanced settings
      interruptionSensitivity: agent.behaviorSettings?.interruptionSensitivity || 'medium',
      silenceTimeoutSeconds: agent.behaviorSettings?.silenceTimeoutSeconds || 30,
      maxRetries: agent.behaviorSettings?.maxRetries || 3,
      // Custom tools
      customToolIds: agent.behaviorSettings?.customToolIds || []
    },
    knowledge: {
      useBusinessInfo: agent.conversationConfig?.knowledgeBase?.useBusinessInfo || false,
      useProducts: agent.conversationConfig?.knowledgeBase?.useProducts || false,
      selectedProductIds: agent.conversationConfig?.knowledgeBase?.selectedProductIds || [],
      useFAQs: agent.conversationConfig?.knowledgeBase?.useFAQs || false,
      selectedFAQCategories: agent.conversationConfig?.knowledgeBase?.selectedFAQCategories || [],
      useBrandGuidelines: agent.conversationConfig?.knowledgeBase?.useBrandGuidelines || false,
      customKnowledge: agent.conversationConfig?.knowledgeBase?.customKnowledge || '',
      elevenlabsKnowledgeBases: agent.conversationConfig?.knowledgeBase?.elevenlabsKnowledgeBases || []
    }
  });

  const tabs = [
    {
      id: 'basic' as TabType,
      label: 'Basic Info',
      icon: User,
      color: 'text-blue-600'
    },
    {
      id: 'voice' as TabType,
      label: 'Voice Settings',
      icon: Mic,
      color: 'text-purple-600'
    },
    {
      id: 'conversation' as TabType,
      label: 'Conversation',
      icon: MessageSquare,
      color: 'text-green-600'
    },
    {
      id: 'behavior' as TabType,
      label: 'Behavior',
      icon: Settings,
      color: 'text-orange-600'
    },
    {
      id: 'knowledge' as TabType,
      label: 'Knowledge Base',
      icon: Database,
      color: 'text-indigo-600'
    }
  ];

  // Load voices when voice tab is active
  useEffect(() => {
    if (activeTab === 'voice' && voices.length === 0) {
      const loadVoices = async () => {
        try {
          setLoadingVoices(true);
          const voicesData = await voicesAPI.getVoices();
          setVoices(voicesData);
        } catch (error) {
          console.error('Failed to load voices:', error);
        } finally {
          setLoadingVoices(false);
        }
      };
      loadVoices();
    }
  }, [activeTab, voices.length]);

  // Load custom tools when behavior tab is active
  useEffect(() => {
    if (activeTab === 'behavior' && customTools.length === 0) {
      const loadCustomTools = async () => {
        try {
          setLoadingCustomTools(true);
          const toolsData = await customToolsAPI.getCustomTools();
          setCustomTools(toolsData);
        } catch (error) {
          console.error('Failed to load custom tools:', error);
        } finally {
          setLoadingCustomTools(false);
        }
      };
      loadCustomTools();
    }
  }, [activeTab, customTools.length]);

  // Load knowledge data when knowledge tab is active
  useEffect(() => {
    if (activeTab === 'knowledge' && !businessInfo && !products.length && !faqs.length && !brandGuidelines) {
      const loadKnowledgeData = async () => {
        try {
          setLoadingKnowledge(true);
          
          const [businessData, productsData, faqsData, brandData] = await Promise.allSettled([
            knowledgeAPI.getBusinessInfo(),
            knowledgeAPI.getProducts(),
            knowledgeAPI.getFAQs(),
            knowledgeAPI.getBrandGuidelines()
          ]);

          if (businessData.status === 'fulfilled') {
            setBusinessInfo(businessData.value);
          }
          
          if (productsData.status === 'fulfilled') {
            setProducts(productsData.value || []);
          }
          
          if (faqsData.status === 'fulfilled') {
            setFaqs(faqsData.value || []);
          }
          
          if (brandData.status === 'fulfilled') {
            setBrandGuidelines(brandData.value);
          }
          
        } catch (error) {
          console.error('Failed to load knowledge data:', error);
        } finally {
          setLoadingKnowledge(false);
        }
      };
      
      loadKnowledgeData();
    }
  }, [activeTab, businessInfo, products.length, faqs.length, brandGuidelines]);

  const handleInputChange = (section: TabType, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveSection = async (section: TabType) => {
    setEditState({ section, data: {}, loading: true, error: null });
    
    try {
      await onUpdate(section, formData[section]);
      setEditState({ section, data: {}, loading: false, error: null });
    } catch (error) {
      setEditState({ 
        section, 
        data: {}, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to save changes' 
      });
    }
  };

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
      
      const previewText = "Hello! This is a voice preview. How do you like the sound of this voice?";
      const audioBlob = await voicesAPI.generateVoicePreview(voiceId, previewText);
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
      };
      
      await audio.play();
    } catch (error) {
      console.error('Failed to play voice preview:', error);
      setPlayingVoice(null);
    }
  };

  const handleToolCreated = (newTool: CustomTool) => {
    // Add the new tool to the list
    setCustomTools(prev => [...prev, newTool]);
    
    // Automatically add it to the agent's custom tools
    const newCustomToolIds = [...formData.behavior.customToolIds, newTool.elevenlabsToolId];
    handleInputChange('behavior', 'customToolIds', newCustomToolIds);
    
    // Close the modal
    setShowCreateToolModal(false);
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agent Name
        </label>
        <input
          type="text"
          value={formData.basic.name}
          onChange={(e) => handleInputChange('basic', 'name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter agent name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.basic.description}
          onChange={(e) => handleInputChange('basic', 'description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe your agent's purpose and capabilities"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={formData.basic.status}
          onChange={(e) => handleInputChange('basic', 'status', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
  );

  const renderVoiceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Select Voice
        </label>
        
        {loadingVoices ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {voices.map((voice) => (
              <div
                key={voice.voice_id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  formData.voice.voiceId === voice.voice_id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  handleInputChange('voice', 'voiceId', voice.voice_id);
                  handleInputChange('voice', 'voiceName', voice.name);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{voice.name}</h4>
                    {voice.labels && (
                      <p className="text-sm text-gray-500">
                        {Object.entries(voice.labels).map(([key, value]) => 
                          `${key}: ${value}`
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoicePreview(voice.voice_id);
                    }}
                    className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded"
                    disabled={playingVoice === voice.voice_id}
                  >
                    {playingVoice === voice.voice_id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stability: {formData.voice.stability}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={formData.voice.stability}
          onChange={(e) => handleInputChange('voice', 'stability', parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Similarity Boost: {formData.voice.similarityBoost}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={formData.voice.similarityBoost}
          onChange={(e) => handleInputChange('voice', 'similarityBoost', parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Style: {formData.voice.style}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={formData.voice.style}
          onChange={(e) => handleInputChange('voice', 'style', parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.voice.useSpeakerBoost}
            onChange={(e) => handleInputChange('voice', 'useSpeakerBoost', e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-gray-700">Use Speaker Boost</span>
        </label>
      </div>
    </div>
  );

  const renderConversationSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          System Prompt
        </label>
        <textarea
          value={formData.conversation.systemPrompt}
          onChange={(e) => handleInputChange('conversation', 'systemPrompt', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Define how your agent should behave and respond"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          First Message
        </label>
        <textarea
          value={formData.conversation.firstMessage}
          onChange={(e) => handleInputChange('conversation', 'firstMessage', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="What the agent says when a call starts"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Language
        </label>
        <select
          value={formData.conversation.language}
          onChange={(e) => handleInputChange('conversation', 'language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
        </select>
      </div>
    </div>
  );

  const renderBehaviorSettings = () => (
    <div className="space-y-8">
      {/* System Tools */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">System Tools</h4>
        <div className="grid grid-cols-1 gap-4">
          {[
            { key: 'endCall', label: 'End Call Tool', description: 'Allow agent to end calls when appropriate' },
            { key: 'detectLanguage', label: 'Language Detection', description: 'Automatically detect customer language' },
            { key: 'skipTurn', label: 'Skip Turn', description: 'Allow agent to skip speaking turns' },
            { key: 'transferToAgent', label: 'Transfer to Human Agent', description: 'Enable transferring to human agents' },
            { key: 'transferToNumber', label: 'Transfer to Number', description: 'Enable transferring to specific numbers' },
            { key: 'playKeypardTouchTone', label: 'Keypad Touch Tone', description: 'Play touch tone sounds for keypad input' },
            { key: 'voicemailDetection', label: 'Voicemail Detection', description: 'Detect and handle voicemail systems' }
          ].map((tool) => (
            <label key={tool.key} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formData.behavior.systemTools[tool.key as keyof typeof formData.behavior.systemTools]}
                onChange={(e) => {
                  const newSystemTools = {
                    ...formData.behavior.systemTools,
                    [tool.key]: e.target.checked
                  };
                  handleInputChange('behavior', 'systemTools', newSystemTools);
                }}
                className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{tool.label}</div>
                <div className="text-sm text-gray-500">{tool.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Transfer Settings */}
      {(formData.behavior.systemTools.transferToAgent || formData.behavior.systemTools.transferToNumber) && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Transfer Settings</h4>
          <div className="space-y-4">
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interruption Sensitivity
            </label>
            <select
              value={formData.behavior.interruptionSensitivity}
              onChange={(e) => handleInputChange('behavior', 'interruptionSensitivity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="low">Low - Continue speaking with background noise</option>
              <option value="medium">Medium - Balanced sensitivity</option>
              <option value="high">High - Very responsive to customer sounds</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Silence Timeout ({formData.behavior.silenceTimeoutSeconds}s)
            </label>
            <input
              type="range"
              min="10"
              max="60"
              value={formData.behavior.silenceTimeoutSeconds}
              onChange={(e) => handleInputChange('behavior', 'silenceTimeoutSeconds', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Retries
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.behavior.maxRetries}
              onChange={(e) => handleInputChange('behavior', 'maxRetries', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voicemail Message
            </label>
            <textarea
              value={formData.behavior.voicemailMessage}
              onChange={(e) => handleInputChange('behavior', 'voicemailMessage', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Message to leave on voicemail..."
            />
          </div>
        </div>
      </div>

      {/* Custom Tools */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Custom Webhook Tools</h4>
          <button
            onClick={() => setShowCreateToolModal(true)}
            className="btn-primary text-sm px-3 py-2"
          >
            Create Tool
          </button>
        </div>
        
        {loadingCustomTools ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {customTools.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No custom tools created yet</p>
                <p className="text-sm">Create your first webhook tool to get started</p>
              </div>
            ) : (
              customTools.map((tool) => (
                <label key={tool.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.behavior.customToolIds.includes(tool.elevenlabsToolId)}
                    onChange={(e) => {
                      const newCustomToolIds = e.target.checked
                        ? [...formData.behavior.customToolIds, tool.elevenlabsToolId]
                        : formData.behavior.customToolIds.filter(id => id !== tool.elevenlabsToolId);
                      handleInputChange('behavior', 'customToolIds', newCustomToolIds);
                    }}
                    className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{tool.name}</div>
                    <div className="text-sm text-gray-500">{tool.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {tool.method} {tool.webhookUrl}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderKnowledgeBase = () => {
    if (loadingKnowledge) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    const faqCategories = [...new Set(faqs.map(faq => faq.category))];

    return (
      <div className="space-y-8">
        {/* Business Information */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h4>
          {businessInfo ? (
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formData.knowledge.useBusinessInfo}
                onChange={(e) => handleInputChange('knowledge', 'useBusinessInfo', e.target.checked)}
                className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Company Information</div>
                <div className="text-sm text-gray-600 mt-1">
                  {businessInfo.companyName} - {businessInfo.industry}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Include company details, mission, and contact information in agent knowledge
                </div>
              </div>
            </label>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              <p>No business information configured</p>
              <p className="text-sm">Set up your business info in the Knowledge Hub</p>
            </div>
          )}
        </div>

        {/* Products */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Products & Services</h4>
          {products.length > 0 ? (
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.knowledge.useProducts}
                  onChange={(e) => {
                    handleInputChange('knowledge', 'useProducts', e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange('knowledge', 'selectedProductIds', []);
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-gray-900">Include products & services</span>
              </label>
              
              {formData.knowledge.useProducts && (
                <div className="ml-6 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Select products to include:</div>
                  {products.map((product) => (
                    <label key={product.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.knowledge.selectedProductIds.includes(product.id)}
                        onChange={(e) => {
                          const newSelected = e.target.checked
                            ? [...formData.knowledge.selectedProductIds, product.id]
                            : formData.knowledge.selectedProductIds.filter(id => id !== product.id);
                          handleInputChange('knowledge', 'selectedProductIds', newSelected);
                        }}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-gray-500 text-xs">{product.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              <p>No products configured</p>
              <p className="text-sm">Add products in the Knowledge Hub</p>
            </div>
          )}
        </div>

        {/* FAQs */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h4>
          {faqs.length > 0 ? (
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.knowledge.useFAQs}
                  onChange={(e) => {
                    handleInputChange('knowledge', 'useFAQs', e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange('knowledge', 'selectedFAQCategories', []);
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-gray-900">Include FAQs</span>
              </label>
              
              {formData.knowledge.useFAQs && (
                <div className="ml-6 space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Select FAQ categories:</div>
                  {faqCategories.map((category) => (
                    <label key={category} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.knowledge.selectedFAQCategories.includes(category)}
                        onChange={(e) => {
                          const newSelected = e.target.checked
                            ? [...formData.knowledge.selectedFAQCategories, category]
                            : formData.knowledge.selectedFAQCategories.filter(cat => cat !== category);
                          handleInputChange('knowledge', 'selectedFAQCategories', newSelected);
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-medium capitalize">{category}</span>
                        <span className="text-gray-500 ml-2">
                          ({faqs.filter(faq => faq.category === category).length} questions)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              <p>No FAQs configured</p>
              <p className="text-sm">Add FAQs in the Knowledge Hub</p>
            </div>
          )}
        </div>

        {/* Brand Guidelines */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Brand Guidelines</h4>
          {brandGuidelines ? (
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formData.knowledge.useBrandGuidelines}
                onChange={(e) => handleInputChange('knowledge', 'useBrandGuidelines', e.target.checked)}
                className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Brand Voice & Guidelines</div>
                <div className="text-sm text-gray-600 mt-1">
                  Voice: {brandGuidelines.voice} | Tone: {brandGuidelines.tone}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Include brand voice, communication style, and guidelines
                </div>
              </div>
            </label>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              <p>No brand guidelines configured</p>
              <p className="text-sm">Set up brand guidelines in the Knowledge Hub</p>
            </div>
          )}
        </div>

        {/* Custom Knowledge */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Custom Knowledge</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information
            </label>
            <textarea
              value={formData.knowledge.customKnowledge}
              onChange={(e) => handleInputChange('knowledge', 'customKnowledge', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add any additional information the agent should know..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Any specific knowledge, processes, or information not covered above
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo();
      case 'voice':
        return renderVoiceSettings();
      case 'conversation':
        return renderConversationSettings();
      case 'behavior':
        return renderBehaviorSettings();
      case 'knowledge':
        return renderKnowledgeBase();
      default:
        return <div>Select a tab to edit</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Agent: {agent.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex" style={{ height: 'calc(90vh - 120px)' }}>
          {/* Sidebar Tabs */}
          <div className="w-64 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? tab.color : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto">
              {editState.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">{editState.error}</span>
                </div>
              )}
              
              {renderTabContent()}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Changes are saved automatically when you click Save Section
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleSaveSection(activeTab)}
                    disabled={editState.loading && editState.section === activeTab}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    {editState.loading && editState.section === activeTab ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save {tabs.find(t => t.id === activeTab)?.label}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tool Creation Modal */}
      <CustomToolModal
        isOpen={showCreateToolModal}
        onClose={() => setShowCreateToolModal(false)}
        onToolCreated={handleToolCreated}
      />
    </div>
  );
}