import { Request, Response } from 'express';
import { PromptGenerationService, PromptGenerationRequest, GeneratedPrompt } from '../services/promptGenerationService';

export class PromptGenerationController {

  /**
   * Generate a complete agent prompt with system prompt, first message, and conversation flow
   */
  static async generateAgentPrompt(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate required fields
      const { agentName, description, purpose } = req.body;
      
      if (!agentName || !description || !purpose) {
        res.status(400).json({
          success: false,
          error: 'agentName, description, and purpose are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const promptRequest: PromptGenerationRequest = {
        agentName: req.body.agentName,
        description: req.body.description,
        purpose: req.body.purpose,
        businessGoals: req.body.businessGoals,
        targetAudience: req.body.targetAudience,
        keyChallenges: req.body.keyChallenges,
        successMetrics: req.body.successMetrics,
        conversationStyle: req.body.conversationStyle,
        industryContext: req.body.industryContext,
        knowledgeBase: req.body.knowledgeBase
      };

      console.log(`🤖 Generating prompt for agent: ${agentName} (${purpose})`);

      const generatedPrompt = await PromptGenerationService.generateAgentPrompt(promptRequest);

      res.status(200).json({
        success: true,
        data: generatedPrompt,
        message: 'Agent prompt generated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Generate agent prompt error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate agent prompt',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate just the first message for an agent
   */
  static async generateFirstMessage(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { agentName, description, purpose } = req.body;
      
      if (!agentName || !description || !purpose) {
        res.status(400).json({
          success: false,
          error: 'agentName, description, and purpose are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const promptRequest: PromptGenerationRequest = {
        agentName: req.body.agentName,
        description: req.body.description,
        purpose: req.body.purpose,
        businessGoals: req.body.businessGoals,
        targetAudience: req.body.targetAudience,
        conversationStyle: req.body.conversationStyle,
        knowledgeBase: req.body.knowledgeBase
      };

      console.log(`📞 Generating first message for agent: ${agentName}`);

      const firstMessage = await PromptGenerationService.generateFirstMessage(promptRequest);

      res.status(200).json({
        success: true,
        data: { firstMessage },
        message: 'First message generated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Generate first message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate first message',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get prompt generation templates and suggestions
   */
  static async getPromptTemplates(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const templates = {
        conversationStyles: [
          {
            value: 'professional',
            label: 'Professional',
            description: 'Formal, business-focused tone'
          },
          {
            value: 'friendly',
            label: 'Friendly',
            description: 'Warm, approachable, and personable'
          },
          {
            value: 'consultative',
            label: 'Consultative',
            description: 'Advisory, expert-guidance focused'
          },
          {
            value: 'enthusiastic',
            label: 'Enthusiastic',
            description: 'High-energy, positive, and motivational'
          },
          {
            value: 'empathetic',
            label: 'Empathetic',
            description: 'Understanding, supportive, and caring'
          }
        ],
        businessGoalExamples: {
          sales: [
            'Increase conversion rates by qualifying leads effectively',
            'Generate more appointments for the sales team',
            'Cross-sell and upsell existing customers',
            'Reduce sales cycle length through better qualification'
          ],
          support: [
            'Reduce first-call resolution time',
            'Improve customer satisfaction scores',
            'Minimize escalations to human agents',
            'Increase self-service adoption'
          ],
          appointment: [
            'Maximize appointment booking rates',
            'Reduce no-shows through better qualification',
            'Optimize scheduling efficiency',
            'Improve customer experience during booking'
          ],
          information: [
            'Gather comprehensive lead information',
            'Qualify prospects for sales readiness',
            'Update customer data and preferences',
            'Collect feedback and insights'
          ]
        },
        targetAudienceExamples: [
          'Small business owners looking for solutions',
          'Existing customers needing support',
          'Enterprise clients evaluating services',
          'Homeowners interested in home improvement',
          'Healthcare professionals seeking tools',
          'E-commerce merchants needing platforms'
        ],
        challengeExamples: [
          'Customers often hang up quickly',
          'Difficulty qualifying serious prospects',
          'Handling price objections effectively',
          'Building trust over the phone',
          'Managing complex technical questions',
          'Scheduling around busy customer schedules'
        ]
      };

      res.status(200).json({
        success: true,
        data: templates,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get prompt templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prompt templates',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Validate a prompt request before generation
   */
  static async validatePromptRequest(req: Request, res: Response): Promise<void> {
    try {
      const { agentName, description, purpose } = req.body;
      
      const validation = {
        isValid: true,
        errors: [] as string[],
        suggestions: [] as string[]
      };

      // Validate required fields
      if (!agentName || agentName.trim().length < 3) {
        validation.isValid = false;
        validation.errors.push('Agent name must be at least 3 characters long');
      }

      if (!description || description.trim().length < 10) {
        validation.isValid = false;
        validation.errors.push('Description must be at least 10 characters long');
      }

      if (!purpose || !['sales', 'support', 'appointment', 'information', 'custom'].includes(purpose)) {
        validation.isValid = false;
        validation.errors.push('Purpose must be one of: sales, support, appointment, information, custom');
      }

      // Provide suggestions for better prompts
      if (description && description.length < 50) {
        validation.suggestions.push('Consider adding more detail to the description for better AI prompt generation');
      }

      if (!req.body.businessGoals) {
        validation.suggestions.push('Adding specific business goals will improve prompt quality');
      }

      if (!req.body.targetAudience) {
        validation.suggestions.push('Specifying target audience will create more focused conversations');
      }

      res.status(200).json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Validate prompt request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate prompt request',
        timestamp: new Date().toISOString()
      });
    }
  }
}