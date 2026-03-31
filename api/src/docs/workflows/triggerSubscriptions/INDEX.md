# Trigger Subscription System - INDEX

> **Navigation hub** for trigger subscription documentation

---

## 📚 Documentation Structure

### Core Documentation
- **[README.md](./README.md)** - Complete system overview, architecture, data flow
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - **Add new event type checklist**, operator reference, integration guide

### Patterns
- **[patterns/event-registration.md](./patterns/event-registration.md)** - Register new event types in TriggerDestinationRegistry
- **[patterns/subscription-lifecycle.md](./patterns/subscription-lifecycle.md)** - Auto-creation, execution, resume flow
- **[patterns/conditional-filtering.md](./patterns/conditional-filtering.md)** - All filter operators with examples

### Helpers & Examples
- **[helpers/testing-triggers.md](./helpers/testing-triggers.md)** - Manual + automated testing guide
- **[examples/complete-trigger-example.md](./examples/complete-trigger-example.md)** - End-to-end SMS trigger workflow

---

## 🎯 Quick Start

### I want to add a new event type
→ **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - See "Add New Event Type Checklist"
→ **[patterns/event-registration.md](./patterns/event-registration.md)** - Complete registration guide

### I need to understand subscription lifecycle
→ **[patterns/subscription-lifecycle.md](./patterns/subscription-lifecycle.md)** - Create → Execute → Resume

### I want to add conditional filtering
→ **[patterns/conditional-filtering.md](./patterns/conditional-filtering.md)** - All operators ($eq, $gt, $in, etc.)

### I need to test triggers
→ **[helpers/testing-triggers.md](./helpers/testing-triggers.md)** - Testing workflows

### I want a complete example
→ **[examples/complete-trigger-example.md](./examples/complete-trigger-example.md)** - SMS trigger walkthrough

---

## 🔍 Find by Use Case

| Use Case | Document | Section |
|----------|----------|---------|
| Add new SMS event | [event-registration.md](./patterns/event-registration.md) | Event Definition Template |
| Add calendar event trigger | [event-registration.md](./patterns/event-registration.md) | Complete Example |
| Filter by payload field | [conditional-filtering.md](./patterns/conditional-filtering.md) | Operator Reference |
| Auto-create subscriptions | [subscription-lifecycle.md](./patterns/subscription-lifecycle.md) | Auto-Creation Pattern |
| Test trigger execution | [testing-triggers.md](./helpers/testing-triggers.md) | Manual Testing |
| Understand webhook vs resumeUrl | [subscription-lifecycle.md](./patterns/subscription-lifecycle.md) | Execution Patterns |
| Debug subscription matching | [conditional-filtering.md](./patterns/conditional-filtering.md) | Debugging |

---

## 📖 Reading Order

### New to the system?

1. **[README.md](./README.md)** - Understand complete architecture
   - What are trigger subscriptions
   - Event registry concept
   - Execution flow (webhook vs resumeUrl)
   - Auto-creation from trigger nodes

2. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - See quick patterns
   - Add new event type (step-by-step)
   - All condition operators
   - Integration points
   - Common patterns

3. **[patterns/event-registration.md](./patterns/event-registration.md)** - Deep dive on events
   - Event definition structure
   - payloadSchema format
   - filterableFields
   - Metadata options

4. **[patterns/subscription-lifecycle.md](./patterns/subscription-lifecycle.md)** - Understand lifecycle
   - Auto-creation from trigger nodes
   - Manual CRUD operations
   - Execution engine flow
   - ResumeUrl pattern (wait nodes)

5. **[patterns/conditional-filtering.md](./patterns/conditional-filtering.md)** - Master filtering
   - All operators with examples
   - Nested field access
   - Debugging conditions

6. **[helpers/testing-triggers.md](./helpers/testing-triggers.md)** - Learn testing
   - Manual API testing
   - Integration testing
   - End-to-end workflow testing

7. **[examples/complete-trigger-example.md](./examples/complete-trigger-example.md)** - See complete flow
   - SMS received event
   - Subscription creation
   - Condition evaluation
   - Workflow execution

### Adding a new event type?

1. Start with **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - "Add New Event Type Checklist"
2. Follow **[patterns/event-registration.md](./patterns/event-registration.md)** - Complete guide
3. Test with **[helpers/testing-triggers.md](./helpers/testing-triggers.md)**

---

## 🚨 Find by Error Message

| Error Message | Likely Issue | Document |
|---------------|--------------|----------|
| "Unknown event type" | Event not registered | [event-registration.md](./patterns/event-registration.md) |
| "Event type is deprecated" | Using old event type | [event-registration.md](./patterns/event-registration.md) |
| "Workflow already has subscription" | 1:1 constraint violated | [subscription-lifecycle.md](./patterns/subscription-lifecycle.md) |
| "No active subscriptions found" | No subscriptions or disabled | [subscription-lifecycle.md](./patterns/subscription-lifecycle.md) |
| "Missing required field" | Payload validation failed | [event-registration.md](./patterns/event-registration.md) |
| "Condition failed" | Filter didn't match | [conditional-filtering.md](./patterns/conditional-filtering.md) |
| "No webhook URL found" | Workflow not deployed | [subscription-lifecycle.md](./patterns/subscription-lifecycle.md) |
| "No waiting execution found" | Wait node not reached yet | [subscription-lifecycle.md](./patterns/subscription-lifecycle.md) |

---

## 🏗️ System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                 TRIGGER SUBSCRIPTION SYSTEM                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 TRIGGER DESTINATION REGISTRY                           │
│  ──────────────────────────────────                        │
│  • Event type definitions                                  │
│  • Payload schemas                                         │
│  • Filterable fields                                       │
│  • Metadata (webhook vs resumeUrl)                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 SUBSCRIPTION MANAGER                                   │
│  ─────────────────────────                                 │
│  • CRUD operations                                         │
│  • 1:1 workflow constraint                                 │
│  • Condition configuration                                 │
│  • Auto-creation from trigger nodes                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ TRIGGER EXECUTION ENGINE                               │
│  ──────────────────────────────                            │
│  • Query active subscriptions                              │
│  • Evaluate conditions                                     │
│  • Webhook pattern (standard)                              │
│  • ResumeUrl pattern (wait nodes)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

EVENT SOURCES:
  • SMS Handler → executeTrigger('sms.received.v1')
  • Phone Handler → executeTrigger('phone.call.completed.v1')
  • Calendar Manager → executeTrigger('event.lifecycle.milestone.v1')
```

---

## 🔑 Key Concepts

### 1. Event Type Registry

**Central registry** of all available event types with schemas and validation.

**File:** `services/TriggerDesitinationRegistry/index.ts`

**Registered Events:**
- `sms.received.v1` - Inbound SMS after contact resolution
- `phone.call.completed.v1` - Call completed after transcript
- `event.lifecycle.milestone.v1` - Calendar event milestones
- `event.lifecycle.milestone.wait.v1` - Wait node pattern

### 2. Trigger Subscription

**1:1 relationship** - Each workflow has exactly one subscription.

**Structure:**
```typescript
{
  id: string,              // ULID
  tenantId: string,
  workflowId: string,      // 1:1 - one per workflow
  triggerType: string,     // e.g., "sms.received.v1"
  enabled: boolean,        // Active/inactive
  conditions: {            // Optional filtering
    payload: {
      "field": { "$eq": "value" }
    }
  },
  priority: number,        // Execution order
  version: number          // Optimistic locking
}
```

### 3. Execution Patterns

**Two patterns based on event metadata:**

**A. Webhook Pattern (Standard)**
```
Event → Query Subscriptions → Read Workflow → POST to webhookUrl
```

**B. ResumeUrl Pattern (Wait Nodes)**
```
Event → Query Subscriptions → Fetch waitExecution → POST to resumeUrl → Mark Resumed
```

### 4. Conditional Filtering

**MongoDB-style operators:**

```typescript
{
  "mediaCount": { "$gt": 0 },           // Has media
  "from": { "$eq": "+15551234567" },    // Specific sender
  "milestone": { "$in": ["1_hour_before", "15_min_before"] }
}
```

**Operators:** `$eq`, `$ne`, `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$contains`, `$exists`

---

## 📦 File Locations

### Backend Core
- **Event Registry:** `workflows/triggerSubscriptions/services/TriggerDesitinationRegistry/`
  - `index.ts` - Registry service
  - `records/sms.received.v1.ts` - SMS event definition
  - `records/phone.call.completed.v1.ts` - Phone event definition
  - `records/event.lifecycle.milestone.v1.ts` - Calendar event definition
  - `records/event.lifecycle.milestone.wait.v1.ts` - Wait node event definition

- **Subscription Manager:** `workflows/triggerSubscriptions/services/triggerSubscriptionManager/`
  - `createSubscription.ts` - Create with validation
  - `getSubscriptions.ts` - Query with filtering
  - `updateSubscription.ts` - Update mutable fields
  - `deleteSubscription.ts` - Delete subscription
  - `readSubscription.ts` - Get single subscription

- **Execution Engine:** `workflows/triggerSubscriptions/services/`
  - `triggerExecutions.ts` - Main execution orchestrator
  - `triggerExecutions/utils/evaluateConditions.ts` - Condition filtering
  - `triggerExecutions/structurePayload.ts` - Payload validation
  - `triggerExecutions/sendPayload.ts` - HTTP POST to webhook/resumeUrl

### Integration Points
- **SMS Handler:** `inboundEvents/sms/services/newRequestHandler.ts:215`
- **Phone Handler:** `agentCommunication/phone/services/handlePostCall.ts` (similar location)
- **Calendar Handler:** `calendars/autonCalendar/services/eventLifecycleManager/notifySubscriptionService.ts`

### Types
- **Type Definitions:** `workflows/triggerSubscriptions/types.ts:1-129`
  - TriggerSubscription interface
  - TriggerEventDefinition interface
  - CreateSubscriptionInput, UpdateSubscriptionInput
  - SubscriptionFilters

---

## ✅ Documentation Coverage

- [x] Complete system overview (README)
- [x] Quick reference for devs (QUICK-REFERENCE)
- [x] Event registration pattern (event-registration)
- [x] Subscription lifecycle pattern (subscription-lifecycle)
- [x] Conditional filtering pattern (conditional-filtering)
- [x] Testing guide (testing-triggers)
- [x] Complete example (complete-trigger-example)

**Total:** 8 documents covering all extension points and patterns

---

## 🔗 Related Documentation

- **[Node Registry](../nodeRegistry/INDEX.md)** - Trigger node configuration
- **[Transformation System](../transformationSystem/INDEX.md)** - Trigger node transformation
- **[Field Mapping](../fieldMapping/INDEX.md)** - Webhook payload field mapping

---

**Quick Links:**
- **Add Event Type:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) → Add New Event Type Checklist
- **Test Triggers:** [helpers/testing-triggers.md](./helpers/testing-triggers.md)
- **Understand Flow:** [examples/complete-trigger-example.md](./examples/complete-trigger-example.md)
