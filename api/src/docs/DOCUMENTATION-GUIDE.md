# Documentation Guide for AI Agents

> How to use AI agents like Claude to create high-quality, practical documentation

---

## Philosophy

**Goal:** Documentation that developers actually use, not reference manuals that gather dust.

**Principles:**
1. **Developer-first** - Focus on "how do I extend this?" not "what is this?"
2. **Pattern-based** - Document patterns so devs never have to think about them again
3. **Quick reference** - Every system needs a quick-start guide with copy/paste examples
4. **Practical examples** - Real code from the codebase, not hypothetical examples
5. **Lean and focused** - ~5-11 docs per system, not 50

---

## Documentation Structure

### Standard System Documentation (5-11 docs)

Every system follows this template:

```
/docs/workflows/{systemName}/
  ├── INDEX.md                    # Navigation hub
  ├── README.md                   # Complete system overview
  ├── QUICK-REFERENCE.md         # Developer quick-start (MOST IMPORTANT)
  ├── patterns/                   # 2-4 pattern docs
  │   ├── {pattern-1}.md
  │   ├── {pattern-2}.md
  │   └── {pattern-3}.md
  ├── helpers/                    # 0-2 helper/reference docs
  │   └── {helper}.md
  └── examples/                   # 1 complete example
      └── complete-{name}-example.md
```

**Total:** 5-11 docs per system

---

## Core Process for AI Documentation

### Phase 1: Intensive Research (30-60 minutes)

**Goal:** Understand the system completely before writing anything.

**Steps:**

1. **Map the codebase structure**
   ```
   Ask AI agent:
   "Find all files related to {system_name}"

   AI should:
   - Use Glob to find relevant files
   - Identify core files vs supporting files
   - Map file dependencies
   ```

2. **Read critical files**
   ```
   Ask AI agent:
   "Read the main implementation files for {system_name}"

   AI should read:
   - Type definitions (types.ts)
   - Main orchestrator/entry point
   - Core service functions
   - Integration points with other systems
   ```

3. **Identify extension points**
   ```
   Ask AI agent:
   "What are the key extension points in {system_name}?"

   AI should identify:
   - Where developers add new functionality
   - Required interfaces/types
   - Registration patterns
   - Configuration locations
   ```

4. **Understand integration with other systems**
   ```
   Ask AI agent:
   "How does {system_name} integrate with other systems?"

   AI should map:
   - Input/output data flow
   - API calls to other systems
   - Shared data structures
   - Event triggers
   ```

**Research Checklist:**
- [ ] Read all type definitions
- [ ] Read main entry point/orchestrator
- [ ] Read 3-5 core service functions
- [ ] Identify all extension points
- [ ] Map integration with other systems
- [ ] Find existing examples in codebase

**Output:** AI agent should be able to answer "how do I extend this?" without reading docs.

---

### Phase 2: Plan Documentation Structure (10-15 minutes)

**Goal:** Define the 5-11 docs that will cover the system.

**Template:**

```markdown
System: {System Name}

Core Docs (3):
1. INDEX.md - Navigation hub
2. README.md - Complete overview
3. QUICK-REFERENCE.md - Developer quick-start

Pattern Docs (2-4):
4. patterns/{pattern-1}.md - {One sentence description}
5. patterns/{pattern-2}.md - {One sentence description}
6. patterns/{pattern-3}.md - {One sentence description}

Helper Docs (0-2):
7. helpers/{helper}.md - {One sentence description}

Example Docs (1):
8. examples/complete-{name}-example.md - {One sentence description}

Total: {N} docs
```

**Ask AI agent:**
```
"Based on your research, plan the documentation structure for {system_name}.
Follow the 5-11 doc template. Focus on extension points and patterns."
```

**Validate plan:**
- [ ] Does QUICK-REFERENCE.md cover "how to extend"?
- [ ] Does each pattern doc cover ONE specific pattern?
- [ ] Is there exactly ONE complete example?
- [ ] Are there 5-11 docs total? (Not 20+)

---

### Phase 3: Write Documentation in Batches (2-3 hours)

**Goal:** Write docs in batches of 2-3, maintaining quality and consistency.

#### Batch 1: Core Docs (INDEX, README, QUICK-REFERENCE)

**Ask AI agent:**
```
"Write the core documentation for {system_name}:
1. INDEX.md - Navigation hub with use case tables
2. README.md - Complete system overview with architecture
3. QUICK-REFERENCE.md - Developer quick-start with copy/paste examples

Use the same style as the existing {reference_system} documentation."
```

**QUICK-REFERENCE.md Requirements:**
- **"How to Extend" checklist** - Step-by-step with file locations
- **Code templates** - Copy/paste ready code
- **Common patterns** - 3-5 most common use cases
- **Testing checklist** - How to test new additions

**Quality Check:**
- [ ] INDEX has use case tables and error finder
- [ ] README has complete architecture diagram
- [ ] QUICK-REFERENCE has "how to extend" checklist
- [ ] All file locations include line numbers (e.g., `file.ts:23-45`)
- [ ] All code examples are from actual codebase

#### Batch 2: Pattern Docs (2-3 patterns)

**Ask AI agent:**
```
"Write pattern documentation for {system_name}:
1. patterns/{pattern-1}.md - {description}
2. patterns/{pattern-2}.md - {description}
3. patterns/{pattern-3}.md - {description}

Each pattern doc should:
- Explain ONE specific pattern
- Show complete code examples from codebase
- Include step-by-step implementation guide
- Reference related patterns"
```

**Pattern Doc Template:**
```markdown
# Pattern: {Pattern Name}

> {One sentence description}

## Overview
{When to use this pattern}

## Implementation
{Step-by-step with code}

## Complete Example
{Real example from codebase}

## Related Patterns
{Links to other pattern docs}
```

**Quality Check:**
- [ ] Each doc covers ONE pattern only
- [ ] Code examples are from actual codebase
- [ ] Step-by-step implementation included
- [ ] Cross-references to related patterns

#### Batch 3: Helpers & Examples (1-2 docs)

**Ask AI agent:**
```
"Write helper and example documentation for {system_name}:
1. helpers/{helper}.md - API reference or debugging guide
2. examples/complete-{name}-example.md - End-to-end example

The example should show:
- Complete user journey from start to finish
- Integration with other systems
- Common pitfalls and how to avoid them"
```

**Complete Example Requirements:**
- Start from user's perspective
- Show every step with code
- Include data flow diagrams
- Show integration points
- Timeline of events

**Quality Check:**
- [ ] Helper doc is reference material (not tutorial)
- [ ] Example shows complete end-to-end flow
- [ ] Example includes timeline/sequence diagram
- [ ] Example shows integration with other systems

---

## Writing Guidelines for AI Agents

### 1. Use Active Voice and Direct Language

**Bad:**
```
The transformation system is used to convert ReactFlow workflows to n8n format.
```

**Good:**
```
The transformation system converts ReactFlow workflows to n8n format.
```

---

### 2. Focus on "How" Not "What"

**Bad:**
```
The Node Registry is a system that stores node configurations.
```

**Good:**
```
The Node Registry stores node configurations. To add a new node:
1. Create config file: `nodeRegistry/nodes/{category}/{name}.config.ts`
2. Export node config with INodeTypeDescription interface
3. Register in `nodeRegistry/index.ts`
```

---

### 3. Include File Locations with Line Numbers

**Bad:**
```
The transformation orchestrator handles the complete flow.
```

**Good:**
```
The transformation orchestrator handles the complete flow.

**File:** `transformationSystem/orchestrators/transformationOrchrestrator.ts:60-150`
```

---

### 4. Use Real Code from Codebase

**Bad:**
```typescript
// Example transformation method
export const myMethod = (node) => {
  return {
    type: 'someType',
    parameters: {}
  };
};
```

**Good:**
```typescript
// File: transformationMethodRegistry/methods/twilio_send_sms.ts:15-42
export const twilio_send_sms: TransformationMethod = async (node, ctx) => {
  const resolvedParameters = await resolveCustomFields(
    node.data.parameters,
    ctx.tenantId,
    ctx.workflowId
  );

  return {
    name: node.id,
    type: 'n8n-nodes-base.twilio',
    typeVersion: 1,
    position: [node.position.x, node.position.y],
    parameters: {
      resource: 'sms',
      operation: 'send',
      to: resolvedParameters.to,
      body: resolvedParameters.body
    }
  };
};
```

---

### 5. Create Visual Diagrams with ASCII

**Good:**
```
┌─────────────────────────────────────────┐
│           USER ACTION                   │
│  Creates workflow in frontend           │
└──────────────┬──────────────────────────┘
               │
               ↓ POST /api/workflows/:id
┌─────────────────────────────────────────┐
│         BACKEND API                     │
│  1. Save to Firestore                   │
│  2. Transform to n8n                    │
│  3. Deploy to n8n server                │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│         N8N SERVER                      │
│  Workflow activated                     │
└─────────────────────────────────────────┘
```

---

### 6. Provide Complete Context

**Bad:**
```
Call the transform function.
```

**Good:**
```
Call the transform function from the transformation orchestrator:

**File:** `transformationSystem/orchestrators/transformationOrchrestrator.ts:60-150`

```typescript
const transformResult = await transformWorkflow(
  tenantId,
  workflowId,
  apiKey,
  {
    rawReactFlow: {
      name: workflowName,
      nodes: reactFlowNodes,
      edges: reactFlowEdges
    }
  }
);
```

This triggers three phases:
1. **Planning** - Analyzes ReactFlow and creates build plan
2. **Compilation** - Executes transformation methods
3. **Validation** - Validates n8n workflow (TODO)
```

---

### 7. Cross-Reference Related Docs

**At the end of every doc:**
```markdown
## Related Docs

- **[System Overview](./README.md)** - Complete architecture
- **[Quick Reference](./QUICK-REFERENCE.md)** - Developer quick-start
- **[Pattern: Frontend Integration](./patterns/frontend-backend.md)** - Frontend data flow
- **[Trigger Subscriptions](../triggerSubscriptions/README.md)** - Related system
```

---

## Prompting Strategy

### Initial Research Prompt

```
I need to document the {system_name} in our codebase.

Please:
1. Find all files related to {system_name}
2. Read the core implementation files
3. Identify the main extension points
4. Map how it integrates with other systems

Focus on understanding how developers would extend this system.
After your research, I want you to be able to answer:
- How do I add a new {component}?
- What files do I need to modify?
- What interfaces/types do I need to implement?
```

### Planning Prompt

```
Based on your research of {system_name}, create a documentation plan.

Follow this structure:
- 3 core docs (INDEX, README, QUICK-REFERENCE)
- 2-4 pattern docs (one per major pattern)
- 0-2 helper docs (API reference, debugging)
- 1 complete example

The QUICK-REFERENCE.md MUST include:
- "How to Extend" checklist with file locations
- Copy/paste code templates
- Common patterns with examples

Total docs: 5-11 (keep it lean)

Use the same style as {reference_system_docs}.
```

### Writing Prompt (Batch 1)

```
Write the core documentation for {system_name}:

1. INDEX.md
   - Navigation hub
   - Use case table ("I want to..." → Document)
   - Error message finder
   - Quick links to common tasks

2. README.md
   - Complete system overview
   - Architecture diagram (ASCII art)
   - Core concepts explained
   - Integration points
   - API reference

3. QUICK-REFERENCE.md
   - "How to Extend {System}" checklist
   - Code templates (copy/paste ready)
   - Common patterns (3-5 most frequent use cases)
   - Testing checklist
   - Troubleshooting quick tips

Use actual code from the codebase (not hypothetical examples).
Include file locations with line numbers.
Follow the style of {reference_docs}.
```

### Writing Prompt (Batch 2)

```
Write pattern documentation for {system_name}:

1. patterns/{pattern-1}.md - {description}
2. patterns/{pattern-2}.md - {description}
3. patterns/{pattern-3}.md - {description}

Each pattern doc should:
- Explain ONE specific pattern
- Show when to use it
- Provide step-by-step implementation
- Include complete code example from codebase
- Cross-reference related patterns

Use the same format as {reference_pattern_doc}.
```

### Writing Prompt (Batch 3)

```
Write helper and example documentation for {system_name}:

1. helpers/{helper}.md
   - API reference OR debugging guide
   - Complete function signatures
   - Parameter descriptions
   - Return types
   - Usage examples

2. examples/complete-{name}-example.md
   - End-to-end user journey
   - Every step with code
   - Data flow diagrams
   - Timeline of events
   - Integration with other systems

The example should trace a real-world scenario from start to finish.
Use actual code from the codebase.
```

---

## Quality Checklist

### Before Finalizing Documentation

**Core Docs:**
- [ ] INDEX.md has use case table and error finder
- [ ] README.md has complete architecture diagram
- [ ] README.md explains all core concepts
- [ ] QUICK-REFERENCE.md has "How to Extend" checklist
- [ ] QUICK-REFERENCE.md has copy/paste code templates
- [ ] All file locations include line numbers

**Pattern Docs:**
- [ ] Each doc covers ONE pattern only
- [ ] Step-by-step implementation included
- [ ] Code examples from actual codebase
- [ ] Cross-references to related patterns

**Example Docs:**
- [ ] Shows complete end-to-end flow
- [ ] Includes timeline/sequence diagram
- [ ] Shows integration points
- [ ] Uses real code from codebase

**Overall:**
- [ ] Total docs: 5-11 per system
- [ ] No hypothetical code examples
- [ ] Every code block has file location
- [ ] Cross-references between related docs
- [ ] Consistent formatting and style

---

## Example: Documenting a New System

### Step 1: Research (AI Agent)

**Prompt:**
```
I need to document our "Workflow Validation System".

Please research the system:
1. Find all files in /workflows/validation/
2. Read core implementation files
3. Identify how developers add new validation rules
4. Map integration with transformation system

After research, answer:
- How do I add a new validation rule?
- What files do I modify?
- What interfaces do I implement?
```

### Step 2: Plan (AI Agent)

**Prompt:**
```
Based on your research, plan documentation for Workflow Validation System.

Structure:
- 3 core docs (INDEX, README, QUICK-REFERENCE)
- 2-3 pattern docs
- 1 example doc

Focus on:
- How to add custom validation rules
- How to integrate with transformation system
- Common validation patterns

Follow the style of Transformation System docs.
```

**AI Output:**
```markdown
Workflow Validation System - 7 docs

Core Docs (3):
1. INDEX.md - Navigation hub
2. README.md - Complete validation architecture
3. QUICK-REFERENCE.md - How to add validation rules

Pattern Docs (3):
4. patterns/schema-validation.md - JSON schema validation pattern
5. patterns/custom-validators.md - Custom validation functions
6. patterns/async-validation.md - Async validation (API calls)

Example Docs (1):
7. examples/complete-validation-example.md - SMS workflow validation
```

### Step 3: Write Core Docs (AI Agent)

**Prompt:**
```
Write core docs for Workflow Validation System:
1. INDEX.md
2. README.md
3. QUICK-REFERENCE.md

QUICK-REFERENCE must have:
- "How to Add Validation Rule" checklist
- Code template for custom validator
- Common validation patterns

Use Transformation System docs as style reference.
```

### Step 4: Write Pattern Docs (AI Agent)

**Prompt:**
```
Write pattern docs for Workflow Validation System:
1. patterns/schema-validation.md
2. patterns/custom-validators.md
3. patterns/async-validation.md

Each doc: ONE pattern, step-by-step, real code examples.
```

### Step 5: Write Example Doc (AI Agent)

**Prompt:**
```
Write complete example for Workflow Validation System:

examples/complete-validation-example.md

Show end-to-end:
1. User creates workflow with invalid config
2. Validation system detects error
3. Returns error to frontend
4. User fixes error
5. Validation passes
6. Workflow deploys

Include timeline, data flow diagram, integration points.
```

---

## Tips for Success

### 1. Reference Existing Docs

Always give AI a reference:
```
"Use the same style as /docs/workflows/transformationSystem/README.md"
```

This ensures consistency.

### 2. Work in Batches

Don't ask AI to write all 8 docs at once:
- Batch 1: Core docs (3)
- Batch 2: Pattern docs (2-3)
- Batch 3: Examples (1-2)

This maintains quality and allows course-correction.

### 3. Validate After Each Batch

After each batch, check:
- [ ] File locations correct?
- [ ] Code examples from real codebase?
- [ ] "How to extend" covered?
- [ ] Cross-references working?

### 4. Keep It Lean

If AI suggests 15+ docs, push back:
```
"That's too many. Consolidate to 5-8 docs.
Merge similar patterns into one doc."
```

Quality > quantity.

### 5. Emphasize Practical Examples

Tell AI:
```
"NO hypothetical examples.
ONLY use actual code from the codebase.
Include file locations with line numbers."
```

### 6. Request Diagrams

For complex flows:
```
"Include an ASCII art diagram showing the complete data flow"
```

Diagrams clarify integration points.

---

## Common Pitfalls

### ❌ Too Many Docs

**Problem:** AI creates 20+ documentation files.

**Solution:**
```
"Keep it to 5-11 docs total.
Merge similar topics.
One pattern per doc, not 10."
```

---

### ❌ Hypothetical Examples

**Problem:** Code examples are made up, not from codebase.

**Solution:**
```
"Use ONLY actual code from the codebase.
Read the implementation files first.
Include file locations with line numbers."
```

---

### ❌ Missing Extension Points

**Problem:** Docs explain what system does, not how to extend it.

**Solution:**
```
"Focus on extension points.
QUICK-REFERENCE must have 'How to Extend' checklist.
Show exactly what files to modify."
```

---

### ❌ Inconsistent Style

**Problem:** Each doc has different formatting.

**Solution:**
```
"Follow the exact style of {reference_doc}.
Use the same headings, structure, and formatting."
```

---

### ❌ Missing Cross-References

**Problem:** Docs don't link to related docs.

**Solution:**
```
"At the end of every doc, add 'Related Docs' section.
Link to related patterns and systems."
```

---

## Template Prompts

### Research Phase

```
Research the {system_name} system:

1. Find all files in {directory_path}
2. Read:
   - Type definitions
   - Main entry point/orchestrator
   - Core service functions (3-5)
   - Integration points

3. Identify:
   - How developers extend this system
   - Required interfaces/types
   - Configuration locations
   - Registration patterns

4. Answer:
   - How do I add a new {component}?
   - What files do I modify?
   - What interfaces do I implement?

Focus on practical extension, not theoretical concepts.
```

### Planning Phase

```
Plan documentation for {system_name}:

Structure:
- 3 core docs (INDEX, README, QUICK-REFERENCE)
- 2-4 pattern docs (one per major pattern)
- 0-2 helper docs
- 1 complete example

Total: 5-11 docs

QUICK-REFERENCE must include:
- "How to Extend {System}" checklist
- Copy/paste code templates
- Common patterns

Follow the style of {reference_system} documentation.
```

### Writing Phase (Batch 1)

```
Write core documentation for {system_name}:

1. INDEX.md - Navigation hub with use case table
2. README.md - Complete overview with architecture
3. QUICK-REFERENCE.md - Developer quick-start

Requirements:
- Use actual code from codebase
- Include file locations with line numbers
- QUICK-REFERENCE has "How to Extend" checklist
- Follow style of {reference_docs}

Write all 3 docs now.
```

### Writing Phase (Batch 2)

```
Write pattern documentation for {system_name}:

1. patterns/{pattern-1}.md
2. patterns/{pattern-2}.md
3. patterns/{pattern-3}.md

Each doc:
- ONE pattern only
- Step-by-step implementation
- Real code from codebase
- Cross-references to related patterns

Follow style of {reference_pattern_doc}.

Write all pattern docs now.
```

### Writing Phase (Batch 3)

```
Write example documentation for {system_name}:

1. examples/complete-{name}-example.md

Requirements:
- End-to-end user journey
- Every step with code
- Data flow diagram
- Timeline of events
- Integration with other systems

Use real code from codebase.
Follow style of {reference_example_doc}.

Write the example doc now.
```

---

## Success Criteria

Documentation is successful when:

1. **Developers can extend the system without asking questions**
   - "How to extend" checklist is clear
   - Code templates are copy/paste ready
   - File locations are accurate

2. **New team members can understand the system in 30 minutes**
   - README provides complete overview
   - Architecture diagram shows integration
   - Example shows end-to-end flow

3. **Troubleshooting is self-service**
   - Common issues documented
   - Debug steps provided
   - Solutions include code fixes

4. **Documentation stays maintainable**
   - 5-11 docs per system (not 50)
   - Clear structure and naming
   - Easy to update when code changes

---

## Final Checklist

Before marking documentation complete:

**Structure:**
- [ ] 5-11 docs total per system
- [ ] INDEX, README, QUICK-REFERENCE exist
- [ ] 2-4 pattern docs
- [ ] 1 complete example

**Content:**
- [ ] QUICK-REFERENCE has "How to Extend" checklist
- [ ] All code examples from actual codebase
- [ ] File locations include line numbers
- [ ] Cross-references between docs

**Quality:**
- [ ] No hypothetical examples
- [ ] Active voice, direct language
- [ ] Focus on "how" not "what"
- [ ] Diagrams for complex flows

**Usability:**
- [ ] Developer can extend system without asking
- [ ] New team member can understand in 30 minutes
- [ ] Troubleshooting is self-service
- [ ] Easy to maintain and update

---

## Conclusion

Good documentation is:
- **Practical** - Focuses on how to extend, not what it is
- **Lean** - 5-11 docs per system, not 50
- **Real** - Uses actual code from codebase
- **Referenced** - Cross-links to related docs
- **Maintained** - Easy to update when code changes

Use AI agents to accelerate creation, but always validate quality.

**Remember:** Documentation that developers don't use is worse than no documentation.
