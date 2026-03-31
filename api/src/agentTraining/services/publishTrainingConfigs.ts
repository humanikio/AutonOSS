import { getTrainingConfigs } from './publishTrainingConfigs/getConfigs';
import { updateTrainingConfigs } from './publishTrainingConfigs/updateConfigs';
import { updateProdAgent } from './publishTrainingConfigs/updateProdAgent';

// Re-export individual services for direct use
export { getTrainingConfigs, updateTrainingConfigs, updateProdAgent };

// Main orchestration service for complete publish workflow
export interface PublishTrainingConfigsParams {
  tenantId: string;
  sessionId: string;
  agentId: string;
  finalConfig?: any; // Optional final edits before publishing
}

export interface PublishTrainingConfigsResult {
  success: boolean;
  message?: string;
  publishedConfig?: any;
  error?: string;
}

/**
 * Main service for publishing training configurations to production
 * Handles the complete workflow: get config -> optional updates -> publish to prod
 */
export const publishTrainingConfigs = async (params: PublishTrainingConfigsParams): Promise<PublishTrainingConfigsResult> => {
  try {
    const { tenantId, sessionId, agentId, finalConfig } = params;
    
    console.log(`=€ Starting publish training configs workflow`);
    console.log(`  - Session ID: ${sessionId}`);
    console.log(`  - Agent ID: ${agentId}`);
    console.log(`  - Final edits provided: ${finalConfig ? 'Yes' : 'No'}`);

    // Step 1: Get current training configuration
    console.log('=Ö Step 1: Retrieving training configuration...');
    const configResult = await getTrainingConfigs({
      tenantId,
      sessionId,
      agentId
    });

    if (!configResult.success || !configResult.config) {
      return {
        success: false,
        error: configResult.error || 'Failed to retrieve training configuration'
      };
    }

    let configToPublish = configResult.config;

    // Step 2: Apply final edits if provided
    if (finalConfig) {
      console.log('= Step 2: Applying final configuration edits...');
      const updateResult = await updateTrainingConfigs({
        tenantId,
        sessionId,
        agentId,
        configChanges: finalConfig
      });

      if (!updateResult.success || !updateResult.config) {
        return {
          success: false,
          error: updateResult.error || 'Failed to apply final configuration edits'
        };
      }

      configToPublish = updateResult.config;
      console.log(' Final edits applied successfully');
    } else {
      console.log('í  Step 2: Skipping final edits (none provided)');
    }

    // Step 3: Publish to production agent
    console.log('=€ Step 3: Publishing configuration to production agent...');
    const publishResult = await updateProdAgent({
      tenantId,
      agentId,
      trainingConfig: configToPublish
    });

    if (!publishResult.success) {
      return {
        success: false,
        error: publishResult.error || 'Failed to publish configuration to production'
      };
    }

    console.log('<‰ Training configuration successfully published to production!');
    console.log(`   ${publishResult.message}`);

    return {
      success: true,
      message: publishResult.message,
      publishedConfig: configToPublish
    };

  } catch (error: any) {
    console.error('L Error in publish training configs workflow:', error);
    
    return {
      success: false,
      error: `Publish workflow failed: ${error.message}`
    };
  }
};