'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { nodeRegistryApi, INodeTypeDescription } from '@/lib/api/nodeRegistry';
import { NodeParameterRenderer } from './NodeParameterRenderer';
import { WebhookTriggerConfig } from './WebhookTriggerConfig';
import { useAuth } from '@/contexts/AuthContext';
import { getAutomation } from '@/lib/api/automations';
import { db } from '@/lib/firebase/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { findPreviousNodes } from '@/lib/workflowGraphUtils';

interface TestEvent {
  id: string;
  payload: any;
  receivedAt: any;
  testUrl: string;
}

interface FieldDefinition {
  path: string;
  displayName: string;
  group: string;
  type: string;
  value: any;
  isNested: boolean;
  sourceNodeName?: string;
}

export interface NodeConfigPanelProps {
  workflowId: string;
  nodeId: string;
  nodeName: string;
  nodeType: 'trigger' | 'action' | 'condition';
  currentParameters: Record<string, any>;
  allNodes: Node[];
  allEdges: Edge[];
  onSave: (parameters: Record<string, any>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({
  workflowId,
  nodeId,
  nodeName,
  nodeType,
  currentParameters,
  allNodes,
  allEdges,
  onSave,
  onClose,
}: NodeConfigPanelProps) {
  const { user, getToken, tenant, currentTenantId } = useAuth();
  const [nodeConfig, setNodeConfig] = useState<INodeTypeDescription | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>(currentParameters);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [productionWebhookUrl, setProductionWebhookUrl] = useState<string | undefined>();

  // Test events state for webhook triggers
  const [testEvents, setTestEvents] = useState<TestEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [settingMapping, setSettingMapping] = useState(false);
  const [mappingSuccess, setMappingSuccess] = useState(false);

  // Available fields for mapping (from test payload)
  const [availableFields, setAvailableFields] = useState<FieldDefinition[]>([]);

  // Check if this is a webhook trigger node
  // Log to debug
  console.log('NodeConfigPanel nodeName:', nodeName, 'nodeType:', nodeType);

  const isWebhookTrigger =
    nodeName === 'n8n-nodes-base.webhook' ||
    nodeName === 'webhook' ||
    nodeName?.toLowerCase().includes('webhook');

  // Load production webhook URL if this is a webhook trigger
  useEffect(() => {
    async function loadProductionUrl() {
      if (!isWebhookTrigger || !user || !workflowId) return;

      try {
        const workflow = await getAutomation(workflowId);
        // Check if workflow has triggers array with webhook URL
        const workflowData = workflow as any;
        if (workflowData.triggers && workflowData.triggers.length > 0) {
          const webhookTrigger = workflowData.triggers.find((t: any) => t.url);
          if (webhookTrigger) {
            setProductionWebhookUrl(webhookTrigger.url);
          }
        }
      } catch (error) {
        console.error('Error loading production webhook URL:', error);
      }
    }

    loadProductionUrl();
  }, [isWebhookTrigger, user, workflowId]);

  // Load node configuration
  useEffect(() => {
    async function loadNodeConfig() {
      // Skip loading node config for webhook triggers (we show custom UI)
      if (isWebhookTrigger) {
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('Loading node config for:', nodeName);
      try {
        const response = await nodeRegistryApi.getNodeConfig(nodeName);
        console.log('Node config response:', response);
        console.log('Node config _pulseline:', response.data?._pulseline);
        console.log('Node config loadOptionsMethods:', response.data?._pulseline?.loadOptionsMethods);
        if (response.success) {
          setNodeConfig(response.data);

          // Merge defaults with current parameters
          const defaultParams: Record<string, any> = {};
          response.data.properties.forEach((prop) => {
            if (prop.default !== undefined && !(prop.name in currentParameters)) {
              defaultParams[prop.name] = prop.default;
            }
          });
          setParameters({ ...defaultParams, ...currentParameters });
        }
      } catch (error) {
        console.error('Error loading node config:', error);
      } finally {
        setLoading(false);
      }
    }

    loadNodeConfig();
  }, [nodeName, currentParameters, isWebhookTrigger]);

  // Fetch test events and set up Firestore listener for webhook triggers
  useEffect(() => {
    if (!isWebhookTrigger || !user || !workflowId || !currentTenantId) return;

    setLoadingEvents(true);

    // Reference to the triggerTests subcollection - use currentTenantId, not user.uid
    const triggerTestsRef = collection(
      db,
      'tenants',
      currentTenantId,  // Fixed: Use actual tenant ID from auth context
      'workflows',
      workflowId,
      'triggerTests'
    );

    // Query for test events (order by receivedAt descending, filter out 'main' client-side)
    const q = query(
      triggerTestsRef,
      orderBy('receivedAt', 'desc'),
      limit(20)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const events: TestEvent[] = [];
        snapshot.forEach((doc) => {
          // Exclude the 'main' metadata document
          if (doc.id === 'main') return;

          const data = doc.data();
          events.push({
            id: doc.id,
            payload: data.payload,
            receivedAt: data.receivedAt,
            testUrl: data.testUrl,
          });
        });
        setTestEvents(events);
        setLoadingEvents(false);
        console.log('Test events updated:', events.length);
      },
      (error) => {
        console.error('Error fetching test events:', error);
        setLoadingEvents(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up test events listener');
      unsubscribe();
    };
  }, [isWebhookTrigger, user, workflowId, currentTenantId]);

  // Build available fields dynamically from webhook + previous nodes
  useEffect(() => {
    if (!user || !workflowId || nodeType === 'trigger') return;

    async function buildAvailableFields() {
      if (!user) return; // TypeScript guard

      const fields: FieldDefinition[] = [];

      try {
        // 1. Find the trigger node to get its ID for webhook field references
        const triggerNode = allNodes.find(n => n.type === 'trigger');
        const triggerNodeId = triggerNode?.id;

        // 2. Load webhook trigger fields from Firestore
        const mainDocRef = doc(
          db,
          'tenants',
          currentTenantId || user.uid,  // Fixed: Use currentTenantId
          'workflows',
          workflowId,
          'triggerTests',
          'main'
        );

        const mainDoc = await getDoc(mainDocRef);
        if (mainDoc.exists()) {
          const data = mainDoc.data();
          if (data.availableFields) {
            // Add webhook fields with sourceNodeName (pure ID) for n8n references
            data.availableFields.forEach((field: FieldDefinition) => {
              fields.push({
                ...field,
                sourceNodeName: triggerNodeId, // Use pure node ID
              });
            });
            console.log('Webhook fields loaded:', data.availableFields.length);
          }
        }

        // 3. Find all nodes that come before current node in execution path
        const previousNodes = findPreviousNodes(nodeId, allNodes, allEdges);
        console.log('Previous nodes:', previousNodes.map(n => n.data.label));

        // 4. For each previous node, fetch its config and extract response fields
        for (const prevNode of previousNodes) {
          try {
            const config = await nodeRegistryApi.getNodeConfig(prevNode.data.nodeName as string);

            if (config.success && config.data._pulseline?.successResponse?.fields) {
              const responseFields = config.data._pulseline.successResponse.fields;
              console.log(`Adding ${responseFields.length} fields from ${prevNode.data.label}`);

              responseFields.forEach(field => {
                fields.push({
                  path: field.name,
                  displayName: field.name,
                  group: prevNode.data.label as string, // Use node label as group name for display
                  sourceNodeName: prevNode.id, // Use pure node ID for n8n references
                  type: field.type,
                  value: null,
                  isNested: false,
                });
              });
            }
          } catch (error) {
            console.error(`Error loading config for ${prevNode.data.nodeName}:`, error);
          }
        }

        setAvailableFields(fields);
        console.log('Total available fields:', fields.length);
      } catch (error) {
        console.error('Error building available fields:', error);
      }
    }

    buildAvailableFields();
  }, [user, workflowId, nodeType, nodeId, allNodes, allEdges]);

  const handleParameterChange = (name: string, value: any) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  const handleSetFieldMapping = async () => {
    if (!selectedEventId || !user) return;

    setSettingMapping(true);
    setMappingSuccess(false);

    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/api/workflows/${workflowId}/set-field-mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testId: selectedEventId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Field mapping set successfully:', result);
        setMappingSuccess(true);
        setTimeout(() => setMappingSuccess(false), 3000);
      } else {
        const error = await response.json();
        console.error('Failed to set field mapping:', error);
        alert('Failed to set field mapping: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error setting field mapping:', error);
      alert('Error setting field mapping');
    } finally {
      setSettingMapping(false);
    }
  };

  const handleClose = () => {
    // Force blur on any active input to capture pending changes before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }

    // Small delay to let blur handlers complete, then close
    setTimeout(() => {
      onClose();
    }, 50);
  };

  const handleSave = async () => {
    try {
      // Force blur on any active input to capture pending changes
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }

      // Small delay to let blur handlers complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // If this is a subscription trigger, update the subscription with new parameters
      const pulselineConfig = (nodeConfig as any)?._pulseline;
      if (nodeType === 'trigger' && pulselineConfig?.isTrigger && pulselineConfig?.triggerType) {
        try {
          console.log(`📝 Updating subscription for trigger: ${pulselineConfig.triggerType}`);

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

              // Update subscription with new parameters
              const updateResponse = await fetch(
                `${apiUrl}/api/workflows/trigger-subscriptions/${subscriptionId}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    nodeParameters: {
                      ...parameters,
                      nodeId: nodeId  // Keep ReactFlow node ID
                    }
                  })
                }
              );

              if (updateResponse.ok) {
                const updateResult = await updateResponse.json();
                console.log(`✅ Subscription updated: ${subscriptionId}`);
                console.log(`   New conditions:`, updateResult.data.conditions);
              } else {
                const error = await updateResponse.json();
                console.error('❌ Subscription update failed:', error);
                alert(`Failed to update subscription: ${error.error}`);
                return; // Don't save parameters if subscription update failed
              }
            }
          }
        } catch (error) {
          console.error('Error updating subscription:', error);
          alert('Failed to update subscription. Please try again.');
          return; // Don't save parameters if subscription update failed
        }
      }

      // TODO: Implement validation
      onSave(parameters);
      onClose();
    } catch (error) {
      console.error('Error saving node parameters:', error);
    }
  };

  const handleExecute = () => {
    // TODO: Implement node execution
    console.log('Execute node:', nodeId, parameters);
  };

  // Get color based on node type
  const getNodeTypeColor = () => {
    switch (nodeType) {
      case 'trigger':
        return 'bg-orange-500';
      case 'condition':
        return 'bg-purple-500';
      case 'action':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-2/3 bg-white text-gray-900 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${getNodeTypeColor()}`} />
            <h2 className="text-lg font-semibold">
              {loading
                ? 'Loading...'
                : isWebhookTrigger
                ? 'Inbound Webhook'
                : nodeConfig?.displayName || nodeName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Execute step
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'parameters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Parameters
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
          <div className="flex-1" />
          {nodeConfig?.webhooks && (
            <a
              href="#"
              className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Docs ↗
            </a>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane - Input Preview */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Input
            </h3>
            <div className="text-sm text-gray-600">
              {nodeType === 'trigger' ? (
                <p>Triggers start the workflow</p>
              ) : (
                <>
                  <p className="mb-4">No input data yet</p>
                  <button className="w-full px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-xs transition-colors">
                    Execute previous nodes
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    (From the earliest node that needs it ⓘ)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Center - Parameters/Settings */}
          <div className="flex-1 overflow-y-auto bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="mx-auto w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-600">Loading configuration...</p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {activeTab === 'parameters' && (
                  <>
                    {/* Show custom UI for webhook triggers */}
                    {isWebhookTrigger ? (
                      <WebhookTriggerConfig
                        workflowId={workflowId}
                        productionUrl={productionWebhookUrl}
                        onSave={onSave}
                      />
                    ) : (
                      <>
                        {/* Standard parameter rendering for other nodes */}
                        {nodeConfig && (
                          <>
                            {nodeConfig.description && (
                              <p className="text-sm text-gray-600 mb-6">
                                {nodeConfig.description}
                              </p>
                            )}

                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h4 className="text-sm font-medium text-red-700 mb-2">
                                  Validation Errors
                                </h4>
                                <ul className="text-sm text-red-600 space-y-1">
                                  {validationErrors.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Render Parameters */}
                            <div className="space-y-6">
                              {nodeConfig.properties.length === 0 ? (
                                <p className="text-sm text-gray-600">
                                  No configuration needed for this node.
                                </p>
                              ) : (
                                nodeConfig.properties
                                  .filter((property) => property.type !== 'hidden') // Skip hidden fields
                                  .map((property) => (
                                    <NodeParameterRenderer
                                      key={property.name}
                                      property={property}
                                      value={parameters[property.name]}
                                      allParameters={parameters}
                                      onChange={handleParameterChange}
                                      availableFields={availableFields}
                                      nodeConfig={nodeConfig}
                                    />
                                  ))
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {activeTab === 'settings' && (
                  <div className="text-sm text-gray-600">
                    <p>Settings tab content...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Pane - Output Preview / Test Events */}
          <div className="w-64 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              {isWebhookTrigger ? 'Test Events' : 'Output'}
            </h3>

            {isWebhookTrigger ? (
              <>
                {loadingEvents ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">Loading events...</p>
                  </div>
                ) : testEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-2">
                    <Clock className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-600 text-center">
                      No test events yet. Send a webhook to your test URL.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {testEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedEventId === event.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-700 truncate">
                            {event.id.slice(0, 8)}
                          </span>
                          {selectedEventId === event.id && (
                            <Check className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.receivedAt?.toDate?.() ? (
                            new Date(event.receivedAt.toDate()).toLocaleTimeString()
                          ) : (
                            'Just now'
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Event Details */}
                {selectedEventId && (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Payload</h4>
                      <div className="max-h-64 overflow-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                          {JSON.stringify(
                            testEvents.find((e) => e.id === selectedEventId)?.payload,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>

                    {/* Use for Mapping Button */}
                    <button
                      onClick={handleSetFieldMapping}
                      disabled={settingMapping}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        mappingSuccess
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {settingMapping ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Setting...
                        </span>
                      ) : mappingSuccess ? (
                        <span className="flex items-center justify-center gap-2">
                          <Check className="h-3 w-3" />
                          Mapping Set!
                        </span>
                      ) : (
                        'Use for Field Mapping'
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-500 space-y-2">
                <p>Output will appear here after execution</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Save Button */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
