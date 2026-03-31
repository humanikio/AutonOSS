# Pattern: Event Registration

> Register new event types in TriggerDestinationRegistry

---

## Complete Event Registration Example

**Event:** `email.received.v1`

### Step 1: Create Event Definition

**File:** `triggerSubscriptions/services/TriggerDesitinationRegistry/records/email.received.v1.ts`

```typescript
import { TriggerEventDefinition } from '../../../types';

export const emailReceivedV1: TriggerEventDefinition = {
  type: 'email.received.v1',
  version: 1,
  displayName: 'Email Received',
  description: 'Triggered when inbound email received and contact resolved',
  category: 'communication',

  payloadSchema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string' },
      contactId: { type: 'string' },
      emailId: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      hasAttachments: { type: 'boolean' },
      timestamp: { type: 'string' }
    },
    required: ['tenantId', 'contactId', 'emailId', 'from', 'subject']
  },

  examplePayload: {
    tenantId: 'ten_123',
    contactId: 'con_456',
    emailId: 'email_789',
    from: 'customer@example.com',
    to: 'support@yourcompany.com',
    subject: 'Product inquiry',
    body: 'I would like to know more about...',
    hasAttachments: false,
    timestamp: '2025-01-19T10:00:00Z'
  },

  filterableFields: [
    { field: 'from', type: 'string', description: 'Filter by sender email' },
    { field: 'subject', type: 'string', description: 'Filter by subject line' },
    { field: 'hasAttachments', type: 'boolean', description: 'Filter by attachment presence' }
  ],

  isStable: true
};
```

### Step 2: Register in Index

**File:** `TriggerDesitinationRegistry/index.ts`

```typescript
import { emailReceivedV1 } from './records/email.received.v1';

const eventRegistry: Record<string, TriggerEventDefinition> = {
  'sms.received.v1': smsReceivedV1,
  'phone.call.completed.v1': phoneCallCompletedV1,
  'email.received.v1': emailReceivedV1, // ← Add here
};
```

### Step 3: Integrate in Handler

**File:** `inboundEvents/email/services/emailHandler.ts`

```typescript
import { executeTrigger } from 'workflows/triggerSubscriptions/services/triggerExecutions';

// After email processed
await executeTrigger({
  tenantId: email.tenantId,
  triggerType: 'email.received.v1',
  payload: {
    tenantId: email.tenantId,
    contactId: contact.contactId,
    emailId: email.id,
    from: email.from,
    to: email.to,
    subject: email.subject,
    body: email.body,
    hasAttachments: email.attachments.length > 0,
    timestamp: email.receivedAt
  }
});
```

**Complete! Event is now registered and can be used.**

---

## Metadata Options

### Standard Webhook Pattern
```typescript
metadata: {
  usesResumeUrl: false  // Default - uses workflow webhook
}
```

### Wait Node Pattern
```typescript
metadata: {
  usesResumeUrl: true,      // Use resumeUrl instead of webhook
  requiresEventId: true,    // Payload must have eventId
  pausesWorkflow: true      // Workflow pauses until triggered
}
```

---

## Related Docs

- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Add event type checklist
- [subscription-lifecycle.md](./subscription-lifecycle.md) - How subscriptions use events
