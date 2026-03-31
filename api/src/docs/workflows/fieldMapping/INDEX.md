# Field Mapping & Reference System - INDEX

> **Navigation hub** for field mapping documentation

---

## 📚 Documentation Structure

### Core Documentation
- **[README.md](./README.md)** - Complete system overview, architecture, and concepts
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Code templates, decision trees, common patterns

### Patterns
- **[patterns/webhook-fields.md](./patterns/webhook-fields.md)** - Test payload extraction, field definition, storage
- **[patterns/node-output-fields.md](./patterns/node-output-fields.md)** - Previous node discovery, successResponse mapping, graph traversal

### Helpers & Examples
- **[helpers/expression-builder.md](./helpers/expression-builder.md)** - Expression format reference, field insertion logic
- **[examples/complete-mapping-example.md](./examples/complete-mapping-example.md)** - End-to-end field mapping workflow

---

## 🎯 Quick Start

### I want to understand the system
→ Start with **[README.md](./README.md)** for complete overview

### I need to add test payload extraction
→ See **[patterns/webhook-fields.md](./patterns/webhook-fields.md)**

### I need to reference previous node outputs
→ See **[patterns/node-output-fields.md](./patterns/node-output-fields.md)**

### I need expression format reference
→ See **[helpers/expression-builder.md](./helpers/expression-builder.md)**

### I want to see a complete example
→ See **[examples/complete-mapping-example.md](./examples/complete-mapping-example.md)**

---

## 🔍 Find by Use Case

| Use Case | Document | Section |
|----------|----------|---------|
| Extract fields from test webhook | [webhook-fields.md](./patterns/webhook-fields.md) | Field Extraction Process |
| Store field definitions | [webhook-fields.md](./patterns/webhook-fields.md) | Firestore Storage |
| Find previous nodes in workflow | [node-output-fields.md](./patterns/node-output-fields.md) | Graph Traversal |
| Add successResponse fields | [node-output-fields.md](./patterns/node-output-fields.md) | successResponse Pattern |
| Build n8n expressions | [expression-builder.md](./helpers/expression-builder.md) | Expression Formats |
| Insert field at cursor | [expression-builder.md](./helpers/expression-builder.md) | Field Insertion |
| Group fields by source | [README.md](./README.md) | Field Grouping |
| Display fields in dropdown | [expression-builder.md](./helpers/expression-builder.md) | FieldGroupDropdown |

---

## 📖 Reading Order

### New to the system?

1. **[README.md](./README.md)** - Understand the complete architecture
   - What is field mapping
   - Two field sources (webhook + node outputs)
   - Data flow from test → UI → expression

2. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - See code templates
   - Field definition structure
   - Expression formats
   - Common patterns

3. **[patterns/webhook-fields.md](./patterns/webhook-fields.md)** - Deep dive on webhook fields
   - Test payload capture
   - Field extraction algorithm
   - Firestore storage structure

4. **[patterns/node-output-fields.md](./patterns/node-output-fields.md)** - Deep dive on node outputs
   - Graph traversal logic
   - successResponse configuration
   - Dynamic field discovery

5. **[helpers/expression-builder.md](./helpers/expression-builder.md)** - Expression reference
   - Format differences (webhook vs node)
   - Field insertion logic
   - UI component integration

6. **[examples/complete-mapping-example.md](./examples/complete-mapping-example.md)** - See it in action
   - Complete workflow example
   - Multiple field sources
   - Real UI flow

### Extending the system?

1. Start with **[README.md](./README.md)** - Architecture section
2. Review **[webhook-fields.md](./patterns/webhook-fields.md)** - Add new field sources
3. Review **[node-output-fields.md](./patterns/node-output-fields.md)** - Add new traversal patterns
4. Check **[expression-builder.md](./helpers/expression-builder.md)** - Add new expression formats

---

## 🚨 Find by Error Message

| Error Message | Likely Issue | Document |
|---------------|--------------|----------|
| "No fields available" | Test payload not captured | [webhook-fields.md](./patterns/webhook-fields.md) |
| "availableFields undefined" | Firestore mapping not set | [webhook-fields.md](./patterns/webhook-fields.md) |
| "Cannot read property 'json'" | Invalid expression format | [expression-builder.md](./helpers/expression-builder.md) |
| "sourceNodeName is undefined" | Field missing node reference | [node-output-fields.md](./patterns/node-output-fields.md) |
| "successResponse not defined" | Node config missing response | [node-output-fields.md](./patterns/node-output-fields.md) |
| "Previous nodes empty" | Graph traversal issue | [node-output-fields.md](./patterns/node-output-fields.md) |

---

## 🏗️ System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                    FIELD MAPPING SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 WEBHOOK FIELDS          🔍 NODE OUTPUT FIELDS          │
│  ──────────────────         ─────────────────────          │
│  1. Test Webhook            1. Graph Traversal             │
│  2. Extract Fields          2. Find Previous Nodes         │
│  3. Store in Firestore      3. Load successResponse        │
│  4. Load in Frontend        4. Dynamic Discovery           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    🎨 FRONTEND DISPLAY                      │
│  ────────────────────────────────────────────────────────  │
│  • FieldGroupDropdown - Group by source                    │
│  • Field selection → Insert expression                     │
│  • Expression formats:                                     │
│    - Webhook: $("nodeId").item.json.body.field             │
│    - Node: $("nodeId").item.json.field                     │
│    - Contact: $contact.field                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Field Definition Structure

```typescript
interface FieldDefinition {
  path: string;              // Dot-notation path (e.g., "contact.name")
  displayName: string;       // UI label (e.g., "name")
  group: string;             // Source group (e.g., "inboundWebhook" or node label)
  type: string;              // Data type (string, number, boolean, array, object)
  value: any;                // Sample value from test payload
  isNested: boolean;         // Is this a nested field?
  sourceNodeName?: string;   // Node ID for n8n references
}
```

---

## 🎯 Key Concepts

### 1. Field Sources

**Two sources of fields:**

- **Webhook Trigger Fields** - From test payload, stored in Firestore
- **Previous Node Outputs** - From node configs' `successResponse.fields`

### 2. Expression Formats

**Three expression types:**

- **Webhook Reference:** `={{ $("trigger-123").item.json.body.phoneNumber }}`
- **Node Reference:** `={{ $("node-456").item.json.contactId }}`
- **Contact Context:** `{{$contact.phoneNumber}}`

### 3. Field Grouping

Fields are grouped by source for organized display:

- **"inboundWebhook"** - Static group for webhook fields
- **Node labels** - Dynamic groups for each previous node

---

## 🔗 Related Documentation

- **[Node Registry](../nodeRegistry/INDEX.md)** - Node configuration (successResponse)
- **[Transformation System](../transformationSystem/INDEX.md)** - Expression evaluation
- **[Trigger Subscriptions](../triggerSubscriptions/INDEX.md)** - Webhook test capture

---

## 📦 File Locations

### Backend
- **Field Extraction:** `workflows/services/setFieldMappingReference/`
  - `index.ts` - Orchestration
  - `defineFieldsFromJson.ts` - Field extraction logic
  - `setMainMapping.ts` - Firestore storage
  - `getTestPayloadFirestore.ts` - Test payload retrieval

### Frontend
- **Field Display:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/`
  - `index.tsx` - Field loading orchestration
  - `FieldGroupDropdown.tsx` - Grouped field display
  - `NodeParameterRenderer.tsx` - Field insertion logic
- **Field Grouping:** `frontend/lib/fieldGroupConfig.ts`
- **Graph Utils:** `frontend/lib/workflowGraphUtils.ts`

### Types
- **Field Definition:** `workflows/services/setFieldMappingReference/defineFieldsFromJson.ts:1-8`
- **Success Response:** `workflows/services/nodeRegistry/types.ts:233-240`

---

## ✅ Documentation Coverage

- [x] Complete system overview (README)
- [x] Quick reference guide (QUICK-REFERENCE)
- [x] Webhook field pattern (webhook-fields)
- [x] Node output field pattern (node-output-fields)
- [x] Expression builder helper (expression-builder)
- [x] Complete example (complete-mapping-example)

**Total:** 6 documents covering all field mapping patterns and extension points
