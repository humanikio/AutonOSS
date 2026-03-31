# Pattern: Trigger Integration

> Complete trigger system integration from node config to workflow execution

---

## Overview

This pattern describes how trigger nodes integrate with the subscription system to automatically execute workflows when external events occur.

**Complete Flow:**
1. Trigger node config links to event type
2. Workflow deployed with trigger node
3. Subscription auto-created
4. External event occurs
5. Subscription matches event
6. Workflow executes via webhook

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              TRIGGER NODE CONFIGURATION                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
          _pulseline.triggerType = 'sms.received.v1'
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           TRIGGER DESTINATION REGISTRY                      │
│  Validates trigger type exists                              │
│  Provides payload schema                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              WORKFLOW DEPLOYMENT                            │
│  1. User saves workflow with trigger node                   │
│  2. Backend detects _pulseline.isTrigger = true             │
│  3. Extracts triggerType from node config                   │
│  4. Auto-creates trigger subscription                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           TRIGGER SUBSCRIPTION (FIRESTORE)                  │
│  workflowId: 'wf_123'                                       │
│  triggerType: 'sms.received.v1'                             │
│  enabled: true                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
                   WAITING FOR EVENT...
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                EXTERNAL EVENT OCCURS                        │
│  SMS received, call completed, calendar milestone, etc.     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 EVENT HANDLER                               │
│  executeTrigger({                                           │
│    tenantId: 'ten_123',                                     │
│    triggerType: 'sms.received.v1',                          │
│    payload: { from, body, ... }                             │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            TRIGGER EXECUTION ENGINE                         │
│  1. Validate payload                                        │
│  2. Query subscriptions (triggerType + enabled)             │
│  3. Evaluate conditions                                     │
│  4. Get workflow webhook URL                                │
│  5. POST payload to webhook                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 N8N WORKFLOW EXECUTES                       │
│  Trigger node receives payload                              │
│  Downstream nodes execute                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component 1: Trigger Node Configuration

### Node Config with Trigger Metadata

**File:** `nodeRegistry/nodes/trigger/smsReceivedTrigger.config.ts`

```typescript
import { INodeTypeDescription } from 'n8n-workflow';

export const smsReceivedTriggerNode: INodeTypeDescription = {
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  group: ['trigger'],
  version: 1,
  description: 'Triggers workflow when SMS is received',

  defaults: {
    name: 'SMS Received',
    color: '#1E88E5'
  },

  inputs: [],   // Trigger nodes have no inputs
  outputs: ['main'],

  _pulseline: {
    isTrigger: true,                      // ← Marks as trigger node
    triggerType: 'sms.received.v1',       // ← Links to event registry
    transformationMethod: 'trigger_webhook'
  },

  properties: [
    {
      displayName: 'Info',
      name: 'info',
      type: 'notice',
      default: '',
      typeOptions: {
        theme: 'info'
      },
      description: 'This trigger activates when an SMS message is received.'
    }
  ]
};
```

**Key Fields:**
- `_pulseline.isTrigger: true` - Identifies this as a trigger node
- `_pulseline.triggerType` - Links to event in TriggerDestinationRegistry
- `_pulseline.transformationMethod` - How to transform to n8n (usually 'trigger_webhook')

---

## Component 2: Event Registry

### Event Definition

**File:** `triggerSubscriptions/services/TriggerDestinationRegistry/records/sms.received.v1.ts`

```typescript
import { TriggerEventDefinition } from '../../../types';

export const smsReceivedV1: TriggerEventDefinition = {
  type: 'sms.received.v1',
  version: 1,
  displayName: 'SMS Received',
  description: 'Triggered when inbound SMS received and contact resolved',
  category: 'communication',

  payloadSchema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string' },
      contactId: { type: 'string' },
      messageId: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      body: { type: 'string' },
      mediaCount: { type: 'number' },
      mediaUrls: {
        type: 'array',
        items: { type: 'string' }
      },
      timestamp: { type: 'string' }
    },
    required: ['tenantId', 'contactId', 'messageId', 'from', 'to', 'body', 'timestamp']
  },

  examplePayload: {
    tenantId: 'ten_123',
    contactId: 'con_456',
    messageId: 'msg_789',
    from: '+15551234567',
    to: '+15559999999',
    body: 'Hello, I need help',
    mediaCount: 0,
    mediaUrls: [],
    timestamp: '2025-01-19T10:00:00Z'
  },

  filterableFields: [
    { field: 'from', type: 'string', description: 'Filter by sender' },
    { field: 'mediaCount', type: 'number', description: 'Filter by media count' }
  ],

  isStable: true,

  metadata: {
    usesResumeUrl: false  // Standard webhook pattern
  }
};
```

### Registry Index

**File:** `triggerSubscriptions/services/TriggerDestinationRegistry/index.ts`

```typescript
import { smsReceivedV1 } from './records/sms.received.v1';
import { phoneCallCompletedV1 } from './records/phone.call.completed.v1';
import { eventLifecycleMilestoneV1 } from './records/event.lifecycle.milestone.v1';

const eventRegistry: Record<string, TriggerEventDefinition> = {
  'sms.received.v1': smsReceivedV1,
  'phone.call.completed.v1': phoneCallCompletedV1,
  'event.lifecycle.milestone.v1': eventLifecycleMilestoneV1,
};

export class TriggerDestinationRegistry {
  static getEventDefinition(eventType: string): TriggerEventDefinition | null {
    return eventRegistry[eventType] || null;
  }

  static validateEventType(eventType: string): { valid: boolean; error?: string } {
    const event = this.getEventDefinition(eventType);
    if (!event) {
      return { valid: false, error: `Unknown event type: ${eventType}` };
    }
    if (event.deprecatedAt) {
      return { valid: false, error: `Event type deprecated: ${eventType}` };
    }
    return { valid: true };
  }

  static validatePayload(eventType: string, payload: any): { valid: boolean; errors: string[] } {
    const event = this.getEventDefinition(eventType);
    if (!event) {
      return { valid: false, errors: ['Unknown event type'] };
    }

    // Validate against payloadSchema
    const errors: string[] = [];
    const required = event.payloadSchema.required || [];

    for (const field of required) {
      if (!(field in payload)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## Component 3: Auto-Subscription Creation

### Trigger Detection on Workflow Save

**File:** `workflowCrudManager/updateWorkflow.ts`

```typescript
export async function updateWorkflow(tenantId, workflowId, data, userId) {
  // ... save workflow to Firestore ...
  // ... transform and deploy to n8n ...

  // ========== AUTO-CREATE TRIGGER SUBSCRIPTION ==========

  // 1. Detect if workflow has trigger node
  const hasTrigger = data.nodes.some(node => {
    const config = NodeRegistry.getNodeConfig(node.type);
    return config?._pulseline?.isTrigger === true;
  });

  if (!hasTrigger) {
    console.log('No trigger node detected - skipping subscription');
    return updatedWorkflow;
  }

  // 2. Find trigger node
  const triggerNode = data.nodes.find(node => {
    const config = NodeRegistry.getNodeConfig(node.type);
    return config?._pulseline?.isTrigger === true;
  });

  // 3. Extract triggerType from node config
  const nodeConfig = NodeRegistry.getNodeConfig(triggerNode.type);
  const triggerType = nodeConfig._pulseline.triggerType;

  console.log(`🔔 Trigger node detected: ${triggerNode.type}`);
  console.log(`🔔 Trigger type: ${triggerType}`);

  // 4. Validate trigger type exists in registry
  const validation = TriggerDestinationRegistry.validateEventType(triggerType);
  if (!validation.valid) {
    console.error(`⚠️  Invalid trigger type: ${validation.error}`);
    throw new Error(`Invalid trigger type: ${validation.error}`);
  }

  // 5. Check if subscription already exists
  const existingSubscriptions = await getSubscriptions(tenantId, {
    workflowId: workflowId
  });

  if (existingSubscriptions.subscriptions.length > 0) {
    console.log(`✅ Subscription already exists: ${existingSubscriptions.subscriptions[0].id}`);

    // Update existing subscription if trigger type changed
    const existingSub = existingSubscriptions.subscriptions[0];
    if (existingSub.triggerType !== triggerType) {
      console.log(`🔄 Updating subscription trigger type: ${existingSub.triggerType} → ${triggerType}`);

      await updateSubscription(tenantId, existingSub.id, {
        triggerType: triggerType
      });
    }

    return updatedWorkflow;
  }

  // 6. Create new subscription
  console.log(`➕ Creating trigger subscription...`);

  await createSubscription(tenantId, {
    workflowId: workflowId,
    triggerType: triggerType,
    enabled: true
  });

  console.log(`✅ Subscription created successfully`);

  return updatedWorkflow;
}
```

---

## Component 4: Trigger Subscription Storage

### Firestore Structure

```
/tenants/ten_123/
  workflows/
    main/
      triggerSubscriptions/
        sub_xyz/
          id: 'sub_xyz'
          workflowId: 'wf_123'
          triggerType: 'sms.received.v1'
          enabled: true
          conditions: {
            payload: {
              "mediaCount": { "$gt": 0 }  // Optional filtering
            }
          }
          priority: 100
          version: 1
          createdAt: Timestamp
          updatedAt: Timestamp
```

### Subscription Creation

**File:** `triggerSubscriptions/services/triggerSubscriptionManager/createSubscription.ts`

```typescript
export async function createSubscription(
  tenantId: string,
  input: CreateSubscriptionInput
): Promise<TriggerSubscription> {
  console.log(`\n📝 Creating trigger subscription...`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Workflow: ${input.workflowId}`);
  console.log(`   Trigger Type: ${input.triggerType}`);

  // 1. Validate trigger type
  const validation = TriggerDestinationRegistry.validateEventType(input.triggerType);
  if (!validation.valid) {
    throw new Error(`Invalid trigger type: ${validation.error}`);
  }

  // 2. Validate workflow exists
  const workflow = await readWorkflow(tenantId, input.workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${input.workflowId}`);
  }

  // 3. Check for existing subscription (1:1 constraint)
  const existingQuery = await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions')
    .where('workflowId', '==', input.workflowId)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    throw new Error('Workflow already has a trigger subscription');
  }

  // 4. Create subscription
  const subscription: TriggerSubscription = {
    id: ulid(),
    tenantId,
    workflowId: input.workflowId,
    triggerType: input.triggerType,
    enabled: input.enabled !== undefined ? input.enabled : true,
    conditions: input.conditions,
    priority: input.priority || 100,
    version: 1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  // 5. Save to Firestore
  await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions').doc(subscription.id)
    .set(subscription);

  console.log(`✅ Subscription created: ${subscription.id}`);

  return subscription;
}
```

---

## Component 5: Event Handler Integration

### SMS Event Handler

**File:** `inboundEvents/sms/services/newRequestHandler.ts`

```typescript
export async function handleInboundSMS(twilioPayload: any) {
  console.log('📨 Received inbound SMS');

  // 1. Parse Twilio payload
  const processedData = {
    tenantId: await resolveTenantFromPhoneNumber(twilioPayload.To),
    messageId: twilioPayload.MessageSid,
    from: twilioPayload.From,
    to: twilioPayload.To,
    body: twilioPayload.Body,
    mediaUrls: parseMediaUrls(twilioPayload),
    timestamp: new Date().toISOString()
  };

  // 2. Resolve contact
  const contact = await resolveOrCreateContact({
    tenantId: processedData.tenantId,
    phoneNumber: processedData.from
  });

  // 3. Save message
  await saveMessage({
    tenantId: processedData.tenantId,
    contactId: contact.contactId,
    messageId: processedData.messageId,
    from: processedData.from,
    to: processedData.to,
    body: processedData.body,
    mediaUrls: processedData.mediaUrls,
    timestamp: processedData.timestamp
  });

  // 4. Build trigger payload (matches event schema)
  const payload = {
    tenantId: processedData.tenantId,
    contactId: contact.contactId,
    messageId: processedData.messageId,
    from: processedData.from,
    to: processedData.to,
    body: processedData.body,
    mediaCount: processedData.mediaUrls.length,
    mediaUrls: processedData.mediaUrls,
    timestamp: processedData.timestamp
  };

  // 5. Execute trigger
  console.log('🔔 Executing trigger: sms.received.v1');

  await executeTrigger({
    tenantId: processedData.tenantId,
    triggerType: 'sms.received.v1',
    payload: payload
  });

  return { success: true };
}
```

---

## Component 6: Trigger Execution Engine

### Main Execution Function

**File:** `triggerSubscriptions/services/triggerExecutions.ts`

```typescript
export async function executeTrigger(
  input: TriggerExecutionInput
): Promise<TriggerExecutionResult> {
  const { tenantId, triggerType, payload } = input;

  console.log(`\n🎯 ========== TRIGGER EXECUTION ==========`);
  console.log(`   Type: ${triggerType}`);
  console.log(`   Tenant: ${tenantId}`);

  // ========== STEP 1: VALIDATE EVENT TYPE ==========
  const eventDef = TriggerDestinationRegistry.getEventDefinition(triggerType);
  if (!eventDef) {
    throw new Error(`Unknown event type: ${triggerType}`);
  }

  console.log(`✅ Event type validated: ${eventDef.displayName}`);

  // ========== STEP 2: VALIDATE PAYLOAD ==========
  const payloadValidation = TriggerDestinationRegistry.validatePayload(
    triggerType,
    payload
  );

  if (!payloadValidation.valid) {
    throw new Error(`Invalid payload: ${payloadValidation.errors.join(', ')}`);
  }

  console.log(`✅ Payload validated`);

  // ========== STEP 3: QUERY ACTIVE SUBSCRIPTIONS ==========
  console.log(`\n📋 Querying subscriptions...`);

  const subscriptionsResult = await getSubscriptions(tenantId, {
    triggerType: triggerType,
    enabled: true
  }, {
    payload: payload,  // For condition evaluation
    verbose: true      // Log condition matching
  });

  const subscriptions = subscriptionsResult.subscriptions;

  console.log(`📋 Found ${subscriptions.length} active subscriptions`);

  if (subscriptions.length === 0) {
    return {
      success: true,
      message: 'No active subscriptions found',
      subscriptionsFound: 0,
      executionResults: [],
      summary: { total: 0, completed: 0, failed: 0 }
    };
  }

  // ========== STEP 4: CHECK EXECUTION PATTERN ==========
  const usesResumeUrl = eventDef.metadata?.usesResumeUrl || false;

  if (usesResumeUrl) {
    console.log(`🔄 Using resumeUrl pattern (wait nodes)`);
  } else {
    console.log(`📤 Using webhook pattern (standard)`);
  }

  // ========== STEP 5: EXECUTE EACH SUBSCRIPTION ==========
  const executionResults: SubscriptionExecutionResult[] = [];

  for (const subscription of subscriptions) {
    console.log(`\n🔄 Processing subscription: ${subscription.id}`);
    console.log(`   Workflow: ${subscription.workflowId}`);

    try {
      if (usesResumeUrl) {
        // ===== WAIT NODE PATTERN =====
        const resumeResult = await executeWaitNodePattern({
          tenantId,
          subscription,
          payload,
          eventDef
        });

        executionResults.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          success: resumeResult.success,
          error: resumeResult.error
        });

      } else {
        // ===== STANDARD WEBHOOK PATTERN =====
        const webhookResult = await executeWebhookPattern({
          tenantId,
          subscription,
          payload
        });

        executionResults.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          success: webhookResult.success,
          error: webhookResult.error
        });
      }

    } catch (error: any) {
      console.error(`❌ Execution failed: ${error.message}`);

      executionResults.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflowId,
        success: false,
        error: error.message
      });
    }
  }

  // ========== STEP 6: RETURN RESULTS ==========
  const completed = executionResults.filter(r => r.success).length;
  const failed = executionResults.filter(r => !r.success).length;

  console.log(`\n✅ ========== TRIGGER EXECUTION COMPLETE ==========`);
  console.log(`   Subscriptions: ${subscriptions.length}`);
  console.log(`   Completed: ${completed}`);
  console.log(`   Failed: ${failed}`);

  return {
    success: true,
    message: 'Trigger executed successfully',
    subscriptionsFound: subscriptions.length,
    executionResults,
    summary: {
      total: subscriptions.length,
      completed,
      failed
    }
  };
}
```

---

### Standard Webhook Pattern

```typescript
async function executeWebhookPattern(input: {
  tenantId: string;
  subscription: TriggerSubscription;
  payload: any;
}): Promise<{ success: boolean; error?: string }> {
  const { tenantId, subscription, payload } = input;

  // 1. Read workflow
  const workflow = await readWorkflow(tenantId, subscription.workflowId);

  if (!workflow) {
    throw new Error(`Workflow not found: ${subscription.workflowId}`);
  }

  // 2. Get webhook URL from n8n config
  const n8nConfig = await firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc(subscription.workflowId)
    .collection('n8n').doc('config')
    .get();

  if (!n8nConfig.exists) {
    throw new Error('Workflow not deployed to n8n');
  }

  const triggers = n8nConfig.data()?.triggers || [];
  if (triggers.length === 0) {
    throw new Error('No webhook URL found');
  }

  const webhookUrl = triggers[0].url;

  console.log(`🔗 Webhook URL: ${webhookUrl}`);

  // 3. POST to webhook
  console.log(`📤 Posting payload to webhook...`);

  await sendPayload({
    webhookUrl: webhookUrl,
    payload: payload
  });

  console.log(`✅ Payload sent successfully`);

  return { success: true };
}
```

---

### Wait Node Pattern (ResumeUrl)

```typescript
async function executeWaitNodePattern(input: {
  tenantId: string;
  subscription: TriggerSubscription;
  payload: any;
  eventDef: TriggerEventDefinition;
}): Promise<{ success: boolean; error?: string }> {
  const { tenantId, subscription, payload, eventDef } = input;

  // 1. Extract milestone and eventId from payload
  const milestone = payload.milestone;
  const eventId = payload.eventId;

  if (!milestone || !eventId) {
    throw new Error('Wait node pattern requires milestone and eventId in payload');
  }

  console.log(`🔄 Wait node pattern - milestone: ${milestone}, eventId: ${eventId}`);

  // 2. Query waiting executions
  const resumeResult = await getLatestResumeUrl({
    tenantId,
    workflowId: subscription.workflowId,
    milestone,
    eventId
  });

  if (!resumeResult.resumeUrl) {
    console.log(`⚠️  No waiting execution found for this milestone/event`);
    return { success: false, error: 'No waiting execution found' };
  }

  console.log(`🔗 Resume URL: ${resumeResult.resumeUrl}`);

  // 3. POST to resumeUrl
  console.log(`📤 Posting payload to resumeUrl...`);

  await sendPayload({
    webhookUrl: resumeResult.resumeUrl,
    payload: payload
  });

  console.log(`✅ Payload sent to resumeUrl`);

  // 4. Mark execution as resumed
  await markExecutionResumed(
    tenantId,
    subscription.workflowId,
    resumeResult.executionId
  );

  console.log(`✅ Execution marked as resumed`);

  return { success: true };
}
```

---

## Integration Checklist

### Adding a New Trigger Event

- [ ] **Step 1:** Create event definition in TriggerDestinationRegistry
  ```typescript
  // File: TriggerDestinationRegistry/records/email.received.v1.ts
  export const emailReceivedV1: TriggerEventDefinition = {
    type: 'email.received.v1',
    payloadSchema: {...},
    filterableFields: [...]
  };
  ```

- [ ] **Step 2:** Register event in registry index
  ```typescript
  // File: TriggerDestinationRegistry/index.ts
  import { emailReceivedV1 } from './records/email.received.v1';
  const eventRegistry = {
    'email.received.v1': emailReceivedV1,
  };
  ```

- [ ] **Step 3:** Create trigger node config
  ```typescript
  // File: nodeRegistry/nodes/trigger/emailReceivedTrigger.config.ts
  export const emailReceivedTriggerNode = {
    _pulseline: {
      isTrigger: true,
      triggerType: 'email.received.v1'
    }
  };
  ```

- [ ] **Step 4:** Integrate in event handler
  ```typescript
  // File: inboundEvents/email/services/emailHandler.ts
  await executeTrigger({
    tenantId,
    triggerType: 'email.received.v1',
    payload: {...}
  });
  ```

- [ ] **Step 5:** Test complete flow
  - Create workflow with trigger node
  - Deploy workflow (auto-creates subscription)
  - Send test event
  - Verify workflow executes

---

## Related Docs

- **[README.md](../README.md)** - System integration overview
- **[END-TO-END-FLOW.md](../END-TO-END-FLOW.md)** - Complete user journey
- **[frontend-backend.md](./frontend-backend.md)** - Frontend integration
- **[Trigger Subscriptions](../../triggerSubscriptions/README.md)** - Trigger system details
