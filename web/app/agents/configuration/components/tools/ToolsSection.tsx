'use client';

import { Phone, Languages, SkipForward, UserCheck, PhoneCall, Hash, Voicemail, PhoneOff } from 'lucide-react';
import { ConfigurationSectionProps } from '../../types';

export default function ToolsSection({ agentId, config, onUpdate }: ConfigurationSectionProps) {
  
  const systemTools = [
    { 
      id: 'end_call', 
      name: 'End Call', 
      description: 'Gives agent the ability to end the call with the user.',
      icon: PhoneOff,
      color: 'red'
    },
    { 
      id: 'language_detection', 
      name: 'Detect Language', 
      description: 'Gives agent the ability to change the language during conversation.',
      icon: Languages,
      color: 'blue'
    },
    { 
      id: 'skip_turn', 
      name: 'Skip Turn', 
      description: 'Agent will skip its turn if user explicitly indicates they need a moment.',
      icon: SkipForward,
      color: 'yellow'
    },
    { 
      id: 'transfer_to_agent', 
      name: 'Transfer to Agent', 
      description: 'Gives agent the ability to transfer the call to another AI agent.',
      icon: UserCheck,
      color: 'green'
    },
    { 
      id: 'transfer_to_number', 
      name: 'Transfer to Number', 
      description: 'Gives agent the ability to transfer the call to a human.',
      icon: PhoneCall,
      color: 'purple'
    },
    { 
      id: 'play_keypad_touch_tone', 
      name: 'Play Keypad Touch Tone', 
      description: 'Gives agent the ability to play keypad touch tones during a phone call.',
      icon: Hash,
      color: 'indigo'
    },
    { 
      id: 'voicemail_detection', 
      name: 'Voicemail Detection', 
      description: 'Allows agent to detect voicemail systems and optionally leave a message.',
      icon: Voicemail,
      color: 'orange'
    },
  ];

  const handleBuiltInToolUpdate = (toolId: string, enabled: boolean) => {
    const currentBuiltInTools = config.conversation?.builtInTools || {};
    
    const updatedBuiltInTools = { ...currentBuiltInTools };
    
    if (enabled) {
      // Set the tool with its configuration
      updatedBuiltInTools[toolId] = {
        name: toolId,
        description: systemTools.find(t => t.id === toolId)?.description || ''
      };
    } else {
      // Set to null to disable (11Labs expects null for disabled tools)
      updatedBuiltInTools[toolId] = null;
    }
    
    onUpdate({
      conversation: {
        ...config.conversation,
        builtInTools: updatedBuiltInTools
      }
    });
  };

  const isToolEnabled = (toolId: string): boolean => {
    const builtInTools = config.conversation?.builtInTools || {};
    return builtInTools[toolId] !== null && builtInTools[toolId] !== undefined;
  };

  const getColorClasses = (color: string, enabled: boolean) => {
    const baseClasses = 'w-3 h-3 rounded-full flex-shrink-0';
    const colorMap = {
      red: enabled ? 'bg-red-500' : 'bg-gray-300',
      blue: enabled ? 'bg-blue-500' : 'bg-gray-300',
      yellow: enabled ? 'bg-yellow-500' : 'bg-gray-300',
      green: enabled ? 'bg-green-500' : 'bg-gray-300',
      purple: enabled ? 'bg-purple-500' : 'bg-gray-300',
      indigo: enabled ? 'bg-primary-500' : 'bg-gray-300',
      orange: enabled ? 'bg-orange-500' : 'bg-gray-300',
    };
    return `${baseClasses} ${colorMap[color as keyof typeof colorMap] || 'bg-gray-300'}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">System Tools</h3>
        <p className="text-gray-600 mt-1">Enable system tools to let the agent perform specific actions during conversations.</p>
      </div>
      
      {/* System Tools */}
      <div className="space-y-4">
        {systemTools.map((tool) => {
          const Icon = tool.icon;
          const isEnabled = isToolEnabled(tool.id);
          
          return (
            <div key={tool.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={getColorClasses(tool.color, isEnabled)} />
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    <Icon className={`h-5 w-5 ${isEnabled ? 'text-gray-700' : 'text-gray-400'}`} />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{tool.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md">{tool.description}</p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => handleBuiltInToolUpdate(tool.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          );
        })}
      </div>
      
      {/* Info about enabled tools */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <p className="text-sm text-blue-800 font-medium">How System Tools Work</p>
            <p className="text-xs text-blue-700 mt-1">
              When enabled, these tools become available to your agent during conversations. 
              The agent will automatically use them when appropriate based on the conversation context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}