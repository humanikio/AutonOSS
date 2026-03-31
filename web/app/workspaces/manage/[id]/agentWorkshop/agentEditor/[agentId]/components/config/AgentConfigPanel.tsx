/**
 * AgentConfigPanel
 *
 * Full configuration view with robot visualization and tabbed config.
 */

'use client';

import { useState } from 'react';
import { Mic, MessageCircle, Brain, Wrench, Radio, Webhook, Bot } from 'lucide-react';
import { Agent } from '../../types';
import AgentBasicInfo from './AgentBasicInfo';
import AgentVoiceConfig from './AgentVoiceConfig';
import AgentConversationConfig from './AgentConversationConfig';
import AgentKnowledgeConfig from './AgentKnowledgeConfig';
import AgentToolsConfig from './AgentToolsConfig';
import AgentChannelsConfig from './AgentChannelsConfig';
import AgentWebhooksConfig from './AgentWebhooksConfig';

interface AgentConfigPanelProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
  onUpdateName: (name: string) => Promise<void>;
  onUpdateSystemPrompt: (prompt: string) => Promise<void>;
}

const TABS = [
  { id: 'voice', label: 'Voice', icon: Mic, color: 'primary' },
  { id: 'conversation', label: 'Conversation', icon: MessageCircle, color: 'primary' },
  { id: 'knowledge', label: 'Knowledge', icon: Brain, color: 'emerald' },
  { id: 'tools', label: 'Tools', icon: Wrench, color: 'amber' },
  { id: 'channels', label: 'Channels', icon: Radio, color: 'purple' },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook, color: 'orange' },
] as const;

export default function AgentConfigPanel({
  agent,
  onUpdate,
  onUpdateName,
  onUpdateSystemPrompt,
}: AgentConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('voice');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'voice':
        return <AgentVoiceConfig agent={agent} onUpdate={onUpdate} />;
      case 'conversation':
        return <AgentConversationConfig agent={agent} onUpdate={onUpdate} onUpdateSystemPrompt={onUpdateSystemPrompt} />;
      case 'knowledge':
        return <AgentKnowledgeConfig agent={agent} onUpdate={onUpdate} />;
      case 'tools':
        return <AgentToolsConfig agent={agent} onUpdate={onUpdate} />;
      case 'channels':
        return <AgentChannelsConfig agent={agent} onUpdate={onUpdate} />;
      case 'webhooks':
        return <AgentWebhooksConfig agent={agent} onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  const getNodeStyles = (tabId: string) => {
    const styles: Record<string, { bg: string; border: string; text: string; line: string }> = {
      voice: { bg: 'bg-primary-500', border: 'border-primary-400', text: 'text-primary-500', line: 'bg-primary-400' },
      conversation: { bg: 'bg-primary-500', border: 'border-primary-400', text: 'text-primary-500', line: 'bg-primary-400' },
      knowledge: { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-500', line: 'bg-emerald-400' },
      tools: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-500', line: 'bg-amber-400' },
      channels: { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-500', line: 'bg-purple-400' },
      webhooks: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-500', line: 'bg-orange-400' },
    };
    return styles[tabId] || styles.voice;
  };

  return (
    <div className="h-full flex bg-white">
      {/* Left Side - Agent Visualization */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col relative overflow-hidden flex-shrink-0">
        {/* Agent Name Field */}
        <div className="relative z-10 p-4">
          <AgentBasicInfo agent={agent} onUpdate={onUpdate} onUpdateName={onUpdateName} />
        </div>

        {/* Background Gradient - fills below agent name */}
        <div className="absolute left-4 right-[-60px] bottom-4 top-24 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-600 via-transparent to-slate-700 opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-800/30 to-slate-900/50" />
        </div>

        {/* Robot Image Container - floats on top */}
        <div className="relative z-10 flex-1 flex items-center justify-start">
          {agent.botEntityImagePath ? (
            <img
              src={agent.botEntityImagePath}
              alt={agent.name}
              style={{
                width: '240px',
                height: '480px',
                objectFit: 'contain',
                marginLeft: '60px',
                border: '4px solid white',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}
            />
          ) : (
            <div
              style={{
                width: '240px',
                height: '480px',
                marginLeft: '60px',
                border: '4px solid white',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(51,65,85,0.5)'
              }}
            >
              <Bot className="h-24 w-24 text-slate-500" />
            </div>
          )}
        </div>

        {/* Interactive Nodes - centered with robot border */}
        <div className="absolute bottom-[460px] right-[20px] flex items-center z-20">
          <div className={`w-8 h-0.5 mr-2 ${activeTab === 'voice' ? 'bg-primary-400' : 'bg-slate-500'}`} />
          <button onClick={() => setActiveTab('voice')} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${activeTab === 'voice' ? 'bg-primary-500 border-primary-400 text-white shadow-lg' : 'bg-white border-primary-300 text-primary-500 shadow-md'}`}>
            <Mic className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute bottom-[395px] right-[20px] flex items-center z-20">
          <div className={`w-8 h-0.5 mr-2 ${activeTab === 'conversation' ? 'bg-primary-400' : 'bg-slate-500'}`} />
          <button onClick={() => setActiveTab('conversation')} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${activeTab === 'conversation' ? 'bg-primary-500 border-primary-400 text-white shadow-lg' : 'bg-white border-primary-300 text-primary-500 shadow-md'}`}>
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute bottom-[330px] right-[20px] flex items-center z-20">
          <div className={`w-8 h-0.5 mr-2 ${activeTab === 'knowledge' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <button onClick={() => setActiveTab('knowledge')} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${activeTab === 'knowledge' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-white border-emerald-300 text-emerald-500 shadow-md'}`}>
            <Brain className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute bottom-[265px] right-[20px] flex items-center z-20">
          <div className={`w-8 h-0.5 mr-2 ${activeTab === 'tools' ? 'bg-amber-400' : 'bg-slate-500'}`} />
          <button onClick={() => setActiveTab('tools')} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${activeTab === 'tools' ? 'bg-amber-500 border-amber-400 text-white shadow-lg' : 'bg-white border-amber-300 text-amber-500 shadow-md'}`}>
            <Wrench className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute bottom-[200px] right-[20px] flex items-center z-20">
          <div className={`w-8 h-0.5 mr-2 ${activeTab === 'channels' ? 'bg-purple-400' : 'bg-slate-500'}`} />
          <button onClick={() => setActiveTab('channels')} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${activeTab === 'channels' ? 'bg-purple-500 border-purple-400 text-white shadow-lg' : 'bg-white border-purple-300 text-purple-500 shadow-md'}`}>
            <Radio className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute bottom-[135px] right-[20px] flex items-center z-20">
          <div className={`w-8 h-0.5 mr-2 ${activeTab === 'webhooks' ? 'bg-orange-400' : 'bg-slate-500'}`} />
          <button onClick={() => setActiveTab('webhooks')} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${activeTab === 'webhooks' ? 'bg-orange-500 border-orange-400 text-white shadow-lg' : 'bg-white border-orange-300 text-orange-500 shadow-md'}`}>
            <Webhook className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Right Side - Config Panels */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-slate-200">
        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-6 flex-shrink-0">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
