/**
 * Transformation Session
 *
 * Executes the build plan (skeleton) by processing each transformation method in order
 */

import { NodeRegistry } from '../../../../workflows/services/nodeRegistry';
import { pullMethod } from '../../utils/pullMethod';
import { updateSkeletonTaskStatus, batchUpdateSkeletonStatuses } from '../../state/skeleton';
import { appendCompiledWorkflow, readCompiledWorkflow } from '../../state/compiledWorkflow';
import { resolveContactFields } from './resolveContactFields';
import { resolveEventFields } from './resolveEventFields';
import type { SessionSkeleton, SkeletonTask } from '../../state/types';
import type {
  ReactFlowWorkflow,
  TransformationContext,
} from '../../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Transformation session class
 * Manages the compilation process for a single workflow build
 */
export class TransformationSession {
  private tenantId: string;
  private workflowId: string;
  private skeleton: SessionSkeleton;
  private reactFlow: ReactFlowWorkflow;
  private apiKey?: string;

  // Session state (in-memory)
  private compiledNodes: any[] = [];
  private internalEdges: any[] = []; // Transformation internal edges
  private replacements: { [key: string]: any } = {}; // Node ID replacements
  private completedTaskPositions: number[] = []; // Track completed tasks for batch update
  private context: TransformationContext;
  private batchSize = 10; // Flush to Firestore every 10 methods
  private adapterMap: Record<string, string> = {}; // Contact adapter mappings (nodeId → adapterNodeId)
  private triggerNodeId: string | undefined; // Trigger node ID for event field resolution

  constructor(
    tenantId: string,
    workflowId: string,
    skeleton: SessionSkeleton,
    reactFlow: ReactFlowWorkflow,
    apiKey?: string
  ) {
    this.tenantId = tenantId;
    this.workflowId = workflowId;
    this.skeleton = skeleton;
    this.reactFlow = reactFlow;
    this.apiKey = apiKey;

    // Load adapter map from skeleton (for contact field resolution)
    this.adapterMap = skeleton.adapterMap || {};

    // Find trigger node ID (for event field resolution)
    const triggerNode = reactFlow.nodes.find((n) => n.type === 'trigger');
    this.triggerNodeId = triggerNode?.id;
    if (this.triggerNodeId) {
      console.log(`   🎯 Found trigger node: ${this.triggerNodeId}`);
    }

    // Initialize context (pass entire ReactFlow)
    this.context = {
      allNodes: reactFlow.nodes,
      allEdges: reactFlow.edges,
      nodeIdToName: new Map(),
      n8nBaseUrl: process.env.N8N_BASE_URL || 'https://n8n.pulseline.io',
      apiKey: apiKey, // Pass tenant API key for auth injection
    };
  }

  /**
   * Execute all tasks in the skeleton
   */
  async execute(): Promise<{ nodes: any[]; connections: any }> {
    console.log(
      `\n🏭 Starting compilation session - ${this.skeleton.methods.length} methods to process`
    );

    // Process each task in order
    for (const task of this.skeleton.methods) {
      await this.executeMethod(task);

      // Batch save every N methods
      if (this.compiledNodes.length >= this.batchSize) {
        await this.flushBatch();
      }
    }

    // Final flush (remaining nodes and task statuses)
    if (this.compiledNodes.length > 0 || this.completedTaskPositions.length > 0) {
      await this.flushBatch();
    }

    // CRITICAL: After all methods complete and final flush is done
    // Pull FULL compiled workflow from Firestore (source of truth)
    console.log('📥 Loading complete compiled workflow from Firestore...');
    const { readFullCompiledWorkflow } = await import('../../state/compiledWorkflow');
    const compiledWorkflow = await readFullCompiledWorkflow(this.tenantId, this.workflowId);

    console.log(`   - Nodes: ${compiledWorkflow.nodes.length}`);
    console.log(`   - Internal edges: ${compiledWorkflow.internalEdges.length}`);
    console.log(`   - Replacements: ${Object.keys(compiledWorkflow.replacements).length}`);

    // Build connections using the utility (Firestore data = source of truth)
    console.log('🔗 Building connections using createConnectionsMap utility...');
    const { createConnectionsMap } = await import('../../utils/createConnectionsMap');
    const connections = createConnectionsMap(
      this.skeleton.edges,              // ReactFlow edges from skeleton
      compiledWorkflow.nodes,           // All compiled nodes from Firestore
      compiledWorkflow.internalEdges,   // Internal edges from Firestore
      compiledWorkflow.replacements     // Replacements from Firestore
    );

    console.log(`✅ Connections built: ${Object.keys(connections).length} source nodes`);

    // =======================================================================
    // COMPREHENSIVE WORKFLOW VALIDATION & LOGGING (Pre-n8n sync)
    // =======================================================================
    console.log(`\n========================================`);
    console.log(`📋 FINAL COMPILED WORKFLOW STRUCTURE`);
    console.log(`========================================\n`);

    // Log all nodes
    console.log(`📦 NODES (${compiledWorkflow.nodes.length}):`);
    compiledWorkflow.nodes.forEach((node: any, idx: number) => {
      console.log(`   [${idx + 1}] ${node.name} (${node.id})`);
      console.log(`       Type: ${node.type}`);
      console.log(`       Position: [${node.position?.[0] || 'N/A'}, ${node.position?.[1] || 'N/A'}]`);

      // Log key parameters for specific node types
      if (node.type === 'n8n-nodes-base.webhook') {
        console.log(`       Webhook Path: ${node.parameters?.path || 'MISSING'}`);
        console.log(`       Webhook Method: ${node.parameters?.httpMethod || 'MISSING'}`);
      } else if (node.type === 'n8n-nodes-base.switch') {
        console.log(`       Mode: ${node.parameters?.mode || 'MISSING'}`);
        console.log(`       Outputs: ${node.parameters?.numberOutputs || 'MISSING'}`);
        const expr = node.parameters?.output || node.parameters?.expression || 'MISSING';
        const exprPreview = typeof expr === 'string' ? expr.substring(0, 100) : JSON.stringify(expr).substring(0, 100);
        console.log(`       Expression: ${exprPreview}${expr.length > 100 ? '...' : ''}`);
      }
      console.log('');
    });

    // Log connections structure
    console.log(`\n🔗 CONNECTIONS (${Object.keys(connections).length} source nodes):`);
    const nodeNames = new Set(compiledWorkflow.nodes.map((n: any) => n.name));
    let invalidConnections = 0;

    Object.entries(connections).forEach(([sourceName, outputs]: [string, any]) => {
      const sourceNode = compiledWorkflow.nodes.find((n: any) => n.name === sourceName);
      console.log(`\n   From: ${sourceName} (${sourceNode?.type || 'MISSING NODE'})`);

      if (!nodeNames.has(sourceName)) {
        console.log(`       ⚠️  WARNING: Source node not found in nodes array!`);
        invalidConnections++;
      }

      // Iterate through each output type (usually just "main")
      Object.entries(outputs).forEach(([connectionType, outputArray]: [string, any]) => {
        if (!Array.isArray(outputArray)) return;

        // outputArray is like [[conn1, conn2], [conn3]] where each inner array is one output index
        outputArray.forEach((connectionsForOutput: any[], outputIndex: number) => {
          if (!Array.isArray(connectionsForOutput)) return;

          console.log(`     Output ${outputIndex}:`);
          connectionsForOutput.forEach((connection: any, idx: number) => {
            const targetNode = compiledWorkflow.nodes.find((n: any) => n.name === connection.node);
            console.log(`       [${idx}] → ${connection.node} (${targetNode?.type || 'MISSING NODE'})`);
            if (!nodeNames.has(connection.node)) {
              console.log(`           ⚠️  WARNING: Target node not found in nodes array!`);
              invalidConnections++;
            }
          });
        });
      });
    });

    // Check for orphaned nodes (not in connections)
    const connectedNodes = new Set<string>();
    Object.keys(connections).forEach(source => connectedNodes.add(source));
    Object.values(connections).forEach((outputs: any) => {
      // outputs = { main: [[conn1], [conn2]] }
      Object.values(outputs).forEach((outputArray: any) => {
        if (Array.isArray(outputArray)) {
          // outputArray is [[conn1], [conn2]]
          outputArray.forEach((connectionsForOutput: any[]) => {
            if (Array.isArray(connectionsForOutput)) {
              connectionsForOutput.forEach((conn: any) => {
                if (conn.node) {
                  connectedNodes.add(conn.node);
                }
              });
            }
          });
        }
      });
    });

    const orphanedNodes = compiledWorkflow.nodes.filter((n: any) => !connectedNodes.has(n.name));

    if (orphanedNodes.length > 0) {
      console.log(`\n⚠️  ORPHANED NODES (${orphanedNodes.length}):`);
      orphanedNodes.forEach((node: any) => {
        console.log(`   - ${node.name} (${node.type})`);
      });
    }

    // Find trigger nodes
    const triggerNodes = compiledWorkflow.nodes.filter((n: any) =>
      n.type === 'n8n-nodes-base.webhook' ||
      n.type?.includes('trigger') ||
      n.name?.toLowerCase().includes('trigger')
    );

    // Validation summary
    console.log(`\n========================================`);
    console.log(`📊 VALIDATION SUMMARY`);
    console.log(`========================================`);
    console.log(`   Total Nodes: ${compiledWorkflow.nodes.length}`);
    console.log(`   Total Connections: ${Object.keys(connections).length}`);
    console.log(`   Trigger Nodes: ${triggerNodes.length} ${triggerNodes.length === 0 ? '⚠️  (WORKFLOW CANNOT START!)' : '✅'}`);
    console.log(`   Orphaned Nodes: ${orphanedNodes.length} ${orphanedNodes.length > 0 ? '⚠️' : '✅'}`);
    console.log(`   Invalid Connections: ${invalidConnections} ${invalidConnections > 0 ? '⚠️' : '✅'}`);

    if (triggerNodes.length === 0) {
      console.log(`\n❌ CRITICAL: No trigger nodes found - workflow will not start!`);
    }

    if (invalidConnections > 0) {
      console.log(`\n❌ CRITICAL: Invalid connections detected - workflow may fail!`);
    }

    if (orphanedNodes.length > 0) {
      console.log(`\n⚠️  WARNING: Orphaned nodes detected - some nodes are not connected`);
    }

    console.log(`\n========================================\n`);

    return {
      nodes: compiledWorkflow.nodes,
      connections,
    };
  }

  /**
   * Execute a single method task
   */
  private async executeMethod(task: SkeletonTask): Promise<void> {
    console.log(`\n🔧 [${task.position}/${this.skeleton.methods.length}] Executing: ${task.methodName}`);

    try {
      // 1. Get source node from ReactFlow
      const sourceNode = this.reactFlow.nodes.find((n) => n.id === task.sourceNodeId);
      if (!sourceNode) {
        throw new Error(`Source node not found: ${task.sourceNodeId}`);
      }

      // 2. Resolve contact field placeholders BEFORE transformation
      let resolvedNode = resolveContactFields(sourceNode, this.adapterMap[task.sourceNodeId]);

      // 3. Resolve event field placeholders ({{$event.eventId}} → trigger reference)
      resolvedNode = resolveEventFields(resolvedNode, this.triggerNodeId);

      // 4. Get node config
      const nodeName = resolvedNode.data?.nodeName || resolvedNode.type;
      const config = NodeRegistry.getNodeConfig(nodeName);
      if (!config) {
        throw new Error(`Node config not found: ${nodeName}`);
      }

      // 5. Pull transformation method from registry
      const transformation = pullMethod(task.methodName);

      // 6. Execute transformation (pass resolved node with contact & event fields replaced)
      const result = await transformation.transform(resolvedNode, config, this.context);

      console.log(`    Created ${result.nodes.length} nodes`);

      // 7. Accumulate nodes and metadata in memory
      this.compiledNodes.push(...result.nodes);

      // Store internal edges (for connection wiring)
      if (result.internalEdges && result.internalEdges.length > 0) {
        this.internalEdges.push(...result.internalEdges);
      }

      // Store replacements (for connection wiring)
      if (result.replacements) {
        Object.assign(this.replacements, result.replacements);
      }

      // 7. Update context (so next transformations know about this one)
      result.nodes.forEach(node => {
        this.context.nodeIdToName.set(node.id, node.name);
      });

      // 8. Track task completion in memory (will be batched with flushBatch)
      this.completedTaskPositions.push(task.position);

      console.log(`    Task ${task.position} completed`);
    } catch (error) {
      console.error(`   ❌ Task ${task.position} failed:`, error);

      // Flush any pending work before marking failure
      if (this.compiledNodes.length > 0 || this.completedTaskPositions.length > 0) {
        try {
          await this.flushBatch();
        } catch (flushError) {
          console.error(`   ⚠️  Failed to flush batch before error:`, flushError);
        }
      }

      // Mark this specific task as failed (immediate write for error visibility)
      await updateSkeletonTaskStatus(
        this.tenantId,
        this.workflowId,
        task.position,
        'failed'
      );

      throw error;
    }
  }

  /**
   * Flush accumulated nodes to Firestore
   */
  private async flushBatch(): Promise<void> {
    console.log(`   💾 Flushing batch - ${this.compiledNodes.length} nodes, ${this.completedTaskPositions.length} task statuses`);

    // Batch write compiled nodes
    if (this.compiledNodes.length > 0) {
      await appendCompiledWorkflow(
        this.tenantId,
        this.workflowId,
        this.compiledNodes,
        this.internalEdges, // Pass cumulative internal edges
        this.replacements   // Pass cumulative replacements
      );
    }

    // Batch update skeleton task statuses
    if (this.completedTaskPositions.length > 0) {
      await batchUpdateSkeletonStatuses(
        this.tenantId,
        this.workflowId,
        this.completedTaskPositions
      );
    }

    // Clear all batch state
    this.compiledNodes = [];
    this.internalEdges = [];
    this.replacements = {};
    this.completedTaskPositions = [];
  }

}
