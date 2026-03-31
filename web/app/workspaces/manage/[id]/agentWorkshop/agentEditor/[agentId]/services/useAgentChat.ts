/**
 * useAgentChat Hook
 *
 * Manages chat state and AI interactions for agent configuration.
 * Processes user messages and executes configuration changes.
 */

'use client';

import { useState, useCallback } from 'react';
import { Agent, ChatMessage } from '../types';

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  isProcessing: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

// Generate unique ID for messages
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Initial welcome message
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm here to help you configure your AI agent. You can ask me to:

- Change the agent's name
- Update voice settings
- Modify conversation parameters
- Configure tools and integrations
- Set up channels

What would you like to configure?`,
  timestamp: new Date(),
};

export function useAgentChat(
  agent: Agent | null,
  updateAgent: (updates: Partial<Agent>) => void,
  updateName: (name: string) => Promise<void>,
  updateSystemPrompt: (prompt: string) => Promise<void>
): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process user message and determine action
  const processUserMessage = useCallback(
    async (content: string): Promise<{ response: string; action?: string; changes?: Record<string, any> }> => {
      const lowerContent = content.toLowerCase();

      // Name change detection
      if (lowerContent.includes('name') && (lowerContent.includes('change') || lowerContent.includes('rename') || lowerContent.includes('update') || lowerContent.includes('set'))) {
        // Extract name from various patterns
        const patterns = [
          /(?:change|rename|update|set)\s+(?:the\s+)?(?:agent(?:'s)?\s+)?name\s+to\s+["']?([^"'\n]+)["']?/i,
          /name\s+(?:should\s+be|to)\s+["']?([^"'\n]+)["']?/i,
          /call\s+(?:it|the agent)\s+["']?([^"'\n]+)["']?/i,
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            const newName = match[1].trim();
            try {
              await updateName(newName);
              return {
                response: `Done! I've updated the agent's name to "${newName}". You can see the change reflected in the config panel on the right.`,
                action: 'updateName',
                changes: { name: newName },
              };
            } catch (error) {
              return {
                response: `I encountered an error updating the name: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
              };
            }
          }
        }

        return {
          response: `I'd be happy to change the agent's name. What would you like to name it? You can say something like "Change the name to Sales Agent" or "Rename it to Customer Support".`,
        };
      }

      // Temperature change detection
      if (lowerContent.includes('temperature')) {
        const tempMatch = content.match(/temperature\s+(?:to\s+)?(\d+(?:\.\d+)?)/i);
        if (tempMatch) {
          const temp = parseFloat(tempMatch[1]);
          if (temp >= 0 && temp <= 1) {
            updateAgent({
              llmSettings: {
                ...agent?.llmSettings,
                temperature: temp,
              },
            });
            return {
              response: `I've set the temperature to ${temp}. Remember to save your changes when you're done configuring.`,
              action: 'updateTemperature',
              changes: { temperature: temp },
            };
          }
        }
        return {
          response: `Temperature controls how creative the agent's responses are. It should be a value between 0 (deterministic) and 1 (creative). What temperature would you like to set?`,
        };
      }

      // Language change detection
      if (lowerContent.includes('language')) {
        const languages: Record<string, string> = {
          english: 'en',
          spanish: 'es',
          french: 'fr',
          german: 'de',
        };

        for (const [langName, langCode] of Object.entries(languages)) {
          if (lowerContent.includes(langName)) {
            updateAgent({
              agentSettings: {
                ...agent?.agentSettings,
                language: langCode,
              },
            });
            return {
              response: `I've set the language to ${langName.charAt(0).toUpperCase() + langName.slice(1)}. The agent will now respond in ${langName}.`,
              action: 'updateLanguage',
              changes: { language: langCode },
            };
          }
        }

        return {
          response: `I can set the agent's language. Currently supported languages are: English, Spanish, French, and German. Which would you like?`,
        };
      }

      // First message change detection
      if (lowerContent.includes('first message') || lowerContent.includes('greeting') || lowerContent.includes('opening')) {
        const messageMatch = content.match(/(?:first message|greeting|opening)\s+(?:to\s+)?["']([^"']+)["']/i);
        if (messageMatch) {
          const firstMessage = messageMatch[1];
          updateAgent({
            agentSettings: {
              ...agent?.agentSettings,
              first_message: firstMessage,
            },
          });
          return {
            response: `I've updated the first message to: "${firstMessage}"`,
            action: 'updateFirstMessage',
            changes: { first_message: firstMessage },
          };
        }
        return {
          response: `What would you like the agent to say when starting a conversation? Enclose your message in quotes, like: Set the first message to "Hello, how can I help you today?"`,
        };
      }

      // System prompt change detection
      if (lowerContent.includes('system prompt') || lowerContent.includes('personality') || lowerContent.includes('instructions')) {
        const promptMatch = content.match(/(?:system prompt|personality|instructions)\s+(?:to\s+)?["']([^"']+)["']/i);
        if (promptMatch) {
          const prompt = promptMatch[1];
          try {
            await updateSystemPrompt(prompt);
            return {
              response: `I've updated the system prompt. The agent will now follow these new instructions.`,
              action: 'updateSystemPrompt',
              changes: { prompt },
            };
          } catch (error) {
            return {
              response: `I encountered an error updating the system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        }
        return {
          response: `The system prompt defines the agent's personality and behavior. What instructions would you like to give it? Enclose in quotes for exact text.`,
        };
      }

      // Voice settings
      if (lowerContent.includes('voice') || lowerContent.includes('speed') || lowerContent.includes('stability')) {
        return {
          response: `Voice configuration includes:\n- **Speed**: How fast the agent speaks (0.5x to 2x)\n- **Stability**: Voice consistency (0 = variable, 1 = stable)\n- **Similarity**: How close to the original voice\n\nYou can adjust these in the Voice section of the config panel, or tell me specific values like "Set speed to 1.2".`,
        };
      }

      // Tools configuration
      if (lowerContent.includes('tool')) {
        return {
          response: `Tools extend your agent's capabilities. Built-in tools include:\n- **end_call**: Lets the agent end conversations\n- **language_detection**: Auto-detect and switch languages\n\nYou can enable/disable these in the Tools section. Would you like me to enable or disable any specific tools?`,
        };
      }

      // Channel configuration
      if (lowerContent.includes('channel') || lowerContent.includes('phone') || lowerContent.includes('sms') || lowerContent.includes('email')) {
        return {
          response: `Channels determine how users can reach your agent:\n- **Phone**: Voice calls\n- **SMS**: Text messages\n- **Email**: Email conversations\n- **Webhook**: Custom integrations\n\nYou can configure these in the Channels section of the config panel.`,
        };
      }

      // Help / What can you do
      if (lowerContent.includes('help') || lowerContent.includes('what can you')) {
        return {
          response: `I can help you configure your agent through natural conversation. Try saying things like:\n\n- "Change the name to Customer Support"\n- "Set temperature to 0.5"\n- "Switch language to Spanish"\n- "Set the first message to 'Hello, how can I help?'"\n\nI'll make the changes and you'll see them update in real-time on the config panel!`,
        };
      }

      // Default response
      return {
        response: `I'm not sure how to help with that specific request. I can help you:\n\n- Change the agent's name\n- Adjust voice and conversation settings\n- Configure tools and channels\n\nCould you rephrase what you'd like to configure?`,
      };
    },
    [agent, updateAgent, updateName, updateSystemPrompt]
  );

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isProcessing) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        // Process and get response
        const result = await processUserMessage(content);

        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          metadata: result.action
            ? {
                action: result.action,
                changes: result.changes,
              }
            : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Error processing message:', error);
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, processUserMessage]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  return {
    messages,
    isProcessing,
    sendMessage,
    clearMessages,
  };
}
