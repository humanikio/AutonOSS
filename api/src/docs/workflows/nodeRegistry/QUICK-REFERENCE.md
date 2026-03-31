# Node Registry - Quick Reference

> **Keep this open while coding!** One-page reference for creating and registering nodes.

---

## 1. Create Trigger Node

### Template

```typescript
/**
 * [Event Name] Trigger Node Configuration
 */

import { INodeTypeDescription } from '../../types';
import { TriggerDestinationRegistry } from '../../../../triggerSubscriptions/services/TriggerDesitinationRegistry/index';

// Get event definition from registry
const eventDefinition = TriggerDestinationRegistry.getEventDefinition('[event.type.v1]');

export const [nodeName]TriggerNode: INodeTypeDescription = {
  displayName: '[Display Name]',
  name: '[nodeName]Trigger',
  icon: 'fa:[icon-name]',
  group: ['trigger'],
  version: 1,
  description: 'Triggers when [event description]',

  defaults: {
    name: '[Display Name]',
    color: '#10b981',
  },

  inputs: [],  // ← Triggers have NO inputs
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    isTrigger: true,  // ← Mark as trigger
    triggerType: '[event.type.v1]',  // ← Event type from registry
    transformationMethod: 'trigger_webhook',  // ← Always use trigger_webhook

    // Not used for triggers
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,

    // Success response from event definition
    successResponse: {
      fields: /* map from event definition */,
    },
  },

  properties: [],  // ← Usually empty for triggers
};
```

**File:** `smsReceivedTrigger.config.ts:1-69`

### Example (SMS Received)

```typescript
export const smsReceivedTriggerNode: INodeTypeDescription = {
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  icon: 'fa:comment-dots',
  group: ['trigger', 'communication'],
  version: 1,
  description: 'Triggers when an SMS message is received',

  defaults: {
    name: 'SMS Received',
    color: '#10b981',
  },

  inputs: [],
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    isTrigger: true,
    triggerType: 'sms.received.v1',
    transformationMethod: 'trigger_webhook',
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,
  },

  properties: [],
};
```

---

## 2. Create Action Node (API-backed)

### Template

```typescript
/**
 * [Action Name] Node Configuration
 */

import { INodeTypeDescription } from '../../types';

export const pulseline[NodeName]Node: INodeTypeDescription = {
  displayName: '[Display Name]',
  name: 'pulseline[NodeName]',
  icon: 'fa:[icon-name]',
  group: ['[category]'],
  version: 1,
  description: '[Description]',
  subtitle: '={{$parameter["[field]"]}}',  // ← Optional dynamic subtitle

  defaults: {
    name: '[Display Name]',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main'],

  _pulseline: {
    isCustomNode: true,
    transformationMethod: '[category]_[action]',  // ← Match transformation file
    apiEndpoint: '/api/[path]',  // ← Backend API endpoint
    httpMethod: 'POST',  // ← GET, POST, PUT, DELETE, PATCH
    requiresAuth: true,  // ← Needs API key?
    successResponse: {
      fields: [
        { name: '[field1]', type: 'string', description: '[desc]', required: true },
        { name: '[field2]', type: 'number', description: '[desc]' },
      ],
    },
  },

  properties: [
    {
      displayName: '[Label]',
      name: '[fieldName]',
      type: 'string',  // string, number, boolean, options, fixedCollection
      default: '',
      required: true,
      placeholder: '[placeholder]',
      description: '[help text]',
    },
    // ... more properties
  ],
};
```

**File:** `createContact.config.ts:1-139`

---

## 3. Add Dynamic Dropdown (loadOptionsMethod)

### In property definition:

```typescript
{
  displayName: 'Tag',
  name: 'tagId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getTags',  // ← Method name
  },
  default: '',
  required: true,
}
```

### In _pulseline metadata:

```typescript
_pulseline: {
  // ... other fields

  loadOptionsMethods: {
    getTags: {  // ← Match method name above
      endpoint: '/api/contacts/tags',
      method: 'GET',
      responseMapping: {
        valueField: 'tagId',      // ← Field for option value
        labelField: 'tagName',    // ← Field for option label
        dataPath: 'tags',         // ← Nested path (if response is {tags: [...]})
      },
    },
  },
}
```

**File:** `addContactTag.config.ts:40-49, 64-73`

---

## 4. Add fixedCollection (Dynamic Fields)

### In properties:

```typescript
{
  displayName: 'Additional Custom Fields',
  name: 'contactFields',
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,  // ← User can add multiple
  },
  default: {},
  options: [
    {
      name: 'field',
      displayName: 'Field',
      values: [
        {
          displayName: 'Field Name',
          name: 'fieldName',
          type: 'options',
          typeOptions: {
            loadOptionsMethod: 'getContactFields',  // ← Load field options
          },
          default: '',
        },
        {
          displayName: 'Field Value',
          name: 'fieldValue',
          type: 'string',
          default: '',
          placeholder: 'Value or expression',
        },
      ],
    },
  ],
}
```

**File:** `createContact.config.ts:101-136`

**Result in transformation:**
```typescript
// User adds: fieldName='custom_score', fieldValue='95'
// Transformation flattens to body parameter:
bodyParameters.push({
  name: 'custom_score',
  value: '95'
});
```

---

## 5. Add Conditional Output (IF node injection)

### In config:

```typescript
{
  displayName: 'Find Contact',
  name: 'pulselineFindContact',

  inputs: ['main'],
  outputs: ['main', 'main'],  // ← TWO outputs!

  _pulseline: {
    conditionalOutput: {
      enabled: true,
      field: 'found',  // ← Check this field in response
      trueLabel: 'Contact Found',
      falseLabel: 'Contact Not Found',
    },
  },
}
```

**File:** `findContact.config.ts:23, 33-38`

**Result:** Transformation automatically generates HTTP + IF nodes

---

## 6. Register Node in Index

### Step 1: Import

```typescript
// Import your node config
import { myNewNode } from './nodes/pulseline/myNode.config';
```

### Step 2: Add to Registry

```typescript
const nodeConfigs: Record<string, INodeTypeDescription> = {
  // ... existing nodes

  // Add your node
  myNode: myNewNode,
};
```

**File:** `index.ts:54-96`

---

## Decision Trees

### Node Type Decision

```
What does the node do?
├─ Starts workflow when event occurs → TRIGGER
├─ Performs action or transformation → ACTION
└─ Routes based on conditions → CONDITION
```

### Property Type Decision

```
What kind of input?
├─ Text → type: 'string'
├─ Number → type: 'number'
├─ True/False → type: 'boolean'
├─ Select one option → type: 'options'
│   ├─ Fixed list → options: [...]
│   └─ Load from API → typeOptions: { loadOptionsMethod: 'xxx' }
└─ User-defined fields → type: 'fixedCollection'
```

### fixedCollection Pattern

```
Backend expects what?
├─ Flat root-level fields → Flatten in transformation
│   Example: {name: 'x', custom_field1: 'y', custom_field2: 'z'}
│   Use: buildBodyParameters + flatten fixedCollection
│
└─ Nested object field → Build object expression
    Example: {workflowId: 'x', payload: {field1: 'y', field2: 'z'}}
    Use: buildN8nObjectExpression
```

---

## Common Patterns

### Pattern 1: Simple Text Input

```typescript
{
  displayName: 'Name',
  name: 'name',
  type: 'string',
  default: '{{$contact.name}}',
  required: true,
  placeholder: 'John Doe',
  description: 'Full name of the contact',
}
```

### Pattern 2: Number Input

```typescript
{
  displayName: 'Score',
  name: 'score',
  type: 'number',
  default: 0,
  typeOptions: {
    minValue: 0,
    maxValue: 100,
  },
  description: 'Lead score (0-100)',
}
```

### Pattern 3: Boolean Toggle

```typescript
{
  displayName: 'Active',
  name: 'active',
  type: 'boolean',
  default: true,
  description: 'Whether the contact is active',
}
```

### Pattern 4: Static Dropdown

```typescript
{
  displayName: 'Status',
  name: 'status',
  type: 'options',
  options: [
    { name: 'Active', value: 'active' },
    { name: 'Inactive', value: 'inactive' },
    { name: 'Pending', value: 'pending' },
  ],
  default: 'active',
}
```

### Pattern 5: Multi-line Text

```typescript
{
  displayName: 'Notes',
  name: 'notes',
  type: 'string',
  typeOptions: {
    rows: 4,  // ← Textarea with 4 rows
  },
  default: '',
  placeholder: 'Additional notes...',
}
```

### Pattern 6: Notice/Info

```typescript
{
  displayName: 'Important Notice',
  name: 'notice',
  type: 'notice',
  default: '',
  description: '⚠️ At least one identifier is required: phone OR email',
}
```

### Pattern 7: Conditional Display

```typescript
{
  displayName: 'Compare To',
  name: 'compareValue',
  type: 'string',
  default: '',
  displayOptions: {
    show: {
      conditionType: ['string'],  // ← Only show when conditionType='string'
      stringOperation: ['equals', 'notEquals'],  // ← And operation is equals/notEquals
    },
  },
}
```

### Pattern 8: Conditional Required

```typescript
{
  displayName: 'Field',
  name: 'field',
  type: 'string',
  required: true,
  requiredOptions: {
    hide: {
      conditionType: ['tagCheck'],  // ← NOT required when tagCheck mode
    },
  },
}
```

---

## Common Mistakes

### ❌ Mistake 1: Forgot to Register

```typescript
// ❌ Created config file but didn't add to index.ts
export const myNode: INodeTypeDescription = { ... };
```

```typescript
// ✅ Import and add to registry
import { myNode } from './nodes/pulseline/myNode.config';
const nodeConfigs = {
  myNode: myNode,  // ← ADD HERE
};
```

### ❌ Mistake 2: Wrong transformationMethod

```typescript
// ❌ Doesn't match file name
_pulseline: {
  transformationMethod: 'createContact',  // File: contact_create.ts
}
```

```typescript
// ✅ Match transformation file name
_pulseline: {
  transformationMethod: 'contact_create',  // ← Matches file
}
```

### ❌ Mistake 3: Trigger with Inputs

```typescript
// ❌ Triggers should have NO inputs
inputs: ['main'],
_pulseline: { isTrigger: true }
```

```typescript
// ✅ Triggers have empty inputs
inputs: [],
_pulseline: { isTrigger: true }
```

### ❌ Mistake 4: loadOptionsMethod Mismatch

```typescript
// ❌ Method name doesn't match
typeOptions: {
  loadOptionsMethod: 'getTag',  // ← Typo!
}

loadOptionsMethods: {
  getTags: { ... }  // ← Different name
}
```

```typescript
// ✅ Names must match exactly
typeOptions: {
  loadOptionsMethod: 'getTags',
}

loadOptionsMethods: {
  getTags: { ... }  // ← Same name
}
```

### ❌ Mistake 5: Wrong Response Mapping

```typescript
// ❌ Fields don't exist in response
// Response: {tags: [{tagId: 'x', tagName: 'y'}]}
responseMapping: {
  valueField: 'id',      // ← Wrong!
  labelField: 'name',    // ← Wrong!
}
```

```typescript
// ✅ Match actual response fields
responseMapping: {
  valueField: 'tagId',   // ← Correct
  labelField: 'tagName', // ← Correct
  dataPath: 'tags',      // ← Array is nested
}
```

---

## File Locations

| Pattern | File | Lines |
|---------|------|-------|
| Trigger Node | `smsReceivedTrigger.config.ts` | 1-69 |
| Action Node | `createContact.config.ts` | 1-139 |
| Condition Node | `if.config.ts` | 1-231 |
| loadOptionsMethod | `addContactTag.config.ts` | 64-73 |
| fixedCollection | `createContact.config.ts` | 101-136 |
| Conditional Output | `findContact.config.ts` | 33-38 |
| Registry | `index.ts` | 54-96 |

---

## Testing Checklist

- [ ] Node config file created
- [ ] Imported in index.ts
- [ ] Added to nodeConfigs object
- [ ] transformationMethod matches transformation file
- [ ] apiEndpoint and httpMethod correct
- [ ] All required fields have required: true
- [ ] loadOptionsMethod names match
- [ ] Response mapping fields correct
- [ ] Tested node appears in frontend
- [ ] Tested all parameters render correctly
- [ ] Tested transformation executes

---

## Import Statement

```typescript
import { INodeTypeDescription, INodeProperties } from '../../types';

// For triggers
import { TriggerDestinationRegistry } from '../../../../triggerSubscriptions/services/TriggerDesitinationRegistry/index';

// For load options
_pulseline: {
  loadOptionsMethods: {
    // ...
  }
}
```

---

## Quick Commands

```bash
# Create new node file
touch backend/src/workflows/services/nodeRegistry/nodes/pulseline/myNode.config.ts

# Verify node registered
# Restart backend, then:
curl http://localhost:4000/api/workflows/nodes | jq '.[] | select(.name=="myNode")'

# Check transformation method exists
grep -r "readonly name = 'my_transformation'" backend/src/n8n/transformationSystem/
```

---

## Need More Details?

- **Trigger Pattern:** See `patterns/trigger-nodes.md`
- **Action Pattern:** See `patterns/action-nodes.md`
- **Load Options:** See `patterns/load-options.md`
- **Complete Example:** See `examples/complete-node-example.md`
- **Interface Reference:** See `helpers/node-config-api.md`
- **System Overview:** See `README.md`
