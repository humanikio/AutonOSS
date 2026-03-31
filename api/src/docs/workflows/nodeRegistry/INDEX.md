# Node Registry Documentation - Index

## 🚀 Quick Start

**New to Node Registry?** Start here:
1. Read [README.md](./README.md) - System overview and architecture
2. Review [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Keep open while coding
3. Study [Complete Example](./examples/complete-node-example.md) - Real node implementation

**Creating a new node?**
1. Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for code templates
2. Use decision tree to pick node type (trigger, action, condition)
3. Copy-paste relevant node config template
4. Add to registry index.ts

**Debugging a node config issue?**
1. Check "Common Mistakes" in [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
2. Verify node is registered in index.ts
3. Check transformation method matches
4. Refer to pattern docs for troubleshooting

---

## 📚 Documentation Structure

### Core Documentation
- **[README.md](./README.md)** - System overview, architecture, node lifecycle
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - One-page cheat sheet (keep open!)

### Pattern Documentation (Deep Dives)

#### Critical Patterns (Read These First!)

1. **[Trigger Nodes](./patterns/trigger-nodes.md)**
   - Problem: How to create event-driven workflow triggers
   - Solution: Trigger node + subscription creation
   - When: SMS received, phone call completed, calendar events
   - Examples: smsReceivedTrigger, phoneCallCompletedTrigger

2. **[Action Nodes](./patterns/action-nodes.md)**
   - Pattern A: API-backed actions (transformation to HTTP Request)
   - Pattern B: Native n8n nodes (direct pass-through)
   - When: CRUD operations, data transformations
   - Examples: createContact, updateContact, wait, if

3. **[Load Options](./patterns/load-options.md)** ⚠️ CRITICAL FOR DROPDOWNS
   - Problem: Dynamic dropdown options from API
   - Solution: loadOptionsMethod + response mapping
   - When: Tag selector, field selector, workflow selector
   - Examples: Tag dropdowns, custom field dropdowns

### Reference Documentation

- **[Node Config API](./helpers/node-config-api.md)**
  - Complete INodeTypeDescription interface reference
  - All property types and options
  - _pulseline metadata fields
  - Validation rules

### Examples

- **[Complete Node Example](./examples/complete-node-example.md)**
  - Real-world createContact node
  - Config → Registry → Transformation → UI
  - All patterns in one place
  - Complete lifecycle walkthrough

---

## 🔍 Find What You Need

### By Use Case

| I need to... | Read this... |
|-------------|--------------|
| Create trigger for event | [Trigger Nodes](./patterns/trigger-nodes.md) |
| Create action with API call | [Action Nodes](./patterns/action-nodes.md) |
| Add dynamic dropdown | [Load Options](./patterns/load-options.md) |
| Add fixedCollection fields | [Action Nodes](./patterns/action-nodes.md) + [QUICK-REFERENCE](./QUICK-REFERENCE.md) |
| See complete example | [Complete Example](./examples/complete-node-example.md) |
| Quick code template | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) |
| Interface reference | [Node Config API](./helpers/node-config-api.md) |

### By Error Message

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| "Node type X not found in registry" | Not registered in index.ts | [README.md](./README.md) - Registration |
| "Transformation method not found" | Wrong transformationMethod name | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Methods list |
| "loadOptionsMethod failed" | Wrong endpoint or mapping | [Load Options](./patterns/load-options.md) |
| "Missing required parameter" | Missing required: true | [Node Config API](./helpers/node-config-api.md) |
| Dropdown shows no options | loadOptionsMethod not called | [Load Options](./patterns/load-options.md) |

### By Node Type

| Node Type | Config Files | Pattern Doc |
|-----------|--------------|-------------|
| Trigger Nodes | nodes/trigger/*.config.ts | [Trigger Nodes](./patterns/trigger-nodes.md) |
| Action Nodes | nodes/pulseline/*.config.ts, nodes/sms/*.config.ts | [Action Nodes](./patterns/action-nodes.md) |
| Condition Nodes | nodes/condition/*.config.ts | [Action Nodes](./patterns/action-nodes.md) |
| Native Nodes | nodes/action/wait.config.ts, nodes/condition/if.config.ts | [Action Nodes](./patterns/action-nodes.md) |

---

## 📖 Reading Order

### For New Developers
1. README.md (overview)
2. QUICK-REFERENCE.md (keep open)
3. Complete Example (see it all together)
4. Pattern docs as needed

### For Experienced Developers
1. QUICK-REFERENCE.md (quick refresh)
2. Specific pattern doc when implementing
3. Node Config API reference when needed

### When Debugging
1. QUICK-REFERENCE.md → Common Mistakes
2. Specific pattern doc → Troubleshooting section
3. Complete Example → Compare with your code

---

## 🎯 Core Competencies

After reading this documentation, you should be able to:

✅ **Create Trigger Nodes**
- Define event subscription triggers
- Map event payload to success response
- Auto-create subscriptions on workflow save

✅ **Create Action Nodes**
- Define transformation method
- Configure API endpoint and auth
- Add parameters with proper types
- Use fixedCollection for dynamic fields
- Add loadOptionsMethod for dropdowns

✅ **Register Nodes**
- Import and add to registry
- Categorize correctly (trigger/action/condition)
- Test node appears in UI
- Validate node config

✅ **Use Load Options**
- Configure endpoint and mapping
- Handle nested response data
- Add to _pulseline.loadOptionsMethods
- Link to parameter typeOptions

✅ **Never Make These Mistakes**
- Forget to register node in index.ts
- Wrong transformationMethod name
- Missing required fields
- Wrong loadOptionsMethod endpoint
- Incorrect response mapping fields

---

## 🛠️ Tools & Utilities

### Registry Service
**Location:** `workflows/services/nodeRegistry/index.ts`

Methods:
- `getAllNodes()` - Get all registered nodes (for UI)
- `getNodeConfig(nodeName)` - Get full config by name
- `getNodesByCategory(category)` - Filter by trigger/action/condition
- `hasNode(nodeName)` - Check if node exists
- `createNodeInstance(nodeName)` - Create default node instance
- `validateNode(node)` - Validate node against config

### Node Schemas
**Location:** `workflows/services/nodeRegistry/nodes/`

Categories:
- `trigger/` - Event-driven trigger nodes (no inputs)
- `action/` - Action and transformation nodes
- `condition/` - Conditional routing nodes (multiple outputs)
- `pulseline/` - Custom Pulseline business logic nodes
- `sms/` - SMS and communication nodes
- `phone/` - Phone call nodes
- `opportunities/` - Opportunity management nodes
- `adapters/` - Invisible adapter nodes for field resolution

---

## 📝 Contributing

### Adding a New Node

1. Create config file in appropriate category folder
2. Define INodeTypeDescription with all fields
3. Add _pulseline metadata (transformationMethod, apiEndpoint, etc.)
4. Define properties array with parameters
5. Import in index.ts
6. Add to nodeConfigs object
7. Test in frontend
8. Implement transformation method (if custom)

### Adding Documentation

1. Follow existing format
2. Include problem statement
3. Show ❌ wrong and ✅ correct examples
4. Add file locations with line numbers
5. Include testing examples
6. Update this index

---

## 🔗 Related Documentation

- **Transformation System:** [../transformationSystem/](../transformationSystem/) - How nodes transform to n8n
- **Trigger Subscriptions:** [../triggerSubscriptions/](../triggerSubscriptions/) - How triggers execute workflows
- **Field Mapping:** [../fieldMapping/](../fieldMapping/) - How fields become available for expressions

---

## 📞 Getting Help

1. Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for common solutions
2. Search pattern docs for your use case
3. Compare with [Complete Example](./examples/complete-node-example.md)
4. Check node categorization in index.ts
5. Ask team for review

---

## ✅ Documentation Checklist

Use this when implementing a new node:

- [ ] Read relevant pattern doc (trigger/action)
- [ ] Copied config template from QUICK-REFERENCE
- [ ] All required fields defined
- [ ] transformationMethod matches transformation file name
- [ ] apiEndpoint and httpMethod correct (if API-backed)
- [ ] loadOptionsMethod configured correctly (if has dropdowns)
- [ ] fixedCollection configured correctly (if dynamic fields)
- [ ] Added to index.ts registry
- [ ] Tested node appears in frontend
- [ ] Tested all parameters work
- [ ] Reviewed against common mistakes

---

**Last Updated:** January 2025
**Version:** 1.0
