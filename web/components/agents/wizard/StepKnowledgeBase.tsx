'use client';

import { useState, useEffect } from 'react';
import { Building2, Package, HelpCircle, Palette, Plus, RefreshCw, FileText, Link, Upload, Trash2 } from 'lucide-react';
import { CallAgentRequest, BusinessInfo, Product, FAQ, BrandGuidelines, ElevenLabsKnowledgeBase } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeAPI } from '@/lib/api/knowledge';

interface StepKnowledgeBaseProps {
  data: Partial<CallAgentRequest>;
  onUpdate: (data: Partial<CallAgentRequest>) => void;
}

export default function StepKnowledgeBase({ data, onUpdate }: StepKnowledgeBaseProps) {
  const { user } = useAuth();
  const [knowledgeSettings, setKnowledgeSettings] = useState({
    useBusinessInfo: data.conversationConfig?.knowledgeBase?.useBusinessInfo || false,
    useProducts: data.conversationConfig?.knowledgeBase?.useProducts || false,
    selectedProductIds: data.conversationConfig?.knowledgeBase?.selectedProductIds || [],
    useFAQs: data.conversationConfig?.knowledgeBase?.useFAQs || false,
    selectedFAQCategories: data.conversationConfig?.knowledgeBase?.selectedFAQCategories || [],
    useBrandGuidelines: data.conversationConfig?.knowledgeBase?.useBrandGuidelines || false,
    customKnowledge: data.conversationConfig?.knowledgeBase?.customKnowledge || '',
    elevenlabsKnowledgeBases: data.conversationConfig?.knowledgeBase?.elevenlabsKnowledgeBases || []
  });

  // Real data from API
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // ElevenLabs Knowledge Base management
  const [newKnowledgeBase, setNewKnowledgeBase] = useState<Partial<ElevenLabsKnowledgeBase>>({ 
    type: 'text', 
    name: '',
    usage_mode: 'auto'
  });
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);

  // Load knowledge data from API
  useEffect(() => {
    const loadKnowledgeData = async () => {
      try {
        setLoadingData(true);
        
        // Load all knowledge data in parallel with shorter timeout
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
        // Set empty defaults on error to prevent infinite loading
        setBusinessInfo(null);
        setProducts([]);
        setFaqs([]);
        setBrandGuidelines(null);
      } finally {
        setLoadingData(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoadingData(false);
      console.warn('Knowledge data loading timed out');
    }, 30000); // 30 second timeout

    loadKnowledgeData().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    onUpdate({
      conversationConfig: {
        ...data.conversationConfig,
        knowledgeBase: knowledgeSettings
      }
    });
  }, [knowledgeSettings]);

  const updateKnowledgeSetting = (setting: string, value: any) => {
    setKnowledgeSettings(prev => ({ ...prev, [setting]: value }));
  };

  const toggleProduct = (productId: string) => {
    const currentIds = knowledgeSettings.selectedProductIds;
    const newIds = currentIds.includes(productId)
      ? currentIds.filter(id => id !== productId)
      : [...currentIds, productId];
    updateKnowledgeSetting('selectedProductIds', newIds);
  };

  const toggleFAQCategory = (category: string) => {
    const currentCategories = knowledgeSettings.selectedFAQCategories;
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(cat => cat !== category)
      : [...currentCategories, category];
    updateKnowledgeSetting('selectedFAQCategories', newCategories);
  };

  const faqCategories = [...new Set(faqs.map(faq => faq.category))];

  // ElevenLabs Knowledge Base functions
  const addKnowledgeBase = () => {
    if (!newKnowledgeBase.name?.trim()) return;

    const kb: ElevenLabsKnowledgeBase = {
      id: Date.now().toString(),
      type: newKnowledgeBase.type!,
      name: newKnowledgeBase.name,
      usage_mode: newKnowledgeBase.usage_mode || 'auto',
      content: newKnowledgeBase.content,
      url: newKnowledgeBase.url,
      file: newKnowledgeBase.file,
      fileName: newKnowledgeBase.fileName
    };

    updateKnowledgeSetting('elevenlabsKnowledgeBases', [...knowledgeSettings.elevenlabsKnowledgeBases, kb]);
    
    // Reset form
    setNewKnowledgeBase({ type: 'text', name: '', usage_mode: 'auto' });
    setShowAddKnowledge(false);
  };

  const removeKnowledgeBase = (id: string) => {
    updateKnowledgeSetting('elevenlabsKnowledgeBases', 
      knowledgeSettings.elevenlabsKnowledgeBases.filter(kb => kb.id !== id)
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewKnowledgeBase(prev => ({
        ...prev,
        file,
        fileName: file.name,
        name: prev.name || file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const generatePromptPreview = () => {
    let prompt = 'You are an AI assistant representing ';
    
    if (knowledgeSettings.useBusinessInfo && businessInfo) {
      prompt += `${businessInfo.companyName}. `;
      prompt += `${businessInfo.description} `;
      if (businessInfo.mission) {
        prompt += `Our mission: ${businessInfo.mission} `;
      }
    } else {
      prompt += 'our company. ';
    }

    if (knowledgeSettings.useBrandGuidelines && brandGuidelines) {
      prompt += `Your communication style should be ${brandGuidelines.voice} and ${brandGuidelines.tone?.toLowerCase()}. `;
      prompt += `Our key values are: ${brandGuidelines.keyValues?.join(', ')}. `;
      if (brandGuidelines.communicationGuidelines) {
        prompt += `Communication guidelines: ${brandGuidelines.communicationGuidelines} `;
      }
      if (brandGuidelines.doNots && brandGuidelines.doNots.length > 0) {
        prompt += `Important restrictions: ${brandGuidelines.doNots.join(', ')}. `;
      }
    }

    if (knowledgeSettings.useProducts && knowledgeSettings.selectedProductIds.length > 0) {
      const selectedProducts = products.filter(p => knowledgeSettings.selectedProductIds.includes(p.id));
      prompt += `You can help customers with these products/services: `;
      selectedProducts.forEach(product => {
        prompt += `${product.name} (${product.description})`;
        if (product.price) {
          prompt += ` - $${product.price}`;
        }
        prompt += '; ';
      });
    }

    if (knowledgeSettings.useFAQs && knowledgeSettings.selectedFAQCategories.length > 0) {
      const selectedFAQs = faqs.filter(faq => knowledgeSettings.selectedFAQCategories.includes(faq.category));
      if (selectedFAQs.length > 0) {
        prompt += `\n\nFrequently Asked Questions:\n`;
        selectedFAQs.forEach(faq => {
          prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
        });
      }
    }

    if (knowledgeSettings.customKnowledge) {
      prompt += `\nAdditional context: ${knowledgeSettings.customKnowledge}`;
    }

    return prompt;
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Connect Your Knowledge Base
          </h3>
          <p className="text-gray-600 mb-6">
            Choose what information your agent should have access to. This helps it provide accurate, personalized responses.
          </p>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading your knowledge base...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Connect Your Knowledge Base
        </h3>
        <p className="text-gray-600 mb-6">
          Choose what information your agent should have access to. This helps it provide accurate, personalized responses.
        </p>
      </div>

      {/* Business Information */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Business Information</h4>
              <p className="text-sm text-gray-500">Company details, mission, and contact info</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={knowledgeSettings.useBusinessInfo}
              onChange={(e) => updateKnowledgeSetting('useBusinessInfo', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {businessInfo && (
          <div className="ml-8 space-y-2 text-sm">
            <p><span className="font-medium">Company:</span> {businessInfo.companyName}</p>
            <p><span className="font-medium">Industry:</span> {businessInfo.industry}</p>
            <p><span className="font-medium">Description:</span> {businessInfo.description}</p>
          </div>
        )}

        {!businessInfo && (
          <div className="ml-8 text-sm text-gray-500">
            No business information found. <a href="/knowledge-hub" className="text-blue-600 hover:underline">Add it here</a>
          </div>
        )}
      </div>

      {/* Products & Services */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">Products & Services</h4>
              <p className="text-sm text-gray-500">Your offerings, pricing, and features</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={knowledgeSettings.useProducts}
              onChange={(e) => updateKnowledgeSetting('useProducts', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {knowledgeSettings.useProducts && (
          <div className="ml-8 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Select products to include:</p>
            {products.map((product) => (
              <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={knowledgeSettings.selectedProductIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-gray-500"> - {product.description}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        {products.length === 0 && (
          <div className="ml-8 text-sm text-gray-500">
            No products found. <a href="/knowledge-hub" className="text-blue-600 hover:underline">Add them here</a>
          </div>
        )}
      </div>

      {/* FAQs */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium text-gray-900">Frequently Asked Questions</h4>
              <p className="text-sm text-gray-500">Common questions and answers</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={knowledgeSettings.useFAQs}
              onChange={(e) => updateKnowledgeSetting('useFAQs', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {knowledgeSettings.useFAQs && (
          <div className="ml-8 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Select FAQ categories:</p>
            {faqCategories.map((category) => (
              <label key={category} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={knowledgeSettings.selectedFAQCategories.includes(category)}
                  onChange={() => toggleFAQCategory(category)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <span className="font-medium">{category}</span>
                  <span className="text-gray-500"> ({faqs.filter(f => f.category === category).length} questions)</span>
                </div>
              </label>
            ))}
          </div>
        )}

        {faqs.length === 0 && (
          <div className="ml-8 text-sm text-gray-500">
            No FAQs found. <a href="/knowledge-hub" className="text-blue-600 hover:underline">Add them here</a>
          </div>
        )}
      </div>

      {/* Brand Guidelines */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Brand Guidelines</h4>
              <p className="text-sm text-gray-500">Voice, tone, and communication style</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={knowledgeSettings.useBrandGuidelines}
              onChange={(e) => updateKnowledgeSetting('useBrandGuidelines', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {brandGuidelines && (
          <div className="ml-8 space-y-2 text-sm">
            <p><span className="font-medium">Voice:</span> {brandGuidelines.voice}</p>
            <p><span className="font-medium">Key Values:</span> {brandGuidelines.keyValues?.join(', ')}</p>
            <p><span className="font-medium">Tone:</span> {brandGuidelines.tone}</p>
          </div>
        )}

        {!brandGuidelines && (
          <div className="ml-8 text-sm text-gray-500">
            No brand guidelines found. <a href="/knowledge-hub" className="text-blue-600 hover:underline">Add them here</a>
          </div>
        )}
      </div>

      {/* ElevenLabs Knowledge Bases */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-600" />
            <div>
              <h4 className="font-medium text-gray-900">External Knowledge Sources</h4>
              <p className="text-sm text-gray-500">Add URLs, files, or text content for your agent</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddKnowledge(!showAddKnowledge)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        </div>

        {/* Add Knowledge Base Form */}
        {showAddKnowledge && (
          <div className="border border-gray-100 rounded-lg p-4 mb-4 bg-gray-50">
            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Type</label>
                <div className="flex gap-4">
                  {(['text', 'url', 'file'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="knowledgeType"
                        value={type}
                        checked={newKnowledgeBase.type === type}
                        onChange={(e) => setNewKnowledgeBase(prev => ({ ...prev, type: e.target.value as any }))}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newKnowledgeBase.name}
                  onChange={(e) => setNewKnowledgeBase(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Give this knowledge source a name"
                  className="input w-full"
                />
              </div>

              {/* Content based on type */}
              {newKnowledgeBase.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
                  <textarea
                    value={newKnowledgeBase.content || ''}
                    onChange={(e) => setNewKnowledgeBase(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter the text content your agent should know..."
                    rows={4}
                    className="input w-full min-h-[100px]"
                  />
                </div>
              )}

              {newKnowledgeBase.type === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                  <input
                    type="url"
                    value={newKnowledgeBase.url || ''}
                    onChange={(e) => setNewKnowledgeBase(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com/documentation"
                    className="input w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ElevenLabs will crawl this URL to extract knowledge
                  </p>
                </div>
              )}

              {newKnowledgeBase.type === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {newKnowledgeBase.file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">{newKnowledgeBase.fileName}</span>
                        <button 
                          onClick={() => setNewKnowledgeBase(prev => ({ ...prev, file: undefined, fileName: undefined }))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload a file</p>
                        <p className="text-xs text-gray-500">PDF, TXT, DOC, DOCX</p>
                        <input
                          type="file"
                          accept=".pdf,.txt,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Usage Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usage Mode</label>
                <select
                  value={newKnowledgeBase.usage_mode}
                  onChange={(e) => setNewKnowledgeBase(prev => ({ ...prev, usage_mode: e.target.value as 'prompt' | 'auto' }))}
                  className="input w-full"
                >
                  <option value="auto">Auto - Agent decides when to use this knowledge</option>
                  <option value="prompt">Prompt - Always include in agent's prompt</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={addKnowledgeBase}
                  disabled={!newKnowledgeBase.name?.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Knowledge Base
                </button>
                <button
                  onClick={() => setShowAddKnowledge(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Knowledge Bases */}
        {knowledgeSettings.elevenlabsKnowledgeBases.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Added Knowledge Sources:</p>
            {knowledgeSettings.elevenlabsKnowledgeBases.map((kb) => (
              <div key={kb.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {kb.type === 'text' && <FileText className="h-5 w-5 text-blue-600" />}
                  {kb.type === 'url' && <Link className="h-5 w-5 text-green-600" />}
                  {kb.type === 'file' && <Upload className="h-5 w-5 text-purple-600" />}
                  <div>
                    <p className="font-medium text-gray-900">{kb.name}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {kb.type} • {kb.usage_mode} mode
                      {kb.type === 'url' && kb.url && (
                        <span> • {new URL(kb.url).hostname}</span>
                      )}
                      {kb.type === 'file' && kb.fileName && (
                        <span> • {kb.fileName}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeKnowledgeBase(kb.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {knowledgeSettings.elevenlabsKnowledgeBases.length === 0 && !showAddKnowledge && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No external knowledge sources added yet</p>
            <p className="text-xs">Click "Add Source" to get started</p>
          </div>
        )}
      </div>

      {/* Custom Knowledge */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Knowledge (Optional)
        </label>
        <textarea
          value={knowledgeSettings.customKnowledge}
          onChange={(e) => updateKnowledgeSetting('customKnowledge', e.target.value)}
          placeholder="Add any specific instructions, policies, or information that your agent should know..."
          rows={4}
          className="input min-h-[100px]"
        />
        <p className="mt-1 text-sm text-gray-500">
          This will be added to your agent's knowledge base along with the selected items above
        </p>
      </div>

      {/* Generated Prompt Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <h4 className="font-medium text-blue-900">Generated Knowledge Base Preview</h4>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed">
          {generatePromptPreview()}
        </p>
      </div>
    </div>
  );
}