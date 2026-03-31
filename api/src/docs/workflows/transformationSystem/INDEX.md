# Transformation System Documentation - Index

## 🚀 Quick Start

**New to transformations?** Start here:
1. Read [README.md](./README.md) - System overview
2. Review [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Keep open while coding
3. Study [Complete Example](./examples/complete-transformation-example.md) - Real implementation

**Implementing a transformation?**
1. Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for code templates
2. Use decision trees to pick the right pattern
3. Copy-paste relevant code examples

**Debugging an issue?**
1. Check "Common Mistakes" in [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
2. Enable logging (see debugging section)
3. Refer to pattern docs for troubleshooting

---

## 📚 Documentation Structure

### Core Documentation
- **[README.md](./README.md)** - System overview, architecture, quick start
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - One-page cheat sheet (keep open!)

### Pattern Documentation (Deep Dives)

#### Critical Patterns (Read These First!)
1. **[URL Construction](./patterns/01-url-construction.md)** ⚠️ MOST COMMON BUG
   - Problem: Static string vs expression concatenation
   - Solution: Regex parsing + n8n expression building
   - When: Any endpoint with `{{$parameter["xxx"]}}`
   - Examples: contact_addTag, contact_update

2. **[Body Fields](./patterns/02-body-fields.md)**
   - Pattern A: Pre-defined fields (known names)
   - Pattern B: User-defined fields (fixedCollection)
   - When: POST/PUT requests with body data
   - Examples: contact_create, contact_update

3. **[fixedCollection](./patterns/03-fixed-collection.md)**
   - Pattern A: Build object expression (nested)
   - Pattern B: Flatten to array (root level)
   - When: User provides field name + value pairs
   - Examples: Trigger workflow payload, contact custom fields

#### Advanced Patterns
4. **[Expression Handling](./patterns/04-expression-handling.md)**
   - Detect: `isExpression()`
   - Unwrap: `unwrapExpression()`
   - Normalize: `normalizeExpression()`
   - Build: `buildBodyParameters()`, `buildN8nObjectExpression()`

5. **[Authentication](./patterns/05-authentication.md)**
   - Stage 1: Placeholder injection (in transformation)
   - Stage 2: Real key replacement (post-compilation)
   - When: Any node calling Pulseline backend APIs

6. **[Conditional Output](./patterns/06-conditional-output.md)**
   - Multi-node transformation (HTTP + IF)
   - Internal edges and replacements
   - When: Routing based on response field
   - Example: contact_find

### Reference Documentation

- **[Expression Helpers API](./helpers/expression-helpers-reference.md)**
  - Complete function reference
  - Parameters, returns, examples
  - Use cases and patterns

### Examples

- **[Complete Transformation Example](./examples/complete-transformation-example.md)**
  - Real-world contact_addTag implementation
  - All patterns in one place
  - Complete call flow
  - Runtime evaluation walkthrough

---

## 🔍 Find What You Need

### By Use Case

| I need to... | Read this... |
|-------------|--------------|
| Build URLs with dynamic parameters | [URL Construction](./patterns/01-url-construction.md) |
| Send data in request body | [Body Fields](./patterns/02-body-fields.md) |
| Handle user-defined field names | [fixedCollection](./patterns/03-fixed-collection.md) |
| Detect/unwrap/normalize expressions | [Expression Handling](./patterns/04-expression-handling.md) |
| Add authentication to requests | [Authentication](./patterns/05-authentication.md) |
| Create conditional routing | [Conditional Output](./patterns/06-conditional-output.md) |
| See a complete example | [Complete Example](./examples/complete-transformation-example.md) |
| Quick code reference | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) |

### By Error Message

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| "Contact not found" with ID `{{$parameter["contactId"]}}` | URL using static string | [URL Construction](./patterns/01-url-construction.md) |
| "Invalid syntax" in n8n URL | Nested expressions | [Expression Handling](./patterns/04-expression-handling.md) |
| 401 Unauthorized | Placeholder not replaced | [Authentication](./patterns/05-authentication.md) |
| Field undefined in API request | Not filtering undefined values | [Body Fields](./patterns/02-body-fields.md) |
| Expression not evaluating | Missing `=` prefix | [Expression Handling](./patterns/04-expression-handling.md) |

### By Pattern Type

| Pattern | Files Using It |
|---------|---------------|
| URL Construction | contact_addTag, contact_removeTag, contact_update, contact_delete |
| Pre-defined Body Fields | contact_create, opportunity_create |
| fixedCollection Flatten | contact_create (custom fields) |
| fixedCollection Object | triggerWorkflow (payload) |
| Authentication | All backend API calls |
| Conditional Output | contact_find |

---

## 📖 Reading Order

### For New Developers
1. README.md (overview)
2. QUICK-REFERENCE.md (keep open)
3. Complete Example (see it all together)
4. Pattern docs as needed

### For Experienced Developers
1. QUICK-REFERENCE.md (quick refresh)
2. Specific pattern docs when implementing
3. Helper reference when needed

### When Debugging
1. QUICK-REFERENCE.md → Common Mistakes
2. Specific pattern doc → Troubleshooting section
3. Complete Example → Compare with your code

---

## 🎯 Core Competencies

After reading this documentation, you should be able to:

✅ **Implement URL Construction**
- Parse endpoint templates
- Detect expressions vs literals
- Unwrap and encode properly
- Build n8n expression syntax

✅ **Handle Body Parameters**
- Use pre-defined fields pattern
- Flatten fixedCollection when needed
- Build object expressions when needed
- Filter undefined values

✅ **Manage Expressions**
- Detect expressions with `isExpression()`
- Unwrap for embedding
- Normalize for storage
- Use helper functions correctly

✅ **Implement Authentication**
- Use placeholders in transformations
- Understand injection flow
- Support both header formats

✅ **Create Conditional Routing**
- Generate HTTP + IF node pairs
- Wire internal edges
- Map replacements correctly

✅ **Never Make These Mistakes**
- Static URL concatenation
- Nested expressions
- Hardcoded API keys
- Including undefined in body
- Wrong fixedCollection pattern

---

## 🛠️ Tools & Utilities

### Helper Functions
- `isExpression()` - Detect expressions
- `unwrapExpression()` - Remove wrappers
- `normalizeExpression()` - Add `=` prefix
- `buildBodyParameters()` - Create body array
- `buildN8nObjectExpression()` - Build nested object

**Location:** `n8n/transformationSystem/transformationMethodRegistry/utils/expressionHelpers.ts`

### Node Schemas
- `HttpRequest.schema.ts` - HTTP Request node types
- `If.schema.ts` - IF node types
- `Set.schema.ts` - Set node types
- `Wait.schema.ts` - Wait node types
- `Webhook.schema.ts` - Webhook node types

**Location:** `n8n/transformationSystem/transformationMethodRegistry/n8n/nodeSchemas/`

---

## 📝 Contributing

### Adding a New Transformation

1. Create transformation file in appropriate category
2. Implement `Transformation` interface
3. Use patterns from this documentation
4. Add to registry in `index.ts`
5. Create node config
6. Test thoroughly

### Adding Documentation

1. Follow existing format
2. Include problem statement
3. Show ❌ wrong and ✅ correct examples
4. Add file locations with line numbers
5. Include testing examples
6. Update this index

---

## 🔗 External Resources

- **n8n Documentation:** https://docs.n8n.io
- **n8n Expression Reference:** https://docs.n8n.io/code/expressions/
- **Transformation System README:** [../../n8n/transformationSystem/README.md](../../n8n/transformationSystem/README.md)
- **Node Registry:** [../../workflows/services/nodeRegistry/](../../workflows/services/nodeRegistry/)

---

## 📞 Getting Help

1. Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for common solutions
2. Search pattern docs for your use case
3. Compare with [Complete Example](./examples/complete-transformation-example.md)
4. Enable logging and debug
5. Ask team for review

---

## ✅ Documentation Checklist

Use this when implementing a new transformation:

- [ ] Read relevant pattern docs
- [ ] Copied code template from QUICK-REFERENCE
- [ ] Using expression helpers correctly
- [ ] URL construction uses expression concatenation (if has params)
- [ ] Body params filter undefined/null/empty
- [ ] Authentication uses placeholder
- [ ] fixedCollection uses correct pattern (if applicable)
- [ ] Expressions unwrapped before embedding
- [ ] Added logging for debugging
- [ ] Tested with real data
- [ ] Reviewed against common mistakes

---

**Last Updated:** November 2024
**Version:** 1.0
