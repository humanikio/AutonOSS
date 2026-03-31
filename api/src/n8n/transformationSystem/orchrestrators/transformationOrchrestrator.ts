/**
 * Transformation Orchestrator
 *
 * Entry point for the transformation system.
 * Coordinates the planning, compilation, and validation phases.
 */

import { reviewReactFlow } from '../services/reviewReactFlow';
import { transform2N8n } from '../services/transform2N8n';
import { clearSkeleton } from '../state/skeleton';
import { clearCompiledWorkflow } from '../state/compiledWorkflow';
import { clearProcessedReactFlow } from '../state/processedReactFlow';
import type { ReactFlowWorkflow } from '../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Orchestrator result
 */
export interface OrchestrationResult {
  success: boolean;
  phase: 'preprocessing' | 'planning' | 'compilation' | 'validation' | 'complete';
  totalMethods?: number;
  totalNodes?: number;
  connections?: any; // n8n connections map
  error?: string;
}

/**
 * Input ReactFlow workflow data (raw, without adapters)
 */
export interface ReactFlowInput {
  name: string;
  nodes: any[];
  edges: any[];
  status?: string;
}

/**
 * Transformation options
 */
export interface TransformationOptions {
  /** Pre-processed ReactFlow data (with adapters injected) - if not provided, orchestrator will preprocess */
  processedReactFlow?: ReactFlowWorkflow;
  /** Raw ReactFlow input to be preprocessed by orchestrator */
  rawReactFlow?: ReactFlowInput;
}

/**
 * Main orchestrator for transforming ReactFlow workflows to n8n
 *
 * Coordinates three phases:
 * 1. Planning - Analyze ReactFlow and create build plan
 * 2. Compilation - Execute build plan and generate n8n nodes
 * 3. Validation - Validate final workflow (TODO)
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID
 * @param apiKey - Optional API key for custom nodes
 * @param options - Optional transformation options (e.g., pre-processed ReactFlow data)
 * @returns Orchestration result
 */
export async function transformWorkflow(
  tenantId: string,
  workflowId: string,
  apiKey?: string,
  options?: TransformationOptions
): Promise<OrchestrationResult> {
  console.log(`\n<� ========== TRANSFORMATION ORCHESTRATOR ==========`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Workflow: ${workflowId}`);
  console.log(`   API Key: ${apiKey ? 'provided' : 'not provided'}`);
  console.log(`   Raw ReactFlow: ${options?.rawReactFlow ? 'provided' : 'will load from Firestore'}`);
  console.log(`\n`);

  try {
    // =======================================================================
    // PHASE 0: RESET STATE (CRITICAL: prevents duplicate nodes!)
    // =======================================================================
    console.log(`🗑️  Phase 0: Resetting build session state...`);
    await Promise.all([
      clearSkeleton(tenantId, workflowId),
      clearCompiledWorkflow(tenantId, workflowId),
      clearProcessedReactFlow(tenantId, workflowId),
    ]);
    console.log(`✅ Build session state cleared\n`);

    // =======================================================================
    // PHASE 1: PLANNING (includes contact adapter injection)
    // =======================================================================
    console.log(`=� Starting Phase 1: Planning`);

    // Prepare workflow data for planning (raw or from options)
    let workflowData: ReactFlowWorkflow | undefined;
    if (options?.rawReactFlow) {
      workflowData = {
        name: options.rawReactFlow.name,
        nodes: options.rawReactFlow.nodes,
        edges: options.rawReactFlow.edges,
      };
    } else if (options?.processedReactFlow) {
      workflowData = options.processedReactFlow;
    }

    const planningResult = await reviewReactFlow(tenantId, workflowId, workflowData);

    if (!planningResult.success) {
      return {
        success: false,
        phase: 'planning',
        error: 'Planning phase failed',
      };
    }

    console.log(`\n Phase 1 Complete: ${planningResult.totalMethods} methods planned`);

    // =======================================================================
    // PHASE 2: COMPILATION (includes contact field resolution)
    // =======================================================================
    console.log(`\n=' Starting Phase 2: Compilation`);

    // Pass adapter-enhanced workflow from planning phase (if available)
    const compilationResult = await transform2N8n(
      tenantId,
      workflowId,
      apiKey,
      planningResult.workflowWithAdapters
    );

    if (!compilationResult.success) {
      return {
        success: false,
        phase: 'compilation',
        error: 'Compilation phase failed',
      };
    }

    console.log(`\n Phase 2 Complete: ${compilationResult.totalNodes} nodes created`);

    // =======================================================================
    // PHASE 3: VALIDATION (TODO)
    // =======================================================================
    console.log(`\n= Phase 3: Validation (skipped - not yet implemented)`);

    // =======================================================================
    // COMPLETE
    // =======================================================================
    console.log(`\n ========== TRANSFORMATION COMPLETE ==========`);
    console.log(`   Methods executed: ${planningResult.totalMethods}`);
    console.log(`   Nodes created: ${compilationResult.totalNodes}`);
    console.log(`\n`);

    return {
      success: true,
      phase: 'complete',
      totalMethods: planningResult.totalMethods,
      totalNodes: compilationResult.totalNodes,
      connections: compilationResult.connections, // Pass through connections
    };
  } catch (error) {
    console.error(`\nL ========== TRANSFORMATION FAILED ==========`);
    console.error(error);
    console.log(`\n`);

    return {
      success: false,
      phase: 'planning', // Default to planning if we don't know
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
