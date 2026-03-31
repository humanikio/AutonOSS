# Load Options Pattern (Dynamic Dropdowns)

> **⚠️ CRITICAL FOR DROPDOWNS** - Load dropdown options dynamically from backend APIs

---

## 📋 Overview

The **loadOptionsMethod** pattern enables dropdowns that:
1. **Load options from API** (not hardcoded)
2. **Refresh on demand** (get latest data)
3. **Depend on other parameters** (cascading dropdowns)
4. **Map response data** to option format

**Common use cases:**
- Tag selectors (load from `/api/contacts/tags`)
- Pipeline selectors (load from `/api/opportunities/pipelines`)
- Custom field selectors (load from `/api/customFields/fields-list`)
- Workflow selectors (load from `/api/workflows`)

**File Location:** Node config `_pulseline.loadOptionsMethods`

---

## 🎯 When to Use

✅ Dropdown options come from database
✅ Options can change (tags, pipelines, workflows)
✅ Options specific to tenant
✅ Options need to be fresh/current

❌ **DON'T use for:**
- Static options (priority: low/medium/high)
- Fixed lists (status: active/inactive)
- Small unchanging sets

---

## 🏗️ Architecture

```
Frontend Node Config Panel
    ↓
User opens dropdown
    ↓
Frontend checks: typeOptions.loadOptionsMethod?
    ↓
YES: Call API endpoint
    ↓
GET {BACKEND_URL}/api/contacts/tags
    ↓
Response: { tags: [{ tagId: 'x', tagName: 'y' }] }
    ↓
Map using responseMapping
    ↓
Display options: [{ name: 'y', value: 'x' }]
```

---

## 📐 Configuration Structure

### Part 1: Property Definition

**File:** `addContactTag.config.ts:64-73`

```typescript
properties: [
  {
    displayName: 'Tag',
    name: 'tagId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getTags',  // ← Method name (must match below)
    },
    default: '',
    required: true,
    description: 'Select the tag to add',
    options: [],  // ← Empty, will be populated dynamically
  },
]
```

### Part 2: _pulseline.loadOptionsMethods

**File:** `addContactTag.config.ts:40-49`

```typescript
_pulseline: {
  // ... other fields

  loadOptionsMethods: {
    getTags: {  // ← Must match typeOptions.loadOptionsMethod
      endpoint: '/api/contacts/tags',
      method: 'GET',
      responseMapping: {
        valueField: 'tagId',      // ← Field for option value
        labelField: 'tagName',    // ← Field for option label
        dataPath: 'tags',         // ← Nested array path (optional)
      },
    },
  },
}
```

---

## 🔑 Critical Fields

### endpoint
**Backend API endpoint to call**

```typescript
endpoint: '/api/contacts/tags'
// Full URL: {BACKEND_URL}/api/contacts/tags
```

**With parameters:**
```typescript
endpoint: '/api/opportunities/pipelines/{{$parameter["pipelineId"]}}/stages'
// If pipelineId='pipe_123': {BACKEND_URL}/api/opportunities/pipelines/pipe_123/stages
```

### method
**HTTP method (usually GET)**

```typescript
method: 'GET'  // or 'POST' if needed
```

### responseMapping

**How to transform API response into dropdown options**

```typescript
responseMapping: {
  valueField: 'tagId',      // Response field for option value
  labelField: 'tagName',    // Response field for option label
  dataPath: 'tags',         // Optional: path to array in response
  descriptionField: 'desc', // Optional: field for option description
}
```

### dependsOn (Optional)

**Parameters this dropdown depends on**

```typescript
dependsOn: ['pipelineId']  // Wait for pipelineId to be selected first
```

---

## 🎨 Response Mapping Examples

### Example 1: Flat Array Response

**API Response:**
```json
[
  { "tagId": "tag_123", "tagName": "Hot Lead" },
  { "tagId": "tag_456", "tagName": "Follow Up" }
]
```

**Configuration:**
```typescript
loadOptionsMethods: {
  getTags: {
    endpoint: '/api/contacts/tags',
    method: 'GET',
    responseMapping: {
      valueField: 'tagId',
      labelField: 'tagName',
      // No dataPath needed - array is at root
    },
  },
}
```

**Result in UI:**
```javascript
[
  { name: 'Hot Lead', value: 'tag_123' },
  { name: 'Follow Up', value: 'tag_456' }
]
```

### Example 2: Nested Array Response

**API Response:**
```json
{
  "success": true,
  "tags": [
    { "tagId": "tag_123", "tagName": "Hot Lead" },
    { "tagId": "tag_456", "tagName": "Follow Up" }
  ]
}
```

**Configuration:**
```typescript
loadOptionsMethods: {
  getTags: {
    endpoint: '/api/contacts/tags',
    method: 'GET',
    responseMapping: {
      valueField: 'tagId',
      labelField: 'tagName',
      dataPath: 'tags',  // ← Array is nested in response.tags
    },
  },
}
```

**Result:** Same as Example 1

### Example 3: With Description Field

**API Response:**
```json
[
  {
    "id": "pipeline_1",
    "name": "Sales Pipeline",
    "description": "Main sales funnel"
  },
  {
    "id": "pipeline_2",
    "name": "Support Pipeline",
    "description": "Customer support workflow"
  }
]
```

**Configuration:**
```typescript
loadOptionsMethods: {
  getPipelines: {
    endpoint: '/api/opportunities/pipelines',
    method: 'GET',
    responseMapping: {
      valueField: 'id',
      labelField: 'name',
      descriptionField: 'description',  // ← Optional description
    },
  },
}
```

**Result in UI:**
```javascript
[
  {
    name: 'Sales Pipeline',
    value: 'pipeline_1',
    description: 'Main sales funnel'
  },
  {
    name: 'Support Pipeline',
    value: 'pipeline_2',
    description: 'Customer support workflow'
  }
]
```

---

## 🔗 Cascading Dropdowns (dependsOn)

### Use Case: Pipeline → Stage Selection

**File:** `createOpportunity.config.ts:46-64`

```typescript
loadOptionsMethods: {
  // First dropdown: Load pipelines
  getPipelines: {
    endpoint: '/api/opportunities/pipelines',
    method: 'GET',
    responseMapping: {
      valueField: 'id',
      labelField: 'name',
    },
  },

  // Second dropdown: Load stages (depends on pipeline)
  getStages: {
    endpoint: '/api/opportunities/pipelines/{{$parameter["pipelineId"]}}/stages',
    method: 'GET',
    responseMapping: {
      valueField: 'id',
      labelField: 'name',
    },
    dependsOn: ['pipelineId'],  // ← Wait for pipelineId to be set
  },
}
```

**Properties:**
```typescript
properties: [
  {
    displayName: 'Pipeline',
    name: 'pipelineId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getPipelines',  // Load first
    },
    required: true,
  },
  {
    displayName: 'Stage',
    name: 'stageId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getStages',  // Load after pipeline selected
    },
    displayOptions: {
      show: {
        pipelineId: ['*'],  // Only show when pipeline selected
      },
    },
    required: true,
  },
]
```

**Flow:**
1. User opens node config
2. Pipeline dropdown loads immediately
3. Stage dropdown is hidden until pipeline selected
4. User selects pipeline (e.g., `pipeline_123`)
5. Stage dropdown appears
6. Frontend calls: `GET /api/opportunities/pipelines/pipeline_123/stages`
7. Stage options populate

---

## 📊 Complete Example: Tag Selector

### Node Config

**File:** `addContactTag.config.ts:30-73`

```typescript
export const pulselineAddContactTagNode: INodeTypeDescription = {
  displayName: 'Add Contact Tag',
  name: 'pulselineAddContactTag',

  _pulseline: {
    loadOptionsMethods: {
      getTags: {
        endpoint: '/api/contacts/tags',
        method: 'GET',
        responseMapping: {
          valueField: 'tagId',
          labelField: 'tagName',
          dataPath: 'tags',
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '{{$contact.contactId}}',
      required: true,
    },
    {
      displayName: 'Tag',
      name: 'tagId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getTags',  // ← Links to method above
      },
      required: true,
      description: 'Select the tag to add to the contact',
      options: [],  // Populated dynamically
    },
  ],
};
```

### Backend API

**File:** `contacts/controllers/contactController.ts` (example)

```typescript
// GET /api/contacts/tags
async getContactTags(req, res) {
  const { tenantId } = req.user;

  const tags = await ContactTag.find({ tenantId });

  return res.json({
    success: true,
    tags: tags.map(tag => ({
      tagId: tag.tagId,
      tagName: tag.tagName,
      color: tag.color,
    }))
  });
}
```

### Frontend Execution

```typescript
// User opens node config
// Frontend detects loadOptionsMethod

const config = nodeConfig._pulseline.loadOptionsMethods.getTags;
const endpoint = config.endpoint;  // '/api/contacts/tags'
const method = config.method;      // 'GET'

// Call API
const response = await fetch(`${BACKEND_URL}${endpoint}`, {
  method,
  headers: {
    'Authorization': `Bearer ${userToken}`,
  }
});

const data = await response.json();
// { success: true, tags: [...] }

// Extract array using dataPath
const items = config.responseMapping.dataPath
  ? data[config.responseMapping.dataPath]  // data.tags
  : data;

// Map to dropdown options
const options = items.map(item => ({
  name: item[config.responseMapping.labelField],   // item.tagName
  value: item[config.responseMapping.valueField],  // item.tagId
}));

// Display in dropdown
// [
//   { name: 'Hot Lead', value: 'tag_123' },
//   { name: 'Follow Up', value: 'tag_456' }
// ]
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Method Name Mismatch

```typescript
// ❌ WRONG - Names don't match
typeOptions: {
  loadOptionsMethod: 'getTag',  // ← Typo!
}

loadOptionsMethods: {
  getTags: { ... }  // ← Different name
}
```

```typescript
// ✅ CORRECT - Names match exactly
typeOptions: {
  loadOptionsMethod: 'getTags',
}

loadOptionsMethods: {
  getTags: { ... }
}
```

### ❌ Mistake 2: Wrong Response Field Names

```typescript
// ❌ WRONG - Fields don't exist in response
// Response: { tags: [{ tagId: 'x', tagName: 'y' }] }
responseMapping: {
  valueField: 'id',      // ← Field doesn't exist!
  labelField: 'name',    // ← Field doesn't exist!
}
```

```typescript
// ✅ CORRECT - Match actual response
responseMapping: {
  valueField: 'tagId',   // ← Matches response
  labelField: 'tagName', // ← Matches response
  dataPath: 'tags',
}
```

### ❌ Mistake 3: Missing dataPath for Nested Response

```typescript
// ❌ WRONG - Response is { tags: [...] } but no dataPath
// Response: { success: true, tags: [...] }
responseMapping: {
  valueField: 'tagId',
  labelField: 'tagName',
  // Missing dataPath!
}
```

```typescript
// ✅ CORRECT - Add dataPath for nested array
responseMapping: {
  valueField: 'tagId',
  labelField: 'tagName',
  dataPath: 'tags',  // ← Extract tags array
}
```

### ❌ Mistake 4: Hardcoded Tenant ID in Endpoint

```typescript
// ❌ WRONG - Hardcoded tenant
endpoint: '/api/tenants/ten_123/tags'  // Only works for one tenant!
```

```typescript
// ✅ CORRECT - Backend uses auth token to get tenant
endpoint: '/api/contacts/tags'  // Backend extracts tenant from token
```

### ❌ Mistake 5: dependsOn with Missing displayOptions

```typescript
// ❌ WRONG - Dropdown loads before dependency set
{
  name: 'stageId',
  typeOptions: {
    loadOptionsMethod: 'getStages',  // Needs pipelineId
  },
  // Missing displayOptions! Dropdown shows too early
}

loadOptionsMethods: {
  getStages: {
    endpoint: '/api/pipelines/{{$parameter["pipelineId"]}}/stages',
    dependsOn: ['pipelineId'],
  }
}
```

```typescript
// ✅ CORRECT - Hide until dependency satisfied
{
  name: 'stageId',
  typeOptions: {
    loadOptionsMethod: 'getStages',
  },
  displayOptions: {
    show: {
      pipelineId: ['*'],  // ← Hide until pipelineId set
    },
  },
}
```

---

## 🧪 Testing

### Test 1: Verify Method Registered

```typescript
const config = NodeRegistry.getNodeConfig('pulselineAddContactTag');
expect(config._pulseline?.loadOptionsMethods).toBeDefined();
expect(config._pulseline?.loadOptionsMethods?.getTags).toBeDefined();
```

### Test 2: Verify Property Links to Method

```typescript
const tagProperty = config.properties.find(p => p.name === 'tagId');
expect(tagProperty?.typeOptions?.loadOptionsMethod).toBe('getTags');
```

### Test 3: Test API Endpoint

```bash
# Call endpoint directly
curl -X GET \
  -H "Authorization: Bearer {token}" \
  https://backend.pulseline.io/api/contacts/tags

# Verify response structure matches responseMapping
{
  "success": true,
  "tags": [
    { "tagId": "tag_123", "tagName": "Hot Lead" }
  ]
}
```

### Test 4: Test in Frontend

```typescript
// Open node config panel
// Click tag dropdown
// Verify options load
// Verify options display correctly
```

---

## 📋 Examples in Codebase

| Node | Method | Endpoint | Use Case |
|------|--------|----------|----------|
| Add Contact Tag | getTags | `/api/contacts/tags` | Tag selector |
| Create Contact | getContactFields | `/api/customFields/fields-list?entityScope=contact` | Custom field selector |
| Create Opportunity | getPipelines | `/api/opportunities/pipelines` | Pipeline selector |
| Create Opportunity | getStages | `/api/opportunities/pipelines/{id}/stages` | Stage selector (cascading) |
| IF Node | getContactTags | `/api/contacts/tags` | Tag check condition |
| Trigger Workflow | getWorkflows | `/api/workflows` | Workflow selector |

---

## ✅ Checklist for New loadOptionsMethod

- [ ] Method name matches typeOptions.loadOptionsMethod
- [ ] Endpoint correct (no hardcoded tenant IDs)
- [ ] Method is GET (or POST if needed)
- [ ] responseMapping.valueField matches response
- [ ] responseMapping.labelField matches response
- [ ] dataPath set if array is nested
- [ ] dependsOn set if cascading dropdown
- [ ] displayOptions.show configured for dependent dropdowns
- [ ] Backend endpoint returns correct format
- [ ] Tested in frontend dropdown
- [ ] Options load correctly
- [ ] Cascading works (if applicable)

---

## 🔗 Related Documentation

- **Action Nodes:** See action-nodes.md for full node structure
- **Node Config API:** See node-config-api.md for interface details
- **Property Types:** See node-config-api.md for all property types
- **Frontend:** See frontend docs for how UI calls loadOptionsMethod

---

**File Locations:**
- Node Configs: `workflows/services/nodeRegistry/nodes/`
- Example: `addContactTag.config.ts:40-73`
- Example: `createOpportunity.config.ts:46-64`
- Frontend Logic: `frontend/app/automations/automationsEditor/components/NodeConfigPanel/`
