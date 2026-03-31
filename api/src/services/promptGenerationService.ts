// Using native fetch for OpenAI Responses API

// OpenAI Responses API response structure
interface OpenAIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  error: any;
  output: Array<{
    type: string;
    id: string;
    status: string;
    role: string;
    content: Array<{
      type: string;
      text: string;
      annotations?: any[];
    }>;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface PromptGenerationRequest {
  agentName: string;
  description: string;
  purpose: 'sales' | 'support' | 'appointment' | 'information' | 'custom';
  businessGoals?: string;
  targetAudience?: string;
  keyChallenges?: string;
  successMetrics?: string;
  conversationStyle?: 'professional' | 'friendly' | 'consultative' | 'enthusiastic' | 'empathetic';
  industryContext?: string;
  knowledgeBase?: {
    useBusinessInfo: boolean;
    useProducts: boolean;
    useFAQs: boolean;
    useBrandGuidelines: boolean;
    customKnowledge?: string;
  };
}

export interface GeneratedPrompt {
  systemPrompt: string;
  firstMessage: string;
  conversationFlow: {
    opening: string;
    discovery: string[];
    presentation: string[];
    handling_objections: string[];
    closing: string[];
  };
  keyPhrases: string[];
  successTips: string[];
}

export class PromptGenerationService {
  private static apiKey: string | undefined;

  static initialize() {
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured. Prompt generation will use fallback templates.');
      return;
    }
    
    console.log('OpenAI API configured for GPT-5 nano model');
  }

  /**
   * Generate an intelligent system prompt using OpenAI Responses API
   */
  static async generateAgentPrompt(request: PromptGenerationRequest): Promise<GeneratedPrompt> {
    // If OpenAI is not configured, fall back to template generation
    if (!this.apiKey) {
      return this.generateFallbackPrompt(request);
    }

    try {
      const prompt = this.buildPromptGenerationPrompt(request);
      
      const requestBody = {
        model: 'gpt-5-nano', // Use the most cost-effective GPT-5 model
        instructions: 'You are an expert at creating highly effective conversational AI prompts for call center agents. You understand psychology, sales techniques, customer service best practices, and how to create natural, goal-oriented conversations.',
        input: prompt,
        max_output_tokens: 2000,
        text: {
          format: {
            type: 'text'
          }
        }
      };

      console.log('Sending to OpenAI Responses API:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API Error Details:', errorData);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json() as OpenAIResponse;
      if (!responseData?.output?.[0]?.content?.[0]?.text) {
        throw new Error('Empty response from OpenAI');
      }

      const responseText = responseData.output[0].content[0].text;
      return this.parseGeneratedResponse(responseText, request);

    } catch (error) {
      console.error('OpenAI prompt generation failed:', error);
      return this.generateFallbackPrompt(request);
    }
  }

  /**
   * Generate just the first message using AI
   */
  static async generateFirstMessage(request: PromptGenerationRequest): Promise<string> {
    if (!this.apiKey) {
      return this.generateFallbackFirstMessage(request);
    }

    try {
      const prompt = `Generate a compelling, natural opening message for a ${request.purpose} agent named "${request.agentName}".

Context:
- Description: ${request.description}
- Target Audience: ${request.targetAudience || 'General callers'}
- Conversation Style: ${request.conversationStyle || 'professional'}
- Business Goals: ${request.businessGoals || 'Not specified'}

Requirements:
- Sound natural and conversational
- Set the right tone for the conversation
- Be concise (1-2 sentences max)
- Make the caller feel welcome and valued
- Avoid being overly salesy or robotic

Return only the opening message, nothing else.`;

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5-nano',
          instructions: 'You are an expert at crafting compelling opening messages for conversational AI agents. Focus on creating natural, welcoming, and effective first impressions.',
          input: prompt,
          max_output_tokens: 100,
          text: {
            format: {
              type: 'text'
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API Error Details:', errorData);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json() as OpenAIResponse;
      if (!responseData?.output?.[0]?.content?.[0]?.text) {
        throw new Error('Empty response from OpenAI');
      }

      return responseData.output[0].content[0].text.trim() || this.generateFallbackFirstMessage(request);

    } catch (error) {
      console.error('OpenAI first message generation failed:', error);
      return this.generateFallbackFirstMessage(request);
    }
  }

  /**
   * Build the prompt for generating the system prompt
   */
  private static buildPromptGenerationPrompt(request: PromptGenerationRequest): string {
    return `Create a comprehensive system prompt and conversation strategy for a ${request.purpose} AI agent with the following details:

AGENT DETAILS:
- Name: ${request.agentName}
- Description: ${request.description}
- Purpose: ${request.purpose}
- Business Goals: ${request.businessGoals || 'Not specified'}
- Target Audience: ${request.targetAudience || 'General callers'}
- Key Challenges: ${request.keyChallenges || 'Not specified'}
- Success Metrics: ${request.successMetrics || 'Not specified'}
- Conversation Style: ${request.conversationStyle || 'professional'}

KNOWLEDGE BASE ACCESS:
${request.knowledgeBase ? `
- Business Info: ${request.knowledgeBase.useBusinessInfo ? 'Available' : 'Not available'}
- Product Catalog: ${request.knowledgeBase.useProducts ? 'Available' : 'Not available'}
- FAQs: ${request.knowledgeBase.useFAQs ? 'Available' : 'Not available'}
- Brand Guidelines: ${request.knowledgeBase.useBrandGuidelines ? 'Available' : 'Not available'}
- Custom Knowledge: ${request.knowledgeBase.customKnowledge || 'None'}
` : 'No knowledge base specified'}

Please generate a response in the following JSON format:
{
  "systemPrompt": "A comprehensive system prompt that defines the agent's role, personality, goals, and behavior guidelines",
  "firstMessage": "A natural, engaging opening message for calls",
  "conversationFlow": {
    "opening": "Strategy for opening the conversation",
    "discovery": ["Key questions to understand customer needs", "How to qualify prospects"],
    "presentation": ["How to present solutions", "Techniques for building value"],
    "handling_objections": ["Common objection handling strategies", "How to overcome resistance"],
    "closing": ["Strategies for achieving the desired outcome", "Next steps and follow-up"]
  },
  "keyPhrases": ["Important phrases and language patterns to use"],
  "successTips": ["Specific tips for maximizing success in this role"]
}

Make the system prompt:
1. Highly specific to the agent's purpose and context
2. Include personality and tone guidelines
3. Provide clear behavioral instructions
4. Include goal-oriented conversation strategies
5. Account for the target audience and business context
6. Incorporate best practices for ${request.purpose} conversations

The conversation flow should be tactical and actionable, providing specific guidance for each phase of the call.`;
  }

  /**
   * Parse the AI-generated response into a structured format
   */
  private static parseGeneratedResponse(response: string, request: PromptGenerationRequest): GeneratedPrompt {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      // Validate the structure and provide defaults if needed
      return {
        systemPrompt: parsed.systemPrompt || this.generateFallbackSystemPrompt(request),
        firstMessage: parsed.firstMessage || this.generateFallbackFirstMessage(request),
        conversationFlow: {
          opening: parsed.conversationFlow?.opening || 'Build rapport and understand the caller\'s needs',
          discovery: parsed.conversationFlow?.discovery || ['What brings you to call today?'],
          presentation: parsed.conversationFlow?.presentation || ['Present relevant solutions'],
          handling_objections: parsed.conversationFlow?.handling_objections || ['Listen and empathize'],
          closing: parsed.conversationFlow?.closing || ['Confirm next steps']
        },
        keyPhrases: parsed.keyPhrases || [],
        successTips: parsed.successTips || []
      };
    } catch (error) {
      console.error('Failed to parse AI response, using fallback:', error);
      
      // If JSON parsing fails, try to extract system prompt from text
      const systemPromptMatch = response.match(/systemPrompt["\s:]+([^"}\n]+)/i);
      const firstMessageMatch = response.match(/firstMessage["\s:]+([^"}\n]+)/i);
      
      return {
        systemPrompt: systemPromptMatch?.[1]?.trim() || this.generateFallbackSystemPrompt(request),
        firstMessage: firstMessageMatch?.[1]?.trim() || this.generateFallbackFirstMessage(request),
        conversationFlow: {
          opening: 'Build rapport and understand the caller\'s needs',
          discovery: ['What brings you to call today?'],
          presentation: ['Present relevant solutions based on their needs'],
          handling_objections: ['Listen carefully and address concerns empathetically'],
          closing: ['Confirm next steps and schedule follow-up if needed']
        },
        keyPhrases: [],
        successTips: []
      };
    }
  }

  /**
   * Fallback prompt generation when OpenAI is not available
   */
  private static generateFallbackPrompt(request: PromptGenerationRequest): GeneratedPrompt {
    return {
      systemPrompt: this.generateFallbackSystemPrompt(request),
      firstMessage: this.generateFallbackFirstMessage(request),
      conversationFlow: this.generateFallbackConversationFlow(request),
      keyPhrases: this.generateFallbackKeyPhrases(request),
      successTips: this.generateFallbackSuccessTips(request)
    };
  }

  private static generateFallbackSystemPrompt(request: PromptGenerationRequest): string {
    let prompt = `You are ${request.agentName}, a ${request.conversationStyle || 'professional'} AI agent specialized in ${request.purpose}. ${request.description}`;
    
    if (request.targetAudience) {
      prompt += ` You primarily work with ${request.targetAudience}.`;
    }
    
    if (request.businessGoals) {
      prompt += ` Your key business objectives are: ${request.businessGoals}`;
    }
    
    // Add knowledge base context
    if (request.knowledgeBase) {
      const kb = request.knowledgeBase;
      if (kb.useBusinessInfo) {
        prompt += ' You have access to complete business information including company details and contact information.';
      }
      if (kb.useProducts) {
        prompt += ' You can help customers with products and services from our catalog.';
      }
      if (kb.useFAQs) {
        prompt += ' You have knowledge about frequently asked questions and common customer concerns.';
      }
      if (kb.useBrandGuidelines) {
        prompt += ' Follow the established brand voice and communication guidelines.';
      }
      if (kb.customKnowledge) {
        prompt += ` Additional context: ${kb.customKnowledge}`;
      }
    }
    
    // Add purpose-specific instructions
    switch (request.purpose) {
      case 'sales':
        prompt += ' Your primary goal is to understand customer needs, present appropriate solutions, and guide them toward making a purchase decision. Build rapport, ask qualifying questions, and handle objections professionally.';
        break;
      case 'support':
        prompt += ' Your primary goal is to help customers resolve their issues quickly and effectively. Be patient, empathetic, and solution-focused. Gather necessary information and provide clear, actionable guidance.';
        break;
      case 'appointment':
        prompt += ' Your primary goal is to understand the customer\'s needs and schedule appropriate appointments. Be efficient yet accommodating, confirm details, and ensure clear communication about next steps.';
        break;
      case 'information':
        prompt += ' Your primary goal is to gather relevant information from customers and qualify their needs. Ask thoughtful questions, listen carefully, and document important details for follow-up.';
        break;
      default:
        prompt += ` Your primary goal is to ${request.businessGoals || 'provide excellent customer service and achieve positive outcomes'}.`;
    }
    
    prompt += ' Always be professional, helpful, and maintain a positive conversation flow. If you cannot help with something, politely explain and offer alternatives when possible. Keep the conversation focused and goal-oriented while being personable and engaging.';
    
    return prompt;
  }

  private static generateFallbackFirstMessage(request: PromptGenerationRequest): string {
    const style = request.conversationStyle || 'professional';
    const name = request.agentName;
    
    if (style === 'friendly') {
      return `Hi there! This is ${name}. Thanks for calling! I'm here to help you today. What can I do for you?`;
    } else if (style === 'enthusiastic') {
      return `Hello! This is ${name}, and I'm excited to speak with you today! How can I help make this call valuable for you?`;
    } else if (style === 'empathetic') {
      return `Hi, this is ${name}. Thank you for taking the time to call. I'm here to listen and help you with whatever you need today.`;
    } else {
      return `Hello, thank you for calling. This is ${name}. How may I assist you today?`;
    }
  }

  private static generateFallbackConversationFlow(request: PromptGenerationRequest) {
    const flows: Record<string, any> = {
      sales: {
        opening: 'Build rapport and create a welcoming atmosphere',
        discovery: [
          'What prompted you to call today?',
          'What are your main goals or challenges?',
          'What have you tried before?',
          'What would success look like for you?'
        ],
        presentation: [
          'Present solutions that directly address their stated needs',
          'Use specific examples and success stories',
          'Focus on benefits, not just features',
          'Create urgency when appropriate'
        ],
        handling_objections: [
          'Listen completely before responding',
          'Acknowledge their concern as valid',
          'Ask clarifying questions to understand the real issue',
          'Provide evidence or alternatives to address the concern'
        ],
        closing: [
          'Summarize the key benefits',
          'Create a clear next step',
          'Handle final objections',
          'Secure commitment or schedule follow-up'
        ]
      },
      support: {
        opening: 'Acknowledge the customer and show empathy',
        discovery: [
          'What specific issue are you experiencing?',
          'When did this problem start?',
          'What steps have you already taken?',
          'How is this affecting you or your business?'
        ],
        presentation: [
          'Explain the solution clearly and step-by-step',
          'Use simple, non-technical language',
          'Confirm understanding at each step',
          'Provide additional resources if helpful'
        ],
        handling_objections: [
          'Validate their frustration or concern',
          'Offer alternative solutions',
          'Escalate when appropriate',
          'Follow up to ensure satisfaction'
        ],
        closing: [
          'Confirm the issue is resolved',
          'Provide next steps or prevention tips',
          'Offer additional assistance',
          'Thank them for their patience'
        ]
      }
    };

    return flows[request.purpose] || flows.sales;
  }

  private static generateFallbackKeyPhrases(request: PromptGenerationRequest): string[] {
    const commonPhrases = [
      'I understand',
      'That makes sense',
      'Let me help you with that',
      'Is there anything else I can clarify?'
    ];

    const purposeSpecific: Record<string, string[]> = {
      sales: ['That sounds like a great fit', 'Based on what you\'ve told me', 'Would you like to move forward?'],
      support: ['I apologize for the inconvenience', 'Let\'s work through this together', 'I want to make sure this is completely resolved'],
      appointment: ['Let me check availability', 'What works best for your schedule?', 'I\'ll send you a confirmation'],
      information: ['Could you tell me more about', 'Help me understand', 'That\'s valuable information']
    };

    return [...commonPhrases, ...(purposeSpecific[request.purpose] || [])];
  }

  private static generateFallbackSuccessTips(request: PromptGenerationRequest): string[] {
    return [
      'Listen more than you speak',
      'Ask open-ended questions to understand needs',
      'Use the caller\'s name during the conversation',
      'Summarize key points to confirm understanding',
      'Be genuine and authentic in your responses',
      'Stay focused on the caller\'s goals and outcomes'
    ];
  }
}