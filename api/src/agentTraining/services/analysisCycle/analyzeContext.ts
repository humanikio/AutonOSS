import { claude4 } from '../../../llmModels/claude4';
import { SessionHistoryResult } from './retrieveSessionHistory';
import { AgentConfigs } from './retrieveAgentConfigs';

/**
 * Service for analyzing conversation context using Claude4
 * Determines if agent configuration changes are needed based on user feedback
 */

export interface ContextAnalysisRequest {
  sessionHistory: SessionHistoryResult;
  agentConfigs: AgentConfigs;
}

export interface ContextAnalysisResult {
  success: boolean;
  analysis?: string;
  suggestionsNeeded?: boolean;
  error?: string;
}

export class AnalyzeContextService {
  /**
   * Analyze conversation context and agent configuration
   */
  async analyzeConversation(request: ContextAnalysisRequest): Promise<ContextAnalysisResult> {
    try {
      const { sessionHistory, agentConfigs } = request;
      
      console.log(`>à Starting context analysis for agent: ${agentConfigs.agentName}`);

      // Step 1: Extract user feedback patterns
      console.log('  " Step 1: Extracting user feedback patterns...');
      const feedbackPatterns = this.extractFeedbackPatterns(sessionHistory.messages || []);
      
      console.log(`  =Ê Feedback patterns detected:`);
      console.log(`    - Corrections: ${feedbackPatterns.corrections.length}`);
      console.log(`    - Positive feedback: ${feedbackPatterns.positiveFeedback.length}`);
      console.log(`    - Negative feedback: ${feedbackPatterns.negativeFeedback.length}`);
      console.log(`    - Suggestions: ${feedbackPatterns.suggestions.length}`);

      // Step 2: Build analysis prompt
      console.log('  " Step 2: Building analysis prompt...');
      const analysisPrompt = this.buildAnalysisPrompt(sessionHistory, agentConfigs, feedbackPatterns);
      
      console.log(`   Analysis prompt built (${analysisPrompt.length} chars)`);

      // Step 3: Run Claude4 analysis
      console.log('  " Step 3: Running Claude4 analysis...');
      const analysisResponse = await claude4.processText(analysisPrompt);
      
      console.log(`   Claude4 analysis completed (${analysisResponse.length} chars)`);

      // Step 4: Parse Claude4 response
      console.log('  " Step 4: Parsing analysis response...');
      const parsedAnalysis = this.parseAnalysisResponse(analysisResponse);
      
      if (!parsedAnalysis.success) {
        console.warn('  Failed to parse analysis response, using raw response');
        return {
          success: true,
          analysis: analysisResponse,
          suggestionsNeeded: true // Default to true if we can't parse
        };
      }

      console.log(`   Analysis parsed successfully`);
      console.log(`    - Suggestions needed: ${parsedAnalysis.suggestionsNeeded ? 'Yes' : 'No'}`);

      return {
        success: true,
        analysis: parsedAnalysis.analysis,
        suggestionsNeeded: parsedAnalysis.suggestionsNeeded
      };

    } catch (error) {
      console.error('L Error analyzing context:', error);
      
      return {
        success: false,
        error: `Context analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract user feedback patterns from conversation messages
   */
  private extractFeedbackPatterns(messages: any[]) {
    const corrections: string[] = [];
    const positiveFeedback: string[] = [];
    const negativeFeedback: string[] = [];
    const suggestions: string[] = [];

    const userMessages = messages.filter(m => m.sender === 'user');

    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      const originalContent = msg.content;
      
      // Detect corrections
      if (content.includes('no') || content.includes('wrong') || content.includes('incorrect') || 
          content.includes('actually') || content.includes('that\'s not right')) {
        corrections.push(originalContent);
      }
      
      // Detect positive feedback
      if (content.includes('good') || content.includes('great') || content.includes('perfect') || 
          content.includes('correct') || content.includes('right') || content.includes('thank you')) {
        positiveFeedback.push(originalContent);
      }
      
      // Detect negative feedback
      if (content.includes('bad') || content.includes('worse') || content.includes('terrible') || 
          content.includes('don\'t like') || content.includes('awful')) {
        negativeFeedback.push(originalContent);
      }
      
      // Detect suggestions
      if (content.includes('should') || content.includes('could') || content.includes('try') || 
          content.includes('instead') || content.includes('better if') || content.includes('what about')) {
        suggestions.push(originalContent);
      }
    });

    return { corrections, positiveFeedback, negativeFeedback, suggestions };
  }

  /**
   * Build comprehensive analysis prompt for Claude4
   */
  private buildAnalysisPrompt(
    sessionHistory: SessionHistoryResult,
    agentConfigs: AgentConfigs,
    feedbackPatterns: any
  ): string {
    return `You are an AI training specialist analyzing a conversation between a user and an AI agent to determine if the agent's configuration needs improvement.

AGENT CONFIGURATION:
" Agent Name: ${agentConfigs.agentName} (Status: ${agentConfigs.status})
" System Prompt: ${agentConfigs.systemPrompt || 'Not set'}
" LLM Model: ${agentConfigs.llmModel} (Temperature: ${agentConfigs.temperature})
" Language: ${agentConfigs.language}
" Knowledge Base: ${agentConfigs.knowledgeBase?.length || 0} sources (RAG ${agentConfigs.ragSettings?.enabled ? 'enabled' : 'disabled'})
" Built-in Tools: ${Object.keys(agentConfigs.builtInTools || {}).join(', ') || 'None'}
" Voice Model: ${agentConfigs.voiceSettings?.model_id} (Speed: ${agentConfigs.voiceSettings?.speed}x)

TRAINING CONVERSATION:
${sessionHistory.conversationalContext || 'No conversation context available'}

${sessionHistory.summary ? `CONVERSATION SUMMARY:\n${sessionHistory.summary}\n` : ''}

USER FEEDBACK ANALYSIS:
" Corrections detected: ${feedbackPatterns.corrections.length}
${feedbackPatterns.corrections.length > 0 ? `  - Examples: ${feedbackPatterns.corrections.slice(0, 3).map((c: string) => `"${c}"`).join(', ')}` : ''}

" Positive feedback: ${feedbackPatterns.positiveFeedback.length}
${feedbackPatterns.positiveFeedback.length > 0 ? `  - Examples: ${feedbackPatterns.positiveFeedback.slice(0, 3).map((f: string) => `"${f}"`).join(', ')}` : ''}

" Negative feedback: ${feedbackPatterns.negativeFeedback.length}
${feedbackPatterns.negativeFeedback.length > 0 ? `  - Examples: ${feedbackPatterns.negativeFeedback.slice(0, 3).map((f: string) => `"${f}"`).join(', ')}` : ''}

" User suggestions: ${feedbackPatterns.suggestions.length}
${feedbackPatterns.suggestions.length > 0 ? `  - Examples: ${feedbackPatterns.suggestions.slice(0, 3).map((s: string) => `"${s}"`).join(', ')}` : ''}

ANALYSIS TASK:
Analyze this training conversation and determine:
1. How well is the agent currently performing?
2. What specific issues or patterns can you identify from user feedback?
3. Are there clear areas where the agent configuration could be improved?
4. Does the user feedback suggest specific changes are needed?

Consider these aspects:
- System prompt effectiveness (does it guide the agent appropriately?)
- Response accuracy and helpfulness
- Knowledge base usage and gaps
- Tone and personality alignment
- Technical settings (temperature, tools, etc.)
- User satisfaction indicators

IMPORTANT: Your response MUST be valid JSON in this exact format:
{
  "analysis": "Your detailed analysis of the conversation, user feedback patterns, and agent performance. Include specific observations about what's working well and what needs improvement. Be thorough and reference specific examples from the conversation.",
  "suggestionsNeeded": boolean (true if the analysis indicates configuration changes would improve the agent, false if the agent is performing well)
}

Respond ONLY with the JSON object, no additional text.`;
  }

  /**
   * Parse Claude4 analysis response
   */
  private parseAnalysisResponse(response: string): {
    success: boolean;
    analysis?: string;
    suggestionsNeeded?: boolean;
  } {
    try {
      // Clean the response - remove any markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanResponse);
      
      if (!parsed.analysis || typeof parsed.suggestionsNeeded !== 'boolean') {
        console.warn('  Parsed response missing required fields');
        return { success: false };
      }

      return {
        success: true,
        analysis: parsed.analysis,
        suggestionsNeeded: parsed.suggestionsNeeded
      };

    } catch (error) {
      console.error('L Error parsing analysis response:', error);
      return { success: false };
    }
  }
}

export const analyzeContextService = new AnalyzeContextService();