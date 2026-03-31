# Expression Builder Reference

> **Complete guide** to n8n expression formats and field insertion logic

---

## 📋 Overview

The expression builder system generates correct n8n expressions for field references based on the field's source (webhook trigger, previous node, or contact context).

### Key Responsibilities

1. ✅ Determine correct expression format for field source
2. ✅ Build n8n-compatible expression strings
3. ✅ Handle cursor position during insertion
4. ✅ Support multiple expression types
5. ✅ Maintain input focus and selection

---

## 🎯 Expression Formats

### Format 1: Webhook Trigger Fields

**Pattern:**
```javascript
={{ $("nodeId").item.json.body.fieldPath }}
```

**Why `.body`?** n8n webhook nodes wrap payloads in `.body` property.

**Structure:**
```
={{                           Opening expression delimiter
  $(                          Node reference function
    "trigger-abc123"          Node ID (in quotes)
  )                           Close node reference
  .item                       Current item
  .json                       JSON data
  .body                       ← Webhook wrapper
  .phoneNumber                Field path
}}                            Closing delimiter
```

**Examples:**

```javascript
// Top-level field
={{ $("trigger-123").item.json.body.from }}

// Nested object field
={{ $("trigger-123").item.json.body.contact.name }}

// Deeply nested
={{ $("trigger-123").item.json.body.contact.customFields.industry }}

// Array access
={{ $("trigger-123").item.json.body.tags[0] }}

// Nested in array
={{ $("trigger-123").item.json.body.contacts[0].name }}
```

**When to use:** `field.group === 'inboundWebhook'`

---

### Format 2: Previous Node Output Fields

**Pattern:**
```javascript
={{ $("nodeId").item.json.fieldPath }}
```

**Why no `.body`?** Node outputs are at top level, not wrapped.

**Structure:**
```
={{                           Opening expression delimiter
  $(                          Node reference function
    "node-456"                Node ID (in quotes)
  )                           Close node reference
  .item                       Current item
  .json                       JSON data
  .contactId                  Field path (NO .body)
}}                            Closing delimiter
```

**Examples:**

```javascript
// Simple field
={{ $("node-456").item.json.contactId }}

// Multiple fields
={{ $("node-456").item.json.name }}
={{ $("node-456").item.json.email }}

// Nested field (if defined in successResponse)
={{ $("node-456").item.json.contact.phoneNumber }}

// Array field
={{ $("node-789").item.json.tags }}

// Array element
={{ $("node-789").item.json.tags[0] }}
```

**When to use:** `field.group !== 'inboundWebhook' && field.sourceNodeName`

---

### Format 3: Contact Context Fields

**Pattern:**
```javascript
{{$contact.fieldName}}
```

**Special case:** Pre-populated workflow context, no node reference needed.

**Structure:**
```
{{                            Opening delimiter (no =)
  $contact                    Contact context object
  .phoneNumber                Field name
}}                            Closing delimiter
```

**Examples:**

```javascript
// Contact fields
{{$contact.phoneNumber}}
{{$contact.email}}
{{$contact.name}}
{{$contact.contactId}}

// Custom fields
{{$contact.customFields.lead_score}}
```

**When to use:** User manually inserts via "Contact Fields" menu (special button).

---

## 🏗️ Implementation

### Main Insertion Function

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/NodeParameterRenderer.tsx:391-425`

```typescript
const insertFieldAtCursor = (field: FieldDefinition) => {
  let expression: string;

  // 1. DETERMINE EXPRESSION FORMAT
  if (!field?.sourceNodeName) {
    // Fallback for missing node info (shouldn't happen)
    expression = `{{$json.${field.path}}}`;
  } else if (field.group === 'inboundWebhook') {
    // ✅ Webhook trigger field - needs .body
    expression = `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
  } else {
    // ✅ Previous node output - no .body
    expression = `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
  }

  // 2. INSERT AT CURSOR POSITION
  if (inputRef) {
    const start = inputRef.selectionStart || 0;
    const end = inputRef.selectionEnd || 0;
    const currentValue = value || '';

    // Build new value with expression inserted
    const newValue =
      currentValue.substring(0, start) +
      expression +
      currentValue.substring(end);

    // Update parameter value
    onChange(property.name, newValue);

    // 3. RESTORE CURSOR POSITION
    setTimeout(() => {
      inputRef.focus();
      const newPosition = start + expression.length;
      inputRef.setSelectionRange(newPosition, newPosition);
    }, 0);
  } else {
    // No cursor position available - just append
    const newValue = (value || '') + expression;
    onChange(property.name, newValue);
  }

  // 4. CLOSE DROPDOWN
  setShowFieldMenu(false);
};
```

---

### Decision Logic

```typescript
// Determine expression format
function buildExpression(field: FieldDefinition): string {
  // Check 1: Missing node info
  if (!field.sourceNodeName) {
    return `{{$json.${field.path}}}`;
  }

  // Check 2: Webhook trigger
  if (field.group === 'inboundWebhook') {
    return `={{ $("${field.sourceNodeName}").item.json.body.${field.path} }}`;
  }

  // Check 3: Previous node output
  return `={{ $("${field.sourceNodeName}").item.json.${field.path} }}`;
}
```

**Decision Tree:**

```
Does field have sourceNodeName?
├─ NO → Fallback: {{$json.fieldPath}}
│
└─ YES → Is field.group === 'inboundWebhook'?
    ├─ YES → Webhook format
    │         {{ $("nodeId").item.json.body.fieldPath }}
    │
    └─ NO → Node output format
              {{ $("nodeId").item.json.fieldPath }}
```

---

### Cursor Position Handling

**Problem:** After inserting expression, cursor should be at end of inserted text.

**Solution:**

```typescript
// Get current cursor position
const start = inputRef.selectionStart || 0;
const end = inputRef.selectionEnd || 0;

// Insert expression
const newValue =
  currentValue.substring(0, start) +  // Before cursor
  expression +                         // Inserted text
  currentValue.substring(end);         // After cursor

// Update value
onChange(property.name, newValue);

// Restore focus and set cursor position
setTimeout(() => {
  inputRef.focus();
  const newPosition = start + expression.length;
  inputRef.setSelectionRange(newPosition, newPosition);
}, 0);
```

**Example:**

```
Before:
"Send to |"
         ↑ cursor at position 8

User selects phoneNumber field
→ expression: "{{ $("trigger").item.json.body.phoneNumber }}"
→ length: 49

After:
"Send to {{ $("trigger").item.json.body.phoneNumber }}|"
                                                      ↑ cursor at position 57 (8 + 49)
```

---

### Contact Field Insertion

**Separate function for contact context:**

**File:** `NodeParameterRenderer.tsx:427-449`

```typescript
const insertContactFieldAtCursor = (fieldName: string) => {
  // Different format - no node reference
  const expression = `{{$contact.${fieldName}}}`;

  if (inputRef) {
    const start = inputRef.selectionStart || 0;
    const end = inputRef.selectionEnd || 0;
    const currentValue = value || '';
    const newValue =
      currentValue.substring(0, start) +
      expression +
      currentValue.substring(end);

    onChange(property.name, newValue);

    setTimeout(() => {
      inputRef.focus();
      const newPosition = start + expression.length;
      inputRef.setSelectionRange(newPosition, newPosition);
    }, 0);
  } else {
    const newValue = (value || '') + expression;
    onChange(property.name, newValue);
  }

  setShowContactFieldMenu(false);
};
```

**Usage:**

```typescript
// User clicks "phoneNumber" in Contact Fields menu
insertContactFieldAtCursor('phoneNumber');

// Result inserted:
{{$contact.phoneNumber}}
```

---

## 🎨 UI Components

### FieldGroupDropdown Component

**Displays grouped fields with collapsible sections.**

**File:** `frontend/app/automations/automationsEditor/components/NodeConfigPanel/FieldGroupDropdown.tsx`

```typescript
export function FieldGroupDropdown({
  fields,
  onSelectField
}: FieldGroupDropdownProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['inboundWebhook']) // Webhook group expanded by default
  );

  const groupedFields = groupFields(fields);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  if (groupedFields.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        No fields available. Send a test webhook to capture fields.
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {groupedFields.map(({ group, fields: groupFields }) => {
        const isExpanded = expandedGroups.has(group.name);

        return (
          <div key={group.name} className="border-b border-gray-200">
            {/* Group Header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{group.icon}</span>
                <div>
                  <div className="text-sm font-medium">{group.displayName}</div>
                  {group.description && (
                    <div className="text-xs text-gray-500">{group.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {groupFields.length}
                </span>
                {isExpanded ? <ChevronDown /> : <ChevronRight />}
              </div>
            </button>

            {/* Group Fields */}
            {isExpanded && (
              <div className="bg-gray-50">
                {groupFields.map((field) => (
                  <button
                    key={`${field.sourceNodeName}-${field.path}`}
                    type="button"
                    onClick={() => onSelectField(field)}
                    className="w-full text-left px-6 py-2 hover:bg-blue-50 border-t"
                  >
                    <div className="font-mono text-sm">{field.displayName}</div>
                    <div className="text-xs text-gray-500">{field.path}</div>
                    <div className="text-xs text-gray-400">
                      {field.type}
                      {field.value && ` • ${String(field.value).substring(0, 40)}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Rendered UI:**

```
┌────────────────────────────────────────────┐
│  Available Fields                    [X]   │
├────────────────────────────────────────────┤
│  📥 Webhook Payload                   [7]  │ ← Expanded
│  ───────────────────────────────────────── │
│    phoneNumber                             │
│    from                                    │
│    string • +15551234567                   │
│                                            │
│    body                                    │
│    body                                    │
│    string • Hello there                    │
│                                            │
│    contactId                               │
│    contact.contactId                       │
│    string • con_123                        │
│  ───────────────────────────────────────── │
│                                            │
│  🔍 Find Contact                      [5]  │ ← Collapsed
│                                            │
│  🔍 Create Opportunity                [3]  │ ← Collapsed
└────────────────────────────────────────────┘
```

---

### Field Insertion Button

**Trigger button next to input fields:**

```typescript
<div className="relative">
  {/* Input field */}
  <input
    ref={setInputRef}
    type="text"
    value={value || ''}
    onChange={(e) => onChange(property.name, e.target.value)}
    className="w-full px-3 py-2 border rounded"
  />

  {/* Field selector button */}
  <button
    type="button"
    onClick={() => setShowFieldMenu(!showFieldMenu)}
    className="absolute right-2 top-2 text-blue-500 hover:text-blue-700"
    title="Insert field reference"
  >
    <Zap className="h-4 w-4" />
  </button>

  {/* Dropdown menu */}
  {showFieldMenu && (
    <div
      ref={menuRef}
      className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl z-50 border"
    >
      <FieldGroupDropdown
        fields={availableFields}
        onSelectField={insertFieldAtCursor}
      />
    </div>
  )}
</div>
```

**Visual:**

```
┌─────────────────────────────────────┐
│ Phone Number                  [⚡]  │ ← Click lightning icon
│ ┌─────────────────────────────────┐ │
│ │ {{$contact.phoneNumber}}        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
            │
            ▼ Opens dropdown
┌─────────────────────────────────────┐
│  📥 Webhook Payload            [7]  │
│  🔍 Find Contact               [5]  │
│  🔍 Create Opportunity         [3]  │
└─────────────────────────────────────┘
```

---

## 🎯 Complete Examples

### Example 1: Webhook Field Insertion

**Initial State:**

```typescript
// Input value
"Send SMS to "

// Cursor position: 12 (at end)

// User clicks ⚡ button
// Selects "phoneNumber" from Webhook Payload
```

**Field Object:**

```typescript
{
  path: 'contact.phoneNumber',
  displayName: 'phoneNumber',
  group: 'inboundWebhook',
  sourceNodeName: 'trigger-abc123',
  type: 'string',
  value: '+15551234567',
  isNested: true
}
```

**Processing:**

```typescript
// 1. Generate expression
const expression = `={{ $("trigger-abc123").item.json.body.contact.phoneNumber }}`;

// 2. Insert at cursor
const start = 12;
const end = 12;
const currentValue = "Send SMS to ";
const newValue = currentValue.substring(0, 12) + expression + currentValue.substring(12);
// Result: "Send SMS to {{ $("trigger-abc123").item.json.body.contact.phoneNumber }}"

// 3. Set cursor position
const newPosition = 12 + expression.length; // 12 + 67 = 79
```

**Final State:**

```typescript
// Input value
"Send SMS to {{ $("trigger-abc123").item.json.body.contact.phoneNumber }}"

// Cursor position: 79 (at end of expression)
```

---

### Example 2: Node Output Field Insertion

**Initial State:**

```typescript
// Input value
"Contact: "

// Cursor position: 9

// User selects "name" from Find Contact group
```

**Field Object:**

```typescript
{
  path: 'name',
  displayName: 'name',
  group: 'Find Contact',
  sourceNodeName: 'node-456',
  type: 'string',
  value: null,
  isNested: false
}
```

**Processing:**

```typescript
// 1. Generate expression (no .body)
const expression = `={{ $("node-456").item.json.name }}`;

// 2. Insert
const newValue = "Contact: " + expression;
// Result: "Contact: {{ $("node-456").item.json.name }}"
```

**Final State:**

```typescript
"Contact: {{ $("node-456").item.json.name }}"
```

---

### Example 3: Multiple Field Insertions

**User inserts multiple fields:**

```
Step 1: Start with empty input
""

Step 2: Insert "name" from Find Contact
"{{ $("node-456").item.json.name }}"

Step 3: Add text
"{{ $("node-456").item.json.name }} - "

Step 4: Insert "phoneNumber" from Webhook
"{{ $("node-456").item.json.name }} - {{ $("trigger-123").item.json.body.phoneNumber }}"

Step 5: Add more text
"{{ $("node-456").item.json.name }} - {{ $("trigger-123").item.json.body.phoneNumber }} (New lead)"
```

**Result:** Complex expression with multiple field references.

---

### Example 4: Selection Replacement

**Replace selected text:**

```typescript
// Initial state
"Send to John Doe"
//       ^^^^^^^^ selected (start: 8, end: 16)

// User selects phoneNumber field
// Expression: {{ $("trigger").item.json.body.phoneNumber }}

// Processing
const start = 8;
const end = 16;
const currentValue = "Send to John Doe";
const newValue = currentValue.substring(0, 8) + expression + currentValue.substring(16);

// Result
"Send to {{ $("trigger").item.json.body.phoneNumber }}"
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Replaced "John Doe"
```

---

## 🧪 Testing

### Test 1: Expression Format

```typescript
// Webhook field
const webhookField = {
  path: 'phoneNumber',
  group: 'inboundWebhook',
  sourceNodeName: 'trigger-123'
};

const expr1 = buildExpression(webhookField);
console.assert(expr1.includes('.body.'), 'Should have .body');

// Node output field
const nodeField = {
  path: 'contactId',
  group: 'Find Contact',
  sourceNodeName: 'node-456'
};

const expr2 = buildExpression(nodeField);
console.assert(!expr2.includes('.body.'), 'Should NOT have .body');
```

### Test 2: Cursor Position

```typescript
// Test cursor position after insertion
const input = document.createElement('input');
input.value = "Hello ";
input.selectionStart = 6;
input.selectionEnd = 6;

const expression = "{{$contact.name}}";
const newValue = input.value.substring(0, 6) + expression + input.value.substring(6);
const expectedPosition = 6 + expression.length;

console.assert(expectedPosition === 23, 'Cursor position correct');
```

### Test 3: Selection Replacement

```typescript
const input = { value: "Replace this text", selectionStart: 8, selectionEnd: 12 };
const expression = "{{$contact.name}}";

const newValue =
  input.value.substring(0, input.selectionStart) +
  expression +
  input.value.substring(input.selectionEnd);

console.assert(newValue === "Replace {{$contact.name}} text", 'Selection replaced');
```

---

## 🐛 Common Issues

### Issue 1: Wrong Expression Format

**Symptom:** Expression doesn't work in n8n.

**Cause:** Used `.body` for node output or missing `.body` for webhook.

**Debug:**

```typescript
console.log('Field group:', field.group);
console.log('Expression:', expression);

// Webhook should have .body
if (field.group === 'inboundWebhook') {
  console.assert(expression.includes('.body.'), 'Missing .body');
}

// Node output should NOT have .body
if (field.group !== 'inboundWebhook') {
  console.assert(!expression.includes('.body.'), 'Should not have .body');
}
```

### Issue 2: Cursor Position Lost

**Symptom:** Cursor jumps to beginning/end after insertion.

**Fix:** Use `setTimeout` to restore cursor after React re-render:

```typescript
setTimeout(() => {
  inputRef.focus();
  inputRef.setSelectionRange(newPosition, newPosition);
}, 0);
```

### Issue 3: Missing sourceNodeName

**Symptom:** Expression has `undefined` in node reference.

**Debug:**

```typescript
console.log('Field sourceNodeName:', field.sourceNodeName);
console.assert(field.sourceNodeName, 'sourceNodeName required');
```

**Fix:** Ensure sourceNodeName added when loading fields.

---

## 🔗 Related Documentation

- **[../patterns/webhook-fields.md](../patterns/webhook-fields.md)** - Webhook field extraction
- **[../patterns/node-output-fields.md](../patterns/node-output-fields.md)** - Node output discovery
- **[../examples/complete-mapping-example.md](../examples/complete-mapping-example.md)** - End-to-end example
- **[../README.md](../README.md)** - System overview
- **[../../transformationSystem/helpers/expression-helpers-reference.md](../../transformationSystem/helpers/expression-helpers-reference.md)** - Expression utilities

---

**File Locations:**

- **Field Insertion:** `NodeConfigPanel/NodeParameterRenderer.tsx:391-425`
- **Contact Insertion:** `NodeParameterRenderer.tsx:427-449`
- **Dropdown Component:** `NodeConfigPanel/FieldGroupDropdown.tsx:12-108`
- **Field Grouping:** `frontend/lib/fieldGroupConfig.ts:53-99`
