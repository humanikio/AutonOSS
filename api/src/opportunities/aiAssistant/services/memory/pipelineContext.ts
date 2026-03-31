import { sessionManager } from './sessionManager';
import { getPipelineFromSession } from '../../utils/getPipeline';

export interface PipelineContext {
  pipelineInfo: {
    id: string;
    name: string;
    isNew: boolean;
  };
  existingStages: Array<{
    name: string;
    order: number;
    color?: string;
  }>;
  contextPrompt: string;
}

export class PipelineContextManager {
  /**
   * Load pipeline context from session
   */
  async loadPipelineContext(tenantId: string, sessionId: string): Promise<PipelineContext> {
    try {
      // Get session context
      const sessionContext = await sessionManager.getSessionContext(tenantId, sessionId);
      
      // Get pipeline and stages data from session
      const { pipeline, stages } = await getPipelineFromSession(tenantId, sessionId);
      
      // Build context prompt
      const contextPrompt = this.buildContextPrompt(pipeline, stages, sessionContext);

      return {
        pipelineInfo: {
          id: pipeline.id,
          name: pipeline.name,
          isNew: pipeline.isNew
        },
        existingStages: stages.map(stage => ({
          name: stage.name,
          order: stage.order,
          color: stage.color
        })),
        contextPrompt
      };
    } catch (error) {
      console.error('Error loading pipeline context:', error);
      return {
        pipelineInfo: {
          id: 'unknown',
          name: 'Unknown Pipeline',
          isNew: true
        },
        existingStages: [],
        contextPrompt: 'Error loading pipeline context.'
      };
    }
  }

  /**
   * Build a context prompt from the pipeline data
   */
  private buildContextPrompt(
    pipeline: any, 
    stages: any[], 
    sessionContext: any
  ): string {
    const existingStagesText = stages.length > 0 
      ? stages
          .sort((a, b) => a.order - b.order)
          .map((stage, index) => `${index + 1}. ${stage.name}`)
          .join('\n')
      : 'No stages currently exist';

    return `You are helping create a sales pipeline with the following context:

PIPELINE INFORMATION:
- Pipeline Name: ${pipeline.name}
- Type: ${pipeline.isNew ? 'New Pipeline (being created)' : 'Existing Pipeline (being modified)'}
- Current Stage Count: ${stages.length}

EXISTING STAGES:
${existingStagesText}

BUSINESS CONTEXT:
${sessionContext.businessContext}

CONVERSATION STATUS:
- Stages Generated Previously: ${sessionContext.stagesGenerated ? 'Yes' : 'No'}
- Pipeline Context: ${pipeline.isNew ? 'Creating new pipeline from scratch' : 'Working with existing pipeline structure'}

GUIDELINES FOR INTERACTION:
- If this is a new pipeline, focus on understanding the complete business process
- If modifying existing stages, consider how new stages fit with current ones
- Ask clarifying questions about business process, customer journey, and decision points
- When ready to create stages, ensure they represent clear, actionable steps
- Consider the practical needs of sales teams using this pipeline

Your goal is to help create an effective pipeline that matches the user's specific business process.`;
  }

  /**
   * Get pipeline-specific guidance based on existing stages
   */
  getPipelineGuidance(stages: any[]): string {
    if (stages.length === 0) {
      return 'This is a new pipeline. Focus on understanding the complete customer journey from initial contact to conversion.';
    }

    if (stages.length < 3) {
      return 'This pipeline has few stages. Consider if additional stages are needed to properly track the customer journey.';
    }

    if (stages.length > 8) {
      return 'This pipeline has many stages. Consider if some stages could be combined or if the process could be simplified.';
    }

    return 'This pipeline has a moderate number of stages. Focus on optimizing the flow and ensuring all critical decision points are captured.';
  }

  /**
   * Analyze existing stages for context
   */
  analyzeExistingStages(stages: any[]): {
    hasQualificationStage: boolean;
    hasProposalStage: boolean;
    hasClosingStage: boolean;
    missingCommonStages: string[];
  } {
    const stageNames = stages.map(s => s.name.toLowerCase());
    
    // Check for common stage types
    const hasQualificationStage = stageNames.some(name => 
      name.includes('qualify') || name.includes('lead') || name.includes('prospect')
    );
    
    const hasProposalStage = stageNames.some(name =>
      name.includes('proposal') || name.includes('quote') || name.includes('estimate')
    );
    
    const hasClosingStage = stageNames.some(name =>
      name.includes('close') || name.includes('won') || name.includes('complete') || name.includes('signed')
    );

    // Identify potentially missing common stages
    const missingCommonStages: string[] = [];
    if (!hasQualificationStage) missingCommonStages.push('Qualification');
    if (!hasProposalStage) missingCommonStages.push('Proposal');
    if (!hasClosingStage) missingCommonStages.push('Closing');

    return {
      hasQualificationStage,
      hasProposalStage,
      hasClosingStage,
      missingCommonStages
    };
  }
}

export const pipelineContextManager = new PipelineContextManager();