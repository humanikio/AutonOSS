import { claude4 } from '../../../llmModels/claude4';
import { AgentConfigs } from './retrieveAgentConfigs';

/**
 * Service for generating specific agent configuration improvement suggestions
 * Uses Claude4 to provide actionable recommendations based on analysis
 */

export interface SuggestionsRequest {
  analysis: string;
  agentConfigs: AgentConfigs;
}

export interface ConfigSuggestions {
  promptChanges?: string;
  settingChanges?: {
    temperature?: number;
    llmModel?: string;
    language?: string;
    firstMessage?: string;
    voiceSettings?: {
      speed?: number;
      stability?: number;
      similarity_boost?: number;
    };
    turnSettings?: {
      turn_timeout?: number;
    };
  };
  knowledgeBaseChanges?: {
    addSources?: string[];
    improveSources?: string[];
    ragSettings?: {
      maxDocuments?: number;
      threshold?: number;
    };
  };
  toolChanges?: {
    enableTools?: string[];
    disableTools?: string[];
    customTools?: string[];
  };
  reasoning?: string;
}

export interface SuggestionsResult {
  success: boolean;
  suggestions?: ConfigSuggestions;
  error?: string;
}

export class GenerateSuggestionsService {
  /**
   * Generate specific configuration improvement suggestions
   */
  async generateSuggestions(request: SuggestionsRequest): Promise<SuggestionsResult> {
    try {
      const { analysis, agentConfigs } = request;
      
      console.log(`=� Generating improvement suggestions for agent: ${agentConfigs.agentName}`);

      // Step 1: Build suggestions prompt
      console.log('  " Step 1: Building suggestions prompt...');
      const suggestionsPrompt = this.buildSuggestionsPrompt(analysis, agentConfigs);
      
      console.log(`   Suggestions prompt built (${suggestionsPrompt.length} chars)`);

      // Step 2: Run Claude4 suggestions generation
      console.log('  " Step 2: Running Claude4 suggestions generation...');
      const suggestionsResponse = await claude4.processText(suggestionsPrompt);
      
      console.log(`   Claude4 suggestions completed (${suggestionsResponse.length} chars)`);

      // Step 3: Parse Claude4 response
      console.log('  " Step 3: Parsing suggestions response...');
      const parsedSuggestions = this.parseSuggestionsResponse(suggestionsResponse);
      
      if (!parsedSuggestions.success) {
        console.warn('� Failed to parse suggestions response');
        return {
          success: false,
          error: 'Failed to parse suggestions response'
        };
      }

      console.log(`   Suggestions parsed successfully`);
      console.log(`    - Prompt changes: ${parsedSuggestions.suggestions?.promptChanges ? 'Yes' : 'No'}`);
      console.log(`    - Setting changes: ${parsedSuggestions.suggestions?.settingChanges ? 'Yes' : 'No'}`);
      console.log(`    - Knowledge base changes: ${parsedSuggestions.suggestions?.knowledgeBaseChanges ? 'Yes' : 'No'}`);
      console.log(`    - Tool changes: ${parsedSuggestions.suggestions?.toolChanges ? 'Yes' : 'No'}`);

      return {
        success: true,
        suggestions: parsedSuggestions.suggestions
      };

    } catch (error) {
      console.error('L Error generating suggestions:', error);
      
      return {
        success: false,
        error: `Suggestions generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build comprehensive suggestions prompt for Claude4
   */
  private buildSuggestionsPrompt(analysis: string, agentConfigs: AgentConfigs): string {
    return `You are an AI configuration expert. Based on the conversation analysis, provide specific, actionable recommendations to improve the agent's configuration.

CURRENT AGENT CONFIGURATION:
" Agent Name: ${agentConfigs.agentName}
" System Prompt: ${agentConfigs.systemPrompt || 'Not set'}
" LLM Model: ${agentConfigs.llmModel} (Temperature: ${agentConfigs.temperature})
" Language: ${agentConfigs.language}
" First Message: ${agentConfigs.firstMessage || 'Not set'}
" Knowledge Base: ${agentConfigs.knowledgeBase?.length || 0} sources (RAG ${agentConfigs.ragSettings?.enabled ? 'enabled' : 'disabled'})
" Voice Settings: Model ${agentConfigs.voiceSettings?.model_id}, Speed ${agentConfigs.voiceSettings?.speed}x, Stability ${agentConfigs.voiceSettings?.stability}
" Built-in Tools: ${Object.keys(agentConfigs.builtInTools || {}).join(', ') || 'None'}
" Turn Settings: ${agentConfigs.turnSettings?.mode} mode, ${agentConfigs.turnSettings?.turn_timeout}s timeout

CONVERSATION ANALYSIS:
${analysis}

TASK: 
Based on the analysis, provide specific, actionable suggestions to improve the agent's performance. Be precise and focus on changes that would directly address the issues identified in the analysis.

Consider these improvement areas:
1. SYSTEM PROMPT: Always provide the COMPLETE system prompt. If improvements are needed, enhance the current prompt and provide the full improved version. If no improvements are needed, provide the current prompt exactly as-is.
2. SETTINGS: Adjust temperature, model, timing, or voice settings based on performance issues
3. KNOWLEDGE BASE: Recommend knowledge sources if the agent lacks information
4. TOOLS: Suggest enabling/disabling tools based on conversation needs

CRITICAL: For promptChanges, you MUST provide a complete, functional system prompt. Never use shortcuts like "[rest of prompt]", "[existing content]", or similar placeholders.

IMPORTANT: Your response MUST be valid JSON in this exact format:
{
  "promptChanges": "ALWAYS provide the COMPLETE system prompt here. If improvements are needed, provide the full improved version. If no changes are needed, provide the current system prompt exactly as-is. NEVER use partial changes, placeholders, or references like '[rest of prompt]', '[previous content]', etc. Always provide the complete, ready-to-use system prompt.",
  "settingChanges": {
    "temperature": number or null (0.0-1.0, suggest only if current value isn't working),
    "llmModel": "string or null (suggest different model only if current one has limitations)",
    "language": "string or null (change only if language mismatch detected)",
    "firstMessage": "string or null (improve greeting if needed)",
    "voiceSettings": {
      "speed": number or null (0.5-2.0, adjust if user feedback suggests too fast/slow),
      "stability": number or null (0.0-1.0, adjust for voice consistency issues),
      "similarity_boost": number or null (0.0-1.0, adjust for voice accuracy)
    },
    "turnSettings": {
      "turn_timeout": number or null (3-15, adjust if conversation flow issues)
    }
  },
  "knowledgeBaseChanges": {
    "addSources": ["array of specific knowledge sources to add"] or null,
    "improveSources": ["array of existing sources that need updating"] or null,
    "ragSettings": {
      "maxDocuments": number or null,
      "threshold": number or null (0.0-1.0)
    }
  },
  "toolChanges": {
    "enableTools": ["array of tools to enable"] or null,
    "disableTools": ["array of tools to disable"] or null,
    "customTools": ["array of custom tool suggestions"] or null
  },
  "reasoning": "Explain why these specific changes will address the issues identified in the analysis. Be concise but thorough."
}

Only suggest changes that are directly supported by the analysis. Set fields to null if no changes are needed for that area.

REMEMBER: The promptChanges field must ALWAYS contain the complete system prompt - either the current one (if no changes needed) or the full improved version (if changes are needed).

Respond ONLY with the JSON object, no additional text.`;
  }

  /**
   * Parse Claude4 suggestions response
   */
  private parseSuggestionsResponse(response: string): {
    success: boolean;
    suggestions?: ConfigSuggestions;
  } {
    try {
      // Clean the response - remove any markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Remove control characters and clean the string
      cleanResponse = cleanResponse.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      
      // Log the cleaned response for debugging
      console.log(`   Cleaned response (${cleanResponse.length} chars):`, cleanResponse.substring(0, 500));

      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields exist
      if (!parsed.reasoning) {
        console.warn('� Parsed suggestions missing reasoning field');
        return { success: false };
      }

      // Clean up null values and empty objects
      const suggestions: ConfigSuggestions = {
        promptChanges: parsed.promptChanges || undefined, // Should always have a value now, but keep fallback for safety
        settingChanges: this.cleanSettingChanges(parsed.settingChanges),
        knowledgeBaseChanges: this.cleanKnowledgeBaseChanges(parsed.knowledgeBaseChanges),
        toolChanges: this.cleanToolChanges(parsed.toolChanges),
        reasoning: parsed.reasoning
      };

      return {
        success: true,
        suggestions
      };

    } catch (error) {
      console.error('L Error parsing suggestions response:', error);
      return { success: false };
    }
  }

  /**
   * Clean setting changes, removing null values
   */
  private cleanSettingChanges(settingChanges: any) {
    if (!settingChanges || typeof settingChanges !== 'object') {
      return undefined;
    }

    const cleaned: any = {};
    let hasChanges = false;

    // Core settings
    if (settingChanges.temperature !== null && settingChanges.temperature !== undefined) {
      cleaned.temperature = settingChanges.temperature;
      hasChanges = true;
    }
    if (settingChanges.llmModel !== null && settingChanges.llmModel !== undefined) {
      cleaned.llmModel = settingChanges.llmModel;
      hasChanges = true;
    }
    if (settingChanges.language !== null && settingChanges.language !== undefined) {
      cleaned.language = settingChanges.language;
      hasChanges = true;
    }
    if (settingChanges.firstMessage !== null && settingChanges.firstMessage !== undefined) {
      cleaned.firstMessage = settingChanges.firstMessage;
      hasChanges = true;
    }

    // Voice settings
    if (settingChanges.voiceSettings && typeof settingChanges.voiceSettings === 'object') {
      const voiceSettings: any = {};
      let hasVoiceChanges = false;

      if (settingChanges.voiceSettings.speed !== null && settingChanges.voiceSettings.speed !== undefined) {
        voiceSettings.speed = settingChanges.voiceSettings.speed;
        hasVoiceChanges = true;
      }
      if (settingChanges.voiceSettings.stability !== null && settingChanges.voiceSettings.stability !== undefined) {
        voiceSettings.stability = settingChanges.voiceSettings.stability;
        hasVoiceChanges = true;
      }
      if (settingChanges.voiceSettings.similarity_boost !== null && settingChanges.voiceSettings.similarity_boost !== undefined) {
        voiceSettings.similarity_boost = settingChanges.voiceSettings.similarity_boost;
        hasVoiceChanges = true;
      }

      if (hasVoiceChanges) {
        cleaned.voiceSettings = voiceSettings;
        hasChanges = true;
      }
    }

    // Turn settings
    if (settingChanges.turnSettings && typeof settingChanges.turnSettings === 'object') {
      const turnSettings: any = {};
      let hasTurnChanges = false;

      if (settingChanges.turnSettings.turn_timeout !== null && settingChanges.turnSettings.turn_timeout !== undefined) {
        turnSettings.turn_timeout = settingChanges.turnSettings.turn_timeout;
        hasTurnChanges = true;
      }

      if (hasTurnChanges) {
        cleaned.turnSettings = turnSettings;
        hasChanges = true;
      }
    }

    return hasChanges ? cleaned : undefined;
  }

  /**
   * Clean knowledge base changes, removing null values and empty arrays
   */
  private cleanKnowledgeBaseChanges(kbChanges: any) {
    if (!kbChanges || typeof kbChanges !== 'object') {
      return undefined;
    }

    const cleaned: any = {};
    let hasChanges = false;

    if (kbChanges.addSources && Array.isArray(kbChanges.addSources) && kbChanges.addSources.length > 0) {
      cleaned.addSources = kbChanges.addSources;
      hasChanges = true;
    }
    
    if (kbChanges.improveSources && Array.isArray(kbChanges.improveSources) && kbChanges.improveSources.length > 0) {
      cleaned.improveSources = kbChanges.improveSources;
      hasChanges = true;
    }

    if (kbChanges.ragSettings && typeof kbChanges.ragSettings === 'object') {
      const ragSettings: any = {};
      let hasRagChanges = false;

      if (kbChanges.ragSettings.maxDocuments !== null && kbChanges.ragSettings.maxDocuments !== undefined) {
        ragSettings.maxDocuments = kbChanges.ragSettings.maxDocuments;
        hasRagChanges = true;
      }
      if (kbChanges.ragSettings.threshold !== null && kbChanges.ragSettings.threshold !== undefined) {
        ragSettings.threshold = kbChanges.ragSettings.threshold;
        hasRagChanges = true;
      }

      if (hasRagChanges) {
        cleaned.ragSettings = ragSettings;
        hasChanges = true;
      }
    }

    return hasChanges ? cleaned : undefined;
  }

  /**
   * Clean tool changes, removing null values and empty arrays
   */
  private cleanToolChanges(toolChanges: any) {
    if (!toolChanges || typeof toolChanges !== 'object') {
      return undefined;
    }

    const cleaned: any = {};
    let hasChanges = false;

    if (toolChanges.enableTools && Array.isArray(toolChanges.enableTools) && toolChanges.enableTools.length > 0) {
      cleaned.enableTools = toolChanges.enableTools;
      hasChanges = true;
    }
    
    if (toolChanges.disableTools && Array.isArray(toolChanges.disableTools) && toolChanges.disableTools.length > 0) {
      cleaned.disableTools = toolChanges.disableTools;
      hasChanges = true;
    }

    if (toolChanges.customTools && Array.isArray(toolChanges.customTools) && toolChanges.customTools.length > 0) {
      cleaned.customTools = toolChanges.customTools;
      hasChanges = true;
    }

    return hasChanges ? cleaned : undefined;
  }
}

export const generateSuggestionsService = new GenerateSuggestionsService();