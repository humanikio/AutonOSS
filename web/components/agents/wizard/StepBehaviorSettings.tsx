'use client';

import { useState, useEffect } from 'react';
import { PhoneOff, Voicemail, ArrowRightLeft, Mic, Clock, RotateCcw, Settings, Users, Phone, Volume2, Languages, SkipForward, Webhook, Plus } from 'lucide-react';
import { CallAgentRequest } from '@/types';

interface StepBehaviorSettingsProps {
  data: Partial<CallAgentRequest>;
  onUpdate: (data: Partial<CallAgentRequest>) => void;
}

export default function StepBehaviorSettings({ data, onUpdate }: StepBehaviorSettingsProps) {
  const [behaviorSettings, setBehaviorSettings] = useState({
    // System tools (ElevenLabs built-in tools)
    systemTools: {
      endCall: data.behaviorSettings?.systemTools?.endCall ?? true,
      detectLanguage: data.behaviorSettings?.systemTools?.detectLanguage ?? false,
      skipTurn: data.behaviorSettings?.systemTools?.skipTurn ?? false,
      transferToAgent: data.behaviorSettings?.systemTools?.transferToAgent ?? false,
      transferToNumber: data.behaviorSettings?.systemTools?.transferToNumber ?? false,
      playKeypardTouchTone: data.behaviorSettings?.systemTools?.playKeypardTouchTone ?? false,
      voicemailDetection: data.behaviorSettings?.systemTools?.voicemailDetection ?? true,
    },
    // Legacy settings (for backward compatibility)
    endCallOnGoodbye: data.behaviorSettings?.endCallOnGoodbye ?? true,
    voicemailDetection: data.behaviorSettings?.voicemailDetection ?? true,
    voicemailMessage: data.behaviorSettings?.voicemailMessage || 'Hi, this is an automated message. I\'ll try calling you back later. Thanks!',
    transferEnabled: data.behaviorSettings?.transferEnabled ?? false,
    transferNumbers: data.behaviorSettings?.transferNumbers || [],
    // Custom webhook tools
    customToolIds: data.behaviorSettings?.customToolIds || [],
    interruptionSensitivity: data.behaviorSettings?.interruptionSensitivity || 'medium' as const,
    silenceTimeoutSeconds: data.behaviorSettings?.silenceTimeoutSeconds || 30,
    maxRetries: data.behaviorSettings?.maxRetries || 3
  });

  const [newTransferNumber, setNewTransferNumber] = useState('');
  const [showToolModal, setShowToolModal] = useState(false);
  const [availableTools, setAvailableTools] = useState<any[]>([]);

  useEffect(() => {
    onUpdate({
      behaviorSettings: behaviorSettings
    });
  }, [behaviorSettings, onUpdate]);

  const updateSetting = (setting: string, value: any) => {
    setBehaviorSettings(prev => ({ ...prev, [setting]: value }));
  };

  const updateSystemTool = (tool: string, value: boolean) => {
    setBehaviorSettings(prev => ({
      ...prev,
      systemTools: {
        ...prev.systemTools,
        [tool]: value
      }
    }));
  };

  const addTransferNumber = () => {
    if (newTransferNumber.trim() && !behaviorSettings.transferNumbers.includes(newTransferNumber.trim())) {
      updateSetting('transferNumbers', [...behaviorSettings.transferNumbers, newTransferNumber.trim()]);
      setNewTransferNumber('');
    }
  };

  const removeTransferNumber = (number: string) => {
    updateSetting('transferNumbers', behaviorSettings.transferNumbers.filter(n => n !== number));
  };

  const interruptionLevels = [
    {
      value: 'low',
      label: 'Low Sensitivity',
      description: 'Agent continues speaking even with background noise'
    },
    {
      value: 'medium',
      label: 'Medium Sensitivity',
      description: 'Balanced - stops for clear customer speech'
    },
    {
      value: 'high',
      label: 'High Sensitivity',
      description: 'Very responsive - stops for any customer sound'
    }
  ];

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Configure Call Behavior
        </h3>
        <p className="text-gray-600 mb-6">
          Set up how your agent handles various call scenarios and interactions.
        </p>
      </div>

      {/* System Tools Section */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900">ElevenLabs System Tools</h4>
            <p className="text-sm text-gray-500">Enable built-in capabilities for your agent</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* End Call */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PhoneOff className="h-4 w-4 text-red-600" />
                <span className="font-medium text-gray-900 text-sm">End Call</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.endCall}
                  onChange={(e) => updateSystemTool('endCall', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Allow agent to end calls when appropriate</p>
          </div>

          {/* Detect Language */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900 text-sm">Detect Language</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.detectLanguage}
                  onChange={(e) => updateSystemTool('detectLanguage', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Automatically detect caller's language</p>
          </div>

          {/* Skip Turn */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SkipForward className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-gray-900 text-sm">Skip Turn</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.skipTurn}
                  onChange={(e) => updateSystemTool('skipTurn', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Allow agent to skip its turn in conversation</p>
          </div>

          {/* Transfer to Agent */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900 text-sm">Transfer to Agent</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.transferToAgent}
                  onChange={(e) => updateSystemTool('transferToAgent', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Transfer call to a human agent</p>
          </div>

          {/* Transfer to Number */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-gray-900 text-sm">Transfer to Number</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.transferToNumber}
                  onChange={(e) => updateSystemTool('transferToNumber', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Transfer call to specific phone number</p>
          </div>

          {/* Play Keypad Touch Tone */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-gray-900 text-sm">Play Keypad Tone</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.playKeypardTouchTone}
                  onChange={(e) => updateSystemTool('playKeypardTouchTone', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Play DTMF tones for keypad interactions</p>
          </div>

          {/* Voicemail Detection */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Voicemail className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-gray-900 text-sm">Voicemail Detection</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorSettings.systemTools.voicemailDetection}
                  onChange={(e) => updateSystemTool('voicemailDetection', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">Detect and handle voicemail systems</p>
          </div>
        </div>
      </div>

      {/* Custom Webhook Tools Section */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Webhook className="h-5 w-5 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Custom Webhook Tools</h4>
              <p className="text-sm text-gray-500">Connect your agent to external APIs and services</p>
            </div>
          </div>
          <button
            onClick={() => setShowToolModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Tool
          </button>
        </div>

        {behaviorSettings.customToolIds.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No custom tools configured</p>
            <p className="text-sm text-gray-400">Add webhook tools to extend your agent's capabilities</p>
          </div>
        ) : (
          <div className="space-y-2">
            {behaviorSettings.customToolIds.map((toolId, index) => (
              <div key={index} className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Webhook className="h-4 w-4 text-purple-600" />
                  <div>
                    <span className="font-medium text-purple-900">Custom Tool {index + 1}</span>
                    <p className="text-sm text-purple-700">Tool ID: {toolId}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newToolIds = behaviorSettings.customToolIds.filter((_, i) => i !== index);
                    updateSetting('customToolIds', newToolIds);
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Tools Configurations */}
      {behaviorSettings.systemTools.voicemailDetection && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Voicemail className="h-5 w-5 text-orange-600" />
            <h4 className="font-medium text-orange-900">Voicemail Configuration</h4>
          </div>
          <div>
            <label className="block text-sm font-medium text-orange-800 mb-2">
              Voicemail Message
            </label>
            <textarea
              value={behaviorSettings.voicemailMessage}
              onChange={(e) => updateSetting('voicemailMessage', e.target.value)}
              placeholder="Hi, this is [Your Company]. I'll try calling you back later. Thanks!"
              rows={2}
              className="input min-h-[60px] border-orange-300 focus:border-orange-500 focus:ring-orange-500"
            />
            <p className="text-sm text-orange-700 mt-1">
              Keep it brief - voicemail systems often have time limits (usually 30 seconds)
            </p>
          </div>
        </div>
      )}

      {behaviorSettings.systemTools.transferToAgent && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Transfer to Human Agent Configuration</h4>
          </div>
          <div className="space-y-3">
          </div>
        </div>
      )}

      {behaviorSettings.systemTools.transferToNumber && (
        <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Phone className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Transfer to Phone Number Configuration</h4>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-800 mb-2">
                Transfer Phone Numbers
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="tel"
                  value={newTransferNumber}
                  onChange={(e) => setNewTransferNumber(e.target.value)}
                  placeholder="e.g., +1-555-123-4567"
                  className="input flex-1 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                />
                <button
                  onClick={addTransferNumber}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  disabled={!newTransferNumber.trim()}
                >
                  Add
                </button>
              </div>
              
              {behaviorSettings.transferNumbers.length > 0 && (
                <div className="space-y-1">
                  {behaviorSettings.transferNumbers.map((number, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-purple-200">
                      <span className="text-sm font-mono text-purple-900">{formatPhoneNumber(number)}</span>
                      <button
                        onClick={() => removeTransferNumber(number)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-purple-700 mt-2">
                Agent will transfer calls to these numbers when unable to help or when requested
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interruption Sensitivity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Mic className="inline h-4 w-4 mr-1" />
          Interruption Sensitivity
        </label>
        <div className="space-y-2">
          {interruptionLevels.map((level) => (
            <div
              key={level.value}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                behaviorSettings.interruptionSensitivity === level.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => updateSetting('interruptionSensitivity', level.value)}
            >
              <div className="flex items-center mb-1">
                <input
                  type="radio"
                  name="interruptionSensitivity"
                  value={level.value}
                  checked={behaviorSettings.interruptionSensitivity === level.value}
                  onChange={() => updateSetting('interruptionSensitivity', level.value)}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">{level.label}</span>
              </div>
              <p className="text-sm text-gray-600 ml-6">{level.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Silence Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="inline h-4 w-4 mr-1" />
          Silence Timeout
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={behaviorSettings.silenceTimeoutSeconds}
            onChange={(e) => updateSetting('silenceTimeoutSeconds', parseInt(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-900 min-w-[80px]">
            {behaviorSettings.silenceTimeoutSeconds} seconds
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          How long to wait for customer response before prompting them
        </p>
      </div>

      {/* Max Retries */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <RotateCcw className="inline h-4 w-4 mr-1" />
          Maximum Clarification Attempts
        </label>
        <select
          value={behaviorSettings.maxRetries}
          onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value))}
          className="input w-full md:w-1/3"
        >
          <option value={1}>1 attempt</option>
          <option value={2}>2 attempts</option>
          <option value={3}>3 attempts</option>
          <option value={4}>4 attempts</option>
          <option value={5}>5 attempts</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          How many times the agent will try to clarify unclear requests before escalating
        </p>
      </div>

      {/* Behavior Summary */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">⚡ Behavior Summary</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Call ending: {behaviorSettings.endCallOnGoodbye ? 'Auto-end on goodbye' : 'Manual ending only'}</li>
          <li>• Voicemail: {behaviorSettings.voicemailDetection ? 'Detect and leave message' : 'Disabled'}</li>
          <li>• Transfer: {behaviorSettings.transferEnabled ? `Enabled (${behaviorSettings.transferNumbers.length} numbers)` : 'Disabled'}</li>
          <li>• Interruption sensitivity: {behaviorSettings.interruptionSensitivity}</li>
          <li>• Silence timeout: {behaviorSettings.silenceTimeoutSeconds} seconds</li>
          <li>• Max clarification attempts: {behaviorSettings.maxRetries}</li>
        </ul>
      </div>

      {/* Custom Tool Configuration Modal */}
      {showToolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Custom Webhook Tool</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tool Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., CRM Lookup"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="e.g., Look up customer information in CRM system"
                  rows={2}
                  className="input w-full min-h-[60px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://api.yourservice.com/webhook"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTTP Method
                </label>
                <select className="input w-full">
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowToolModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement tool creation
                  setShowToolModal(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}