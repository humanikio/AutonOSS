'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAutomation, updateAutomation } from '@/lib/api/automations';
import { setTokenGetter } from '@/lib/api/client';
import { nodeRegistryApi, NodeListItem } from '@/lib/api/nodeRegistry';
import { getCategoryFromGroup } from '@/lib/nodeCategoryConfig';
import { getIconComponent } from '@/lib/iconMapping';
import {
  ArrowLeft,
  Edit,
  RotateCcw,
  X,
  Search,
  Wifi,
  Zap,
  GitBranch,
  Clock,
  Code,
  Send,
  Pause,
  Settings,
  Split,
  Merge as MergeIcon,
  Target,
  Plus,
  Play,
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import custom nodes
import TriggerNode from '../components/TriggerNode';
import ActionNode from '../components/ActionNode';
import ConditionNode from '../components/ConditionNode';
import AddNode from '../components/AddNode';
import AdapterNode from '../components/AdapterNode';
import DeletableEdge from '../components/DeletableEdge';
import { NodeConfigPanel } from '../components/NodeConfigPanel';
import ExecutionsModal from '../components/ExecutionsModal';
import TestWorkflowPanel from '../components/TestWorkflowPanel';

// Define node types
const nodeTypes: any = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  addNode: AddNode,
  adapter: AdapterNode,
};

// Define edge types
const edgeTypes: any = {
  deletable: DeletableEdge,
};

/**
 * Generate parameters from node config's parameterDefaults
 * Supports different generation patterns: timestamp, uuid, static
 */
const generateParametersFromConfig = (nodeConfig: any): Record<string, any> => {
  if (!nodeConfig?.parameterDefaults) return {};

  const parameters: Record<string, any> = {};

  Object.entries(nodeConfig.parameterDefaults).forEach(([key, config]: [string, any]) => {
    switch (config.pattern) {
      case 'timestamp':
        parameters[key] = `${config.value}${Date.now()}`;
        break;
      case 'uuid':
        parameters[key] = `${config.value}${crypto.randomUUID()}`;
        break;
      case 'static':
      default:
        parameters[key] = config.value;
        break;
    }
  });

  return parameters;
};

/**
 * Extract default parameter values from node config's properties
 * Used for trigger nodes that have user-configurable parameters
 */
const extractDefaultParameters = (nodeConfig: any): Record<string, any> => {
  if (!nodeConfig?.properties || !Array.isArray(nodeConfig.properties)) return {};

  const parameters: Record<string, any> = {};

  nodeConfig.properties.forEach((property: any) => {
    if (property.name && property.default !== undefined) {
      parameters[property.name] = property.default;
    }
  });

  return parameters;
};

// Initial nodes - empty canvas
const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export default function AutomationsEditor() {
  const router = useRouter();
  const params = useParams();
  const { user, getToken, currentTenantId } = useAuth();
  const workflowId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'builder'>('builder');
  const [activeView, setActiveView] = useState<'editor' | 'executions'>('editor');
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false); // Toggle for n8n sync
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showTriggerPanel, setShowTriggerPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ sourceNodeId: string; sourceHandleId: string } | null>(null);
  const [workflowName, setWorkflowName] = useState('Workflow Editor');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempWorkflowName, setTempWorkflowName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [reconnectingEdge, setReconnectingEdge] = useState<string | null>(null);
  const reconnectingEdgeRef = useRef<string | null>(null);
  const initialLoadCompleteRef = useRef(false);
  const [availableNodes, setAvailableNodes] = useState<NodeListItem[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [configPanelNode, setConfigPanelNode] = useState<{
    id: string;
    name: string;
    type: 'trigger' | 'action' | 'condition';
    parameters: Record<string, any>;
  } | null>(null);
  const [copiedNode, setCopiedNode] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'node' | 'pane';
    node?: Node;
  } | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const nodesRef = useRef<Node[]>(nodes); // Keep a ref to latest nodes

  // Set up token getter for API calls
  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken);
    }
  }, [getToken]);

  // Load available nodes from registry
  useEffect(() => {
    const loadAvailableNodes = async () => {
      try {
        const response = await nodeRegistryApi.getAllNodes();
        if (response.success) {
          setAvailableNodes(response.data);
        }
      } catch (error) {
        console.error('Error loading available nodes:', error);
      } finally {
        setLoadingNodes(false);
      }
    };

    loadAvailableNodes();
  }, []);

  // Load workflow data
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!user || !workflowId || availableNodes.length === 0) return;

      setLoading(true);
      try {
        const workflow = await getAutomation(workflowId);
        setWorkflowName(workflow.name);
        setIsPublished(workflow.status === 'active');
        setIsPublic((workflow as any).isPublic || false); // Load isPublic state

        // Load nodes and edges if they exist
        if (workflow.nodes && workflow.nodes.length > 0) {
          // Enrich nodes with categoryColor if missing (for backward compatibility)
          const enrichedNodes = workflow.nodes.map((node: Node) => {
            if (!node.data.categoryColor && node.data.nodeName) {
              // Find node info from available nodes
              const nodeInfo = availableNodes.find(n => n.name === node.data.nodeName);
              if (nodeInfo) {
                const categoryInfo = getCategoryFromGroup(nodeInfo.group || []);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    categoryColor: categoryInfo.color,
                  }
                };
              }
            }
            return node;
          });
          setNodes(enrichedNodes);
        }
        if (workflow.edges && workflow.edges.length > 0) {
          setEdges(workflow.edges);
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
      } finally {
        setLoading(false);
        // Mark initial load as complete after a short delay to let state settle
        setTimeout(() => {
          initialLoadCompleteRef.current = true;
        }, 100);
      }
    };

    loadWorkflow();
  }, [user, workflowId, setNodes, setEdges, availableNodes]);

  // Update nodes ref whenever nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Track unsaved changes (only after initial load)
  useEffect(() => {
    if (!loading && initialLoadCompleteRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, isPublic, isPublished, workflowName, loading]);

  // Manual save function
  const handleSave = async () => {
    if (!user || !workflowId || loading) return;

    setSaving(true);
    try {
      await updateAutomation(workflowId, {
        name: workflowName, // Include updated name
        nodes,
        edges,
        status: isPublished ? 'active' : 'draft',
        isPublic, // Include isPublic in save request
      } as any);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  // Handle workflow name editing
  const handleStartEditingName = () => {
    setTempWorkflowName(workflowName);
    setIsEditingName(true);
  };

  const handleSaveWorkflowName = () => {
    if (tempWorkflowName.trim()) {
      setWorkflowName(tempWorkflowName.trim());
      setIsEditingName(false);
      setHasUnsavedChanges(true);
    }
  };

  const handleCancelEditingName = () => {
    setTempWorkflowName('');
    setIsEditingName(false);
  };

  const handleWorkflowNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveWorkflowName();
    } else if (e.key === 'Escape') {
      handleCancelEditingName();
    }
  };

  // Handle request to add node from a specific handle
  const handleAddNodeFromHandle = useCallback((sourceNodeId: string, sourceHandleId: string) => {
    setPendingConnection({ sourceNodeId, sourceHandleId });
    setShowActionPanel(true);
  }, []);

  // Handle node deletion
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    // Get current node from ref (avoids dependency on nodes array)
    const nodeToDelete = nodesRef.current.find(n => n.id === nodeId);

    // Check if this is an adapter node - prevent deletion
    if (nodeToDelete?.type === 'adapter' || (nodeToDelete?.data as any)?._isAdapter) {
      console.warn('Cannot delete adapter nodes - they are system-managed');
      alert('Adapter nodes are automatically managed and cannot be deleted manually.');
      return;
    }

    // If this is a subscription trigger, delete subscription first
    const nodeConfig = (nodeToDelete?.data as any)?.config;
    if (nodeConfig?._pulseline?.isTrigger && nodeConfig._pulseline?.triggerType) {
      try {
        console.log(`🗑️ Deleting subscription for trigger node: ${nodeId}`);

        const token = await getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // Find subscription by workflowId
        const findResponse = await fetch(
          `${apiUrl}/api/workflows/trigger-subscriptions?workflowId=${workflowId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (findResponse.ok) {
          const result = await findResponse.json();

          if (result.data && result.data.length > 0) {
            const subscriptionId = result.data[0].id;

            // Delete subscription
            const deleteResponse = await fetch(
              `${apiUrl}/api/workflows/trigger-subscriptions/${subscriptionId}`,
              {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );

            if (deleteResponse.ok) {
              console.log(`✅ Subscription deleted: ${subscriptionId}`);
            } else {
              const error = await deleteResponse.json();
              console.error('❌ Subscription deletion failed:', error);
              alert(`Failed to delete subscription: ${error.error}`);
              return; // Don't delete node if subscription deletion failed
            }
          }
        }
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('Failed to delete subscription. Please try again.');
        return; // Don't delete node if subscription deletion failed
      }
    }

    // Remove the node
    setNodes((currentNodes) => currentNodes.filter((n) => n.id !== nodeId));

    // Remove any edges connected to this node
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [workflowId, getToken, setNodes, setEdges]);

  // Update nodes with connection state for handles and add callbacks
  useEffect(() => {
    console.log('🟡 connectedHandles useEffect triggered, nodes:', nodes.length, 'edges:', edges.length);

    setNodes((nds) => {
      // Log current state
      console.log('🟡 Current nodes in setter:', nds.map(n => ({
        id: n.id,
        hasLabel: !!n.data?.label,
        hasNodeName: !!n.data?.nodeName
      })));

      return nds.map((node) => {
        // Check which handles from this node have connections
        const connectedHandles = new Set<string>();
        edges.forEach((edge) => {
          if (edge.source === node.id) {
            connectedHandles.add(edge.sourceHandle || 'default');
          }
        });

        // CRITICAL: Don't update if node.data is undefined or missing essential properties
        if (!node.data) {
          console.error('🔴 Node has no data object!', { nodeId: node.id, node });
          return node; // Return as-is to prevent corruption
        }

        if (!node.data.label || !node.data.nodeName) {
          console.error('🔴 Node missing essential data!', {
            nodeId: node.id,
            hasLabel: !!node.data.label,
            hasNodeName: !!node.data.nodeName,
            data: node.data
          });
          return node; // Return as-is to prevent further corruption
        }

        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            connectedHandles: Array.from(connectedHandles),
            onAddNode: handleAddNodeFromHandle,
            onDeleteNode: handleDeleteNode,
          } as typeof node.data,
        };

        // Log if label is missing after update
        if (!updatedNode.data?.label && node.data?.label) {
          console.error('🔴 LABEL LOST in connectedHandles useEffect!', {
            nodeId: node.id,
            beforeData: JSON.stringify(node.data),
            afterData: JSON.stringify(updatedNode.data),
          });
        }

        return updatedNode;
      });
    });
  }, [edges, nodes.length, setNodes, handleAddNodeFromHandle, handleDeleteNode]);

  // Check if connection is valid (prevent multiple connections from same output)
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      // Check if source handle already has a connection
      // Exclude the edge being reconnected from the check
      const existingConnection = edges.find(
        (edge) =>
          edge.id !== reconnectingEdge &&
          edge.source === connection.source &&
          (edge.sourceHandle || null) === (connection.sourceHandle || null)
      );

      // Only allow connection if source handle doesn't have an existing connection
      return !existingConnection;
    },
    [edges, reconnectingEdge]
  );

  // Handle connection between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      // Double check validation before adding
      if (isValidConnection(params)) {
        setEdges((eds) => addEdge({
          ...params,
          type: 'deletable',
          style: { stroke: '#9ca3af', strokeWidth: 3 },
          deletable: true,
        }, eds));
      }
    },
    [setEdges, isValidConnection]
  );

  // Handle edge reconnect start
  const onReconnectStart = useCallback((_event: any, edge: Edge) => {
    console.log('🔄 Reconnect started for edge:', edge.id);
    setReconnectingEdge(edge.id);
    reconnectingEdgeRef.current = edge.id;
  }, []);

  // Handle edge reconnection - allow reconnecting to different targets
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      console.log('🔗 Reconnecting edge:', oldEdge.id, 'to new connection:', newConnection);

      // Check if the new connection is valid
      if (newConnection.source && newConnection.target && isValidConnection(newConnection)) {
        setEdges((els) => {
          // Remove old edge
          const filteredEdges = els.filter((e) => e.id !== oldEdge.id);
          // Add new edge with the new connection
          return addEdge({
            ...newConnection,
            type: 'deletable',
            style: { stroke: '#9ca3af', strokeWidth: 3 },
            deletable: true,
          }, filteredEdges);
        });
      }

      // Clear reconnecting state - edge was successfully reconnected
      reconnectingEdgeRef.current = null;
      setReconnectingEdge(null);
    },
    [setEdges, isValidConnection]
  );

  // Handle edge reconnect end - delete edge if dropped in empty space
  const onReconnectEnd = useCallback((_event: any, edge: Edge) => {
    console.log('🏁 Reconnect ended for edge:', edge.id);

    // Small delay to check if the edge was actually reconnected
    setTimeout(() => {
      // If ref still has the edge ID, it means onReconnect wasn't called
      // User dropped the edge in empty space - delete it
      if (reconnectingEdgeRef.current === edge.id) {
        console.log('❌ Removing disconnected edge:', edge.id);
        setEdges((els) => els.filter((e) => e.id !== edge.id));
      }

      // Clear state
      reconnectingEdgeRef.current = null;
      setReconnectingEdge(null);
    }, 50);
  }, [setEdges]);

  // Handle keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't delete nodes/edges if user is typing in an input field
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable;

      if (isTyping) {
        return; // Let the input handle the keypress normally
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        setEdges((eds) => eds.filter((edge) => !edge.selected));
        setNodes((nds) => nds.filter((node) => !node.selected));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setEdges, setNodes]);

  // Add new action node
  const addActionNode = useCallback(async (actionId: string, actionTitle: string, icon: any) => {
    const newNodeId = `action-${Date.now()}`;

    // Calculate position based on pending connection or selected node
    let xPos = 250;
    let yPos = nodes.length * 150 + 50;

    if (pendingConnection || selectedNodeId) {
      const sourceId = pendingConnection?.sourceNodeId || selectedNodeId;
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (sourceNode) {
        xPos = sourceNode.position.x + 350;
        yPos = sourceNode.position.y;

        // Handle conditional output spacing for branching nodes
        if (pendingConnection?.sourceHandleId) {
          const handleId = pendingConnection.sourceHandleId;

          // Count existing nodes on this specific branch
          const existingNodesOnBranch = edges.filter(e =>
            e.source === sourceId &&
            (e.sourceHandle || 'output_0') === handleId
          ).length;

          // Vertical offset based on output handle
          if (handleId === 'output_0') {
            // True branch (top) - shift up
            yPos -= 100;
          } else if (handleId === 'output_1') {
            // False branch (bottom) - shift down
            yPos += 100;
          }

          // Additional spacing if there are already nodes on this branch
          // Stagger nodes vertically to prevent overlap
          if (existingNodesOnBranch > 0) {
            if (handleId === 'output_1') {
              // For bottom branch, continue downward
              yPos += existingNodesOnBranch * 150;
            } else {
              // For top branch, continue upward
              yPos -= existingNodesOnBranch * 150;
            }
          }
        }
      }
    }

    // Determine node type from available nodes
    const nodeInfo = availableNodes.find(n => n.name === actionId);
    const nodeCategory = nodeInfo?.category || 'action';

    // Get the backend icon string (e.g., 'fa:comment-dots') from nodeInfo
    // Handle icon being either string or object with light/dark variants
    const backendIcon = typeof nodeInfo?.icon === 'string' ? nodeInfo.icon : nodeInfo?.icon?.light;

    // Get category color from node group
    const categoryInfo = getCategoryFromGroup(nodeInfo?.group || []);
    const categoryColor = categoryInfo.color;

    // Load node config to auto-populate hidden fields
    let initialParameters: Record<string, any> = {};
    try {
      const configResponse = await nodeRegistryApi.getNodeConfig(actionId);
      if (configResponse.success && configResponse.data) {
        const nodeConfig = configResponse.data;

        // Check for hidden fields that need auto-population
        if (nodeConfig.properties) {
          nodeConfig.properties.forEach((prop: any) => {
            if (prop.type === 'hidden') {
              // Auto-populate hidden fields
              if (prop.name === 'workflowId') {
                initialParameters[prop.name] = workflowId;
              } else if (prop.name === 'nodeId') {
                initialParameters[prop.name] = newNodeId;
              } else if (prop.name === 'nodeName') {
                initialParameters[prop.name] = actionId;
              } else if (prop.default !== undefined) {
                initialParameters[prop.name] = prop.default;
              }
            } else if (prop.default !== undefined && prop.default !== '') {
              // Set default values for visible fields
              initialParameters[prop.name] = prop.default;
            }
          });
        }

        if (Object.keys(initialParameters).length > 0) {
          console.log(`✅ Auto-populated parameters for ${actionId}:`, initialParameters);
        }
      }
    } catch (error) {
      console.error(`Error loading config for ${actionId}:`, error);
    }

    const newNode: Node = {
      id: newNodeId,
      type: nodeCategory === 'condition' ? 'condition' : 'action',
      position: { x: xPos, y: yPos },
      data: {
        label: actionTitle,
        icon: backendIcon, // Store backend icon string (e.g., 'fa:comment-dots')
        iconName: icon?.name, // Also store Lucide icon name as fallback
        subtitle: 'Configure action',
        nodeName: actionId, // Store the actual node name for config panel
        parameters: initialParameters, // Use auto-populated parameters
        categoryColor, // Add category color for node styling
      },
    };

    // Add the new node
    setNodes((nds) => [...nds, newNode]);

    // If there's a pending connection from a plus button click, use that
    if (pendingConnection) {
      const newEdge: Edge = {
        id: `e${pendingConnection.sourceNodeId}-${pendingConnection.sourceHandleId}-${newNodeId}`,
        source: pendingConnection.sourceNodeId,
        sourceHandle: pendingConnection.sourceHandleId === 'default' ? null : pendingConnection.sourceHandleId,
        target: newNodeId,
        type: 'deletable',
        style: { stroke: '#9ca3af', strokeWidth: 3 },
        deletable: true,
      };
      setEdges((eds) => [...eds, newEdge]);
      setPendingConnection(null);
    }
    // Otherwise if there was a selected node, connect to it
    else if (selectedNodeId) {
      const newEdge: Edge = {
        id: `e${selectedNodeId}-${newNodeId}`,
        source: selectedNodeId,
        target: newNodeId,
        type: 'deletable',
        style: { stroke: '#9ca3af', strokeWidth: 3 },
        deletable: true,
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    setShowActionPanel(false);
    setSearchQuery('');
  }, [nodes, selectedNodeId, pendingConnection, setNodes, setEdges, availableNodes, workflowId]);

  // Add new trigger node
  const addTriggerNode = useCallback(async (triggerId: string, triggerTitle: string, icon: any) => {
    const newNodeId = `trigger-${Date.now()}`;

    // Get the backend icon string from node info
    const nodeInfo = availableNodes.find(n => n.name === triggerId);
    // Handle icon being either string or object with light/dark variants
    const backendIcon = typeof nodeInfo?.icon === 'string' ? nodeInfo.icon : nodeInfo?.icon?.light;

    // Get category color from node group
    const categoryInfo = getCategoryFromGroup(nodeInfo?.group || []);
    const categoryColor = categoryInfo.color;

    // Load node config to get parameter defaults and check if subscription trigger
    let initialParameters = {};
    let nodeConfig: any = null;
    try {
      const configResponse = await nodeRegistryApi.getNodeConfig(triggerId);
      if (configResponse.success && configResponse.data) {
        nodeConfig = configResponse.data;

        // Extract default parameters based on node type
        if (nodeConfig._pulseline?.isTrigger) {
          // For subscription triggers: extract default values from properties
          initialParameters = extractDefaultParameters(nodeConfig);
          console.log(`📋 Extracted default parameters for subscription trigger ${triggerId}:`, initialParameters);
        } else {
          // For regular nodes: use parameterDefaults with generation patterns
          initialParameters = generateParametersFromConfig(nodeConfig);
          if (Object.keys(initialParameters).length > 0) {
            console.log(`✅ Generated parameters for ${triggerId}:`, initialParameters);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading config for ${triggerId}:`, error);
    }

    const newNode: Node = {
      id: newNodeId,
      type: 'trigger',
      position: { x: 100, y: 50 },
      data: {
        label: triggerTitle,
        icon: backendIcon, // Store backend icon string (e.g., 'fa:clock')
        iconName: icon?.name, // Also store Lucide icon name as fallback
        subtitle: 'Configure trigger',
        nodeName: triggerId, // Store the actual node name for config panel
        parameters: initialParameters, // Use generated parameters from config
        categoryColor, // Add category color for node styling
        // Attach successResponse for subscription triggers (for mapping)
        successResponse: nodeConfig?._pulseline?.successResponse?.fields || undefined,
      },
    };

    setNodes((nds) => [newNode, ...nds]);

    // If this is a subscription trigger, create subscription via API
    if (nodeConfig?._pulseline?.isTrigger && nodeConfig._pulseline?.triggerType) {
      try {
        console.log(`📡 Creating subscription: ${nodeConfig._pulseline.triggerType}`);

        const token = await getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/workflows/trigger-subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            workflowId: workflowId,
            triggerType: nodeConfig._pulseline.triggerType,
            enabled: true,
            nodeParameters: {
              ...initialParameters,
              nodeId: newNodeId  // Store ReactFlow node ID for lookup
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Subscription created: ${result.data.id}`);
        } else {
          const error = await response.json();
          console.error('❌ Subscription creation failed:', error);

          // Handle 1:1 constraint violation
          if (error.error?.includes('already has a trigger subscription')) {
            alert('This workflow already has a trigger subscription. Remove the existing trigger first.');
            setNodes(nds => nds.filter(n => n.id !== newNodeId));
          } else {
            alert(`Failed to create subscription: ${error.error}`);
          }
        }
      } catch (error) {
        console.error('Error creating subscription:', error);
        alert('Failed to create subscription. Please try again.');
      }
    }

    setShowTriggerPanel(false);
    setSearchQuery('');
  }, [setNodes, availableNodes, workflowId, getToken]);

  // Helper function to get icon component based on node name
  const getNodeIcon = (nodeName: string) => {
    const iconMap: Record<string, any> = {
      webhook: Wifi,
      scheduleTrigger: Clock,
      httpRequest: Send,
      wait: Pause,
      set: Settings,
      code: Code,
      merge: MergeIcon,
      if: GitBranch,
      switch: Split,
      pulselineCreateOpportunity: Plus,
      pulselineUpdateOpportunity: Target,
    };
    return iconMap[nodeName] || Zap;
  };

  // Get actions and triggers from available nodes with new category system
  const actions = availableNodes
    .filter(node => {
      // Exclude adapter nodes (invisible, auto-injected nodes)
      if (node.group.includes('adapter')) {
        return false;
      }
      return node.category === 'action' || node.category === 'condition';
    })
    .map(node => {
      const categoryInfo = getCategoryFromGroup(node.group);
      // Handle icon being either string or object with light/dark variants
      const iconString = typeof node.icon === 'string' ? node.icon : node.icon?.light;
      return {
        id: node.name,
        title: node.displayName,
        icon: getIconComponent(iconString, Zap),
        category: categoryInfo.displayName,
        categoryId: categoryInfo.id,
        categoryIcon: categoryInfo.icon,
        categoryColor: categoryInfo.color,
      };
    });

  const triggers = availableNodes
    .filter(node => {
      // Exclude adapter nodes (invisible, auto-injected nodes)
      if (node.group.includes('adapter')) {
        return false;
      }
      return node.category === 'trigger';
    })
    .map(node => {
      const categoryInfo = getCategoryFromGroup(node.group);
      // Handle icon being either string or object with light/dark variants
      const iconString = typeof node.icon === 'string' ? node.icon : node.icon?.light;
      return {
        id: node.name,
        title: node.displayName,
        icon: getIconComponent(iconString, Wifi),
        category: categoryInfo.displayName,
        categoryId: categoryInfo.id,
        categoryIcon: categoryInfo.icon,
        categoryColor: categoryInfo.color,
      };
    });

  const filteredActions = actions.filter(action =>
    action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTriggers = triggers.filter(trigger =>
    trigger.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trigger.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedActions = filteredActions.reduce((groups, action) => {
    const category = action.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(action);
    return groups;
  }, {} as Record<string, typeof actions>);

  const groupedTriggers = filteredTriggers.reduce((groups, trigger) => {
    const category = trigger.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(trigger);
    return groups;
  }, {} as Record<string, typeof triggers>);

  // Handle node click
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Skip adapter nodes - they should not be configurable
    if (node.type === 'adapter' || (node.data as any)?._isAdapter) {
      console.log('Adapter node clicked - ignoring (adapters are not user-configurable)');
      return;
    }

    if (node.type === 'addNode') {
      setSelectedNodeId(null);
      setShowActionPanel(true);
    } else {
      setSelectedNodeId(node.id);

      // Open config panel for the clicked node
      const nodeData = node.data as any;
      console.log('Node clicked:', { id: node.id, type: node.type, data: nodeData });

      // Map node type to category
      let nodeCategory: 'trigger' | 'action' | 'condition' = 'action';
      if (node.type === 'trigger') nodeCategory = 'trigger';
      else if (node.type === 'condition') nodeCategory = 'condition';

      // Get node name (stored when creating nodes)
      // If nodeName is not stored, this is an old node - skip opening config
      const nodeName = nodeData?.nodeName;

      if (!nodeName) {
        console.warn('Node does not have nodeName field - cannot open config panel');
        alert('This node was created with an older version. Please delete it and add it again to configure.');
        return;
      }

      console.log('Opening config panel for node:', nodeName);

      setConfigPanelNode({
        id: node.id,
        name: nodeName,
        type: nodeCategory,
        parameters: nodeData?.parameters || {},
      });
    }
  }, []);

  // Handle right-click on node to show copy option
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // Don't show context menu for addNode types
    if (node.type === 'addNode') return;

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      node
    });
  }, []);

  // Handle right-click on canvas to show paste option
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    if (copiedNode) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'pane'
      });
    }
  }, [copiedNode]);

  // Copy node handler
  const handleCopyNode = useCallback((node: Node) => {
    setCopiedNode(node);
    setContextMenu(null);
    console.log('Node copied:', node.id);
  }, []);

  // Paste node handler with parameter regeneration
  const handlePasteNode = useCallback(async (screenPosition: { x: number, y: number }) => {
    if (!copiedNode || !reactFlowInstanceRef.current) return;

    const nodeData = copiedNode.data as any;
    const nodeName = nodeData?.nodeName;

    if (!nodeName) {
      console.error('Cannot paste node without nodeName');
      return;
    }

    try {
      // Fetch node config to check for auto-generated parameters
      const configResponse = await nodeRegistryApi.getNodeConfig(nodeName);
      if (!configResponse.success) {
        console.error('Failed to fetch node config for pasting');
        return;
      }

      const nodeConfig = configResponse.data;

      // Regenerate auto-generated parameters (like webhook paths)
      const regeneratedParams = generateParametersFromConfig(nodeConfig);

      // Merge: keep user-configured params, overwrite auto-generated ones
      const newParameters = {
        ...nodeData.parameters,
        ...regeneratedParams
      };

      // Convert screen position to flow position (accounting for zoom/pan)
      const flowPosition = reactFlowInstanceRef.current.screenToFlowPosition({
        x: screenPosition.x,
        y: screenPosition.y
      });

      // Create new node with unique ID
      const newNode = {
        id: `${nodeName}-${Date.now()}`,
        type: copiedNode.type,
        position: flowPosition,
        data: {
          ...nodeData,
          parameters: newParameters,
          label: nodeData.label || nodeConfig.displayName
        }
      };

      setNodes(nds => [...nds, newNode]);
      setContextMenu(null);
      setHasUnsavedChanges(true);
      console.log('Node pasted at:', flowPosition);
    } catch (error) {
      console.error('Error pasting node:', error);
    }
  }, [copiedNode, setNodes]);

  // Close context menu when clicking anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/automations')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Workflows</span>
              </button>

              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <input
                    type="text"
                    value={tempWorkflowName}
                    onChange={(e) => setTempWorkflowName(e.target.value)}
                    onBlur={handleSaveWorkflowName}
                    onKeyDown={handleWorkflowNameKeyDown}
                    autoFocus
                    className="text-xl font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent px-1"
                    placeholder="Workflow name"
                  />
                ) : (
                  <>
                    <h1 className="text-xl font-semibold text-gray-900">{workflowName}</h1>
                    <button
                      onClick={handleStartEditingName}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Edit className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <img src="/logo/auton-logo.png" alt="Pulseline" className="h-6 w-auto" />
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <RotateCcw className="h-4 w-4 text-gray-400" />
              </button>

              {/* Public Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <span className="text-xs text-gray-700 font-medium">
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </div>

              {/* Test Button */}
              <button
                onClick={() => setShowTestPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <Play className="h-4 w-4" />
                Test
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  hasUnsavedChanges && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg animate-pulse'
                    : saving
                    ? 'bg-yellow-500 text-white cursor-wait'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>

              {lastSaved && !hasUnsavedChanges && (
                <div className="text-xs text-gray-500">
                  Last saved {new Date(lastSaved).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Editor/Executions Toggle */}
          <div className="flex items-center justify-end mt-4">
            <div className="inline-flex rounded-lg bg-gray-100 border border-gray-200 p-1">
              <button
                onClick={() => setActiveView('editor')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'editor'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveView('executions')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'executions'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Executions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-hidden bg-gray-50 relative">
        {/* Show Executions Modal */}
        {activeView === 'executions' && (
          <ExecutionsModal workflowId={workflowId} onClose={() => setActiveView('editor')} />
        )}

        {/* Show Editor */}
        {activeView === 'editor' && (
          <>
            {/* Loading State */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50">
                <div className="text-center">
                  <div className="mx-auto w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-gray-500">Loading workflow...</p>
                </div>
              </div>
            )}

            {/* Empty State - Show when no nodes */}
            {!loading && nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center pointer-events-auto">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                      <Wifi className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Start with a Trigger</h3>
                    <p className="text-gray-500 mb-6">Every workflow begins with a trigger that starts the automation</p>
                  </div>
                  <button
                    onClick={() => setShowTriggerPanel(true)}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                  >
                    Add Trigger
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'builder' && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            isValidConnection={isValidConnection}
            fitView
            minZoom={0.1}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
            className="bg-gray-50"
            edgesReconnectable={true}
            reconnectRadius={50}
            deleteKeyCode={['Backspace', 'Delete']}
            defaultEdgeOptions={{
              type: 'deletable',
              style: { stroke: '#9ca3af', strokeWidth: 3 },
              deletable: true,
            }}
            edgesFocusable={true}
            elementsSelectable={true}
            connectOnClick={false}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#d1d5db"
            />
            <Controls className="bg-white border border-gray-300 rounded-lg shadow-lg" />
            <MiniMap
              className="bg-white border border-gray-300 rounded-lg shadow-lg"
              nodeColor={(node): string => {
                // Use category color from node data if available
                if (node.data?.categoryColor) {
                  return node.data.categoryColor as string;
                }

                // Fallback to type-based colors for nodes without categoryColor
                if (node.type === 'trigger') return '#f97316';
                if (node.type === 'action') return '#3b82f6';
                if (node.type === 'condition') return '#a855f7';
                return '#6b7280';
              }}
            />
          </ReactFlow>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'node' && contextMenu.node && (
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handleCopyNode(contextMenu.node!)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          )}
          {contextMenu.type === 'pane' && copiedNode && (
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => handlePasteNode({ x: contextMenu.x, y: contextMenu.y })}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Paste
            </button>
          )}
        </div>
      )}

      {/* Action Panel Overlay */}
      {showActionPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => {
              setShowActionPanel(false);
              setPendingConnection(null);
            }}
          />

          {/* Side Panel */}
          <div className="fixed right-0 top-0 h-full w-[500px] bg-white border-l border-gray-200 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                <p className="text-sm text-gray-500">Pick an action for this step</p>
              </div>
              <button
                onClick={() => {
                  setShowActionPanel(false);
                  setPendingConnection(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Actions List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingNodes ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="mx-auto w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-500">Loading actions...</p>
                  </div>
                </div>
              ) : Object.entries(groupedActions).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No actions found</p>
                </div>
              ) : (
                Object.entries(groupedActions).map(([category, actions]) => {
                  const CategoryIcon = actions[0]?.categoryIcon;
                  const categoryColor = actions[0]?.categoryColor;

                  return (
                    <div key={category} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        {CategoryIcon && (
                          <CategoryIcon
                            className="h-4 w-4"
                            style={{ color: categoryColor }}
                          />
                        )}
                        <h3
                          className="text-sm font-medium"
                          style={{ color: categoryColor }}
                        >
                          {category}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {actions.map((action) => (
                          <button
                            key={action.id}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                            onClick={() => addActionNode(action.id, action.title, action.icon)}
                          >
                            <div
                              className="p-2 rounded-lg"
                              style={{
                                backgroundColor: `${categoryColor}15`,
                              }}
                            >
                              <action.icon
                                className="h-4 w-4"
                                style={{ color: categoryColor }}
                              />
                            </div>
                            <span className="text-sm text-gray-700">{action.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Trigger Panel Overlay */}
      {showTriggerPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setShowTriggerPanel(false)}
          />

          {/* Side Panel */}
          <div className="fixed right-0 top-0 h-full w-[500px] bg-white border-l border-gray-200 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Triggers</h2>
                <p className="text-sm text-gray-500">Pick a trigger for this workflow</p>
              </div>
              <button
                onClick={() => setShowTriggerPanel(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Triggers List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingNodes ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="mx-auto w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-500">Loading triggers...</p>
                  </div>
                </div>
              ) : Object.entries(groupedTriggers).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No triggers found</p>
                </div>
              ) : (
                Object.entries(groupedTriggers).map(([category, triggers]) => {
                  const CategoryIcon = triggers[0]?.categoryIcon;
                  const categoryColor = triggers[0]?.categoryColor;

                  return (
                    <div key={category} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        {CategoryIcon && (
                          <CategoryIcon
                            className="h-4 w-4"
                            style={{ color: categoryColor }}
                          />
                        )}
                        <h3
                          className="text-sm font-medium"
                          style={{ color: categoryColor }}
                        >
                          {category}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {triggers.map((trigger) => (
                          <button
                            key={trigger.id}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                            onClick={() => addTriggerNode(trigger.id, trigger.title, trigger.icon)}
                          >
                            <div
                              className="p-2 rounded-lg"
                              style={{
                                backgroundColor: `${categoryColor}15`,
                              }}
                            >
                              <trigger.icon
                                className="h-4 w-4"
                                style={{ color: categoryColor }}
                              />
                            </div>
                            <span className="text-sm text-gray-700">{trigger.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Node Config Panel */}
      {configPanelNode && (
        <NodeConfigPanel
          workflowId={workflowId}
          nodeId={configPanelNode.id}
          nodeName={configPanelNode.name}
          nodeType={configPanelNode.type}
          currentParameters={configPanelNode.parameters}
          allNodes={nodes}
          allEdges={edges}
          onSave={(parameters) => {
            const targetNodeId = configPanelNode?.id; // Capture ID at callback creation time
            console.log('🔵 onSave triggered for node:', targetNodeId);
            console.log('🔵 configPanelNode:', configPanelNode);
            console.log('🔵 configPanelNode.id:', configPanelNode?.id);

            if (!targetNodeId) {
              console.error('🔴 ERROR: targetNodeId is undefined!', { configPanelNode });
              return;
            }

            // Update node parameters while preserving other data properties
            setNodes((nds) => {
              console.log('🔵 Current nodes before update:', nds.length);
              console.log('🔵 Node IDs in array:', nds.map(n => n.id));
              console.log('🔵 Looking for node ID:', targetNodeId);

              let foundMatch = false;
              const updatedNodes = nds.map((node) => {
                if (node.id === targetNodeId) {
                  foundMatch = true;
                  console.log('🔵 Updating node:', {
                    nodeId: node.id,
                    nodeType: node.type,
                    hasLabel: !!node.data?.label,
                    hasNodeName: !!node.data?.nodeName,
                    hasIconName: !!node.data?.iconName,
                    existingData: JSON.stringify(node.data),
                    newParameters: JSON.stringify(parameters),
                  });

                  const updatedNode = {
                    ...node,
                    data: {
                      ...node.data,         // Preserve label, nodeName, iconName, subtitle, etc.
                      parameters,   // Update only parameters
                    } as typeof node.data,
                  };

                  console.log('🔵 Updated node result:', {
                    nodeId: updatedNode.id,
                    hasLabel: !!updatedNode.data?.label,
                    hasNodeName: !!updatedNode.data?.nodeName,
                    updatedData: JSON.stringify(updatedNode.data),
                  });

                  return updatedNode;
                }
                return node;
              });

              if (!foundMatch) {
                console.error('🔴 NO MATCH FOUND! Node ID not in array!', {
                  lookingFor: targetNodeId,
                  availableIds: nds.map(n => n.id)
                });
              }

              console.log('🔵 Nodes after update:', updatedNodes.length);
              console.log('🔵 All nodes after update:', updatedNodes.map(n => ({
                id: n.id,
                type: n.type,
                hasLabel: !!n.data?.label,
                hasNodeName: !!n.data?.nodeName,
                label: n.data?.label
              })));
              return updatedNodes;
            });

            console.log('🔵 Closing config panel');
            setConfigPanelNode(null);
          }}
          onClose={() => setConfigPanelNode(null)}
        />
      )}

      {/* Test Workflow Panel */}
      {showTestPanel && (
        <TestWorkflowPanel
          workflowId={workflowId}
          onClose={() => setShowTestPanel(false)}
          getToken={getToken}
          currentTenantId={currentTenantId}
        />
      )}
    </div>
  );
}
