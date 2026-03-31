/**
 * Contact Field Adapter Injection
 *
 * Analyzes workflow graph and injects contact adapter nodes after contact sources.
 * Used during planning phase to prepare workflow for contact field resolution.
 */

import { topologicalSort } from '../../utils/topologicalSort';

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    nodeName?: string;
    parameters?: Record<string, any>;
    [key: string]: any;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

interface ContactSource {
  node: ReactFlowNode;
  weight: number;
  type: 'trigger' | 'findContact' | 'createContact';
}

interface AdapterInjectionResult {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  adapterMap: Map<string, string>;
}

export async function injectContactFieldAdapter(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): Promise<AdapterInjectionResult> {
  console.log(`🔧 Starting contact field adapter injection...`);
  console.log(`   📊 Input: ${nodes.length} nodes, ${edges.length} edges`);

  const modifiedNodes = [...nodes];
  const modifiedEdges = [...edges];
  const adapterMap = new Map<string, string>();

  const triggerNode = nodes.find((n) => n.type === 'trigger');
  if (!triggerNode) {
    console.log(`   ⚠️  No trigger node found`);
    return { nodes, edges, adapterMap };
  }

  console.log(`   ✅ Found trigger: ${triggerNode.id}`);

  const contactSources: ContactSource[] = [
    { node: triggerNode, weight: 1, type: 'trigger' }
  ];

  const findContactNodes = nodes.filter((n) => n.data.nodeName === 'pulselineFindContact');
  findContactNodes.forEach((node) => {
    contactSources.push({ node, weight: 2, type: 'findContact' });
  });

  const createContactNodes = nodes.filter((n) => n.data.nodeName === 'pulselineCreateContact');
  createContactNodes.forEach((node) => {
    contactSources.push({ node, weight: 3, type: 'createContact' });
  });

  console.log(`   📍 Found ${contactSources.length} sources (trigger: 1, find: ${findContactNodes.length}, create: ${createContactNodes.length})`);

  // Topological sort to get execution order
  const orderedNodes = topologicalSort(nodes, edges);
  const executionOrder = orderedNodes.map(n => n.id); // Convert to IDs for downstream analysis
  const injectedAdapters: { adapterId: string; sourceId: string; weight: number }[] = [];

  for (const source of contactSources) {
    const adapterNode = createAdapterNode(source.node, source.type);
    const adapterId = adapterNode.id;

    console.log(`   📦 Injecting: ${adapterId}`);

    const outgoingEdges = edges.filter((e) => e.source === source.node.id);
    if (outgoingEdges.length === 0) {
      modifiedNodes.push(adapterNode);
      injectedAdapters.push({ adapterId, sourceId: source.node.id, weight: source.weight });
      continue;
    }

    outgoingEdges.forEach((edge) => {
      const edgeIndex = modifiedEdges.findIndex((e) => e.id === edge.id);
      if (edgeIndex !== -1) modifiedEdges.splice(edgeIndex, 1);

      modifiedEdges.push({
        id: `${edge.source}-${adapterId}`,
        source: edge.source,
        target: adapterId,
        sourceHandle: edge.sourceHandle,
        type: 'deletable',
      });

      modifiedEdges.push({
        id: `${adapterId}-${edge.target}`,
        source: adapterId,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: 'deletable',
      });
    });

    modifiedNodes.push(adapterNode);
    injectedAdapters.push({ adapterId, sourceId: source.node.id, weight: source.weight });
  }

  const weightedSourceIds = contactSources.map((s) => s.node.id);
  injectedAdapters.forEach((adapter) => {
    const downstreamIds = findDownstreamNodes(adapter.sourceId, executionOrder, weightedSourceIds);
    downstreamIds.forEach((nodeId) => {
      // Don't map a source node to its own adapter - it needs to use upstream adapter for its inputs
      if (nodeId === adapter.sourceId) {
        return;
      }

      const existingAdapter = adapterMap.get(nodeId);
      if (!existingAdapter) {
        adapterMap.set(nodeId, adapter.adapterId);
      } else {
        const existingWeight = injectedAdapters.find((a) => a.adapterId === existingAdapter)?.weight || 0;
        if (adapter.weight > existingWeight) {
          adapterMap.set(nodeId, adapter.adapterId);
        }
      }
    });
  });

  console.log(`   ✅ Complete: ${modifiedNodes.length} nodes, ${adapterMap.size} mappings`);
  return { nodes: modifiedNodes, edges: modifiedEdges, adapterMap };
}

function createAdapterNode(
  sourceNode: ReactFlowNode,
  sourceType: 'trigger' | 'findContact' | 'createContact'
): ReactFlowNode {
  const adapterId = `contactAdapter-${sourceNode.id}`;

  let contactIdExpression: string;
  if (sourceType === 'trigger') {
    // For trigger, try $json.body.contactId first, fall back to $json.contactId
    contactIdExpression = '={{$json.body?.contactId || $json.contactId}}';
  } else if (sourceType === 'createContact') {
    // For Create Contact, use the contactId from the response
    contactIdExpression = `={{$node["${sourceNode.id}"].json["contactId"]}}`;
  } else {
    // For Find Contact, use the contactId from the response
    contactIdExpression = `={{$node["${sourceNode.id}"].json["contactId"]}}`;
  }

  return {
    id: adapterId,
    type: 'adapter',
    position: { x: sourceNode.position.x + 300, y: sourceNode.position.y },
    data: {
      label: 'Contact Adapter',
      nodeName: 'contactAdapter',
      parameters: { contactId: contactIdExpression },
      _isAdapter: true,
      _adapterType: 'contact',
      _sourceNode: sourceNode.id,
      _sourceType: sourceType,
    },
  };
}

/**
 * Find all downstream nodes from a given source node
 * Stops at next weighted contact source (FindContact/CreateContact node)
 *
 * @param sourceNodeId - Starting node ID
 * @param executionOrder - Pre-calculated execution order (array of node IDs)
 * @param weightedSources - Array of contact source node IDs (to stop at)
 * @returns Set of downstream node IDs
 */
function findDownstreamNodes(
  sourceNodeId: string,
  executionOrder: string[],
  weightedSources: string[]
): Set<string> {
  const downstream = new Set<string>();
  const sourceIndex = executionOrder.indexOf(sourceNodeId);

  if (sourceIndex === -1) {
    console.warn(`Source node ${sourceNodeId} not found in execution order`);
    return downstream;
  }

  // Walk forward through execution order
  for (let i = sourceIndex + 1; i < executionOrder.length; i++) {
    const nodeId = executionOrder[i];

    // If we hit another weighted source (e.g., FindContact node):
    // - Include it in downstream set (so it uses this adapter for its inputs)
    // - Then stop (its outputs will use its own adapter)
    if (weightedSources.includes(nodeId) && nodeId !== sourceNodeId) {
      downstream.add(nodeId); // Include the source node itself - it consumes upstream adapter
      break;
    }

    downstream.add(nodeId);
  }

  return downstream;
}
