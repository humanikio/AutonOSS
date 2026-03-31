# Custom Fields API

Multi-entity custom field management system for Pulseline.

## Overview

This module provides CRUD operations for managing custom field definitions that can be attached to various entities (contacts, opportunities, companies, etc.). Fields are tenant-scoped and support future expansion to multiple entity types.

## Firestore Structure

```
tenants/{tenantId}/
  └── customFields/{fieldId}
      ├── id: string (UUID)
      ├── tenantId: string
      ├── name: string (machine name, e.g., 'leadScore')
      ├── displayName: string (human-readable)
      ├── type: FieldType
      ├── entityScope: 'contact' | 'opportunity' | 'company' | 'deal'
      ├── group: string (optional, for UI grouping)
      ├── validation: FieldValidation
      ├── isSystemField: boolean
      ├── isDefault: boolean
      ├── order: number
      ├── createdAt: Timestamp
      ├── updatedAt: Timestamp
      └── createdBy: string (userId)
```

## API Endpoints

All endpoints require authentication via **Firebase JWT** or **API Key**.

### GET /api/customFields

Get all custom fields for tenant with optional filtering.

**Query Parameters:**
- `entityScope` (optional): Filter by entity ('contact', 'opportunity', etc.)
- `group` (optional): Filter by group ID
- `includeSystem` (optional): Include system fields (default: true)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "tenantId": "ten_abc",
      "name": "leadScore",
      "displayName": "Lead Score",
      "type": "number",
      "entityScope": "contact",
      "validation": { "min": 0, "max": 100 },
      "isSystemField": false,
      "order": 1,
      ...
    }
  ],
  "count": 1
}
```

### GET /api/customFields/:fieldId

Get single custom field by ID.

**Response:**
```json
{
  "success": true,
  "data": { /* FieldDefinition */ }
}
```

### GET /api/customFields/check-name/:name?entityScope=contact

Check if field name is available for a given entity scope.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "leadScore",
    "entityScope": "contact",
    "available": false
  }
}
```

### POST /api/customFields

Create new custom field.

**Body:**
```json
{
  "name": "leadScore",
  "displayName": "Lead Score",
  "description": "Sales qualification score",
  "type": "number",
  "entityScope": "contact",
  "group": "sales",
  "placeholder": "0-100",
  "validation": {
    "required": false,
    "min": 0,
    "max": 100
  },
  "order": 10
}
```

**Validation:**
- `name` must be lowercase alphanumeric with underscores only
- `name` must be unique per entity scope
- Cannot create system fields via API

**Response:**
```json
{
  "success": true,
  "data": { /* Created FieldDefinition */ },
  "message": "Custom field created successfully"
}
```

### PUT /api/customFields/:fieldId

Update custom field.

**Body:**
```json
{
  "displayName": "Updated Lead Score",
  "description": "New description",
  "validation": { "min": 0, "max": 200 }
}
```

**Restrictions:**
- Cannot modify `name`, `type`, or `entityScope`
- Cannot modify system fields

**Response:**
```json
{
  "success": true,
  "data": { /* Updated FieldDefinition */ },
  "message": "Custom field updated successfully"
}
```

### DELETE /api/customFields/:fieldId

Delete custom field.

**Restrictions:**
- Cannot delete system fields

**Response:**
```json
{
  "success": true,
  "message": "Custom field deleted successfully",
  "fieldId": "uuid-123"
}
```

## Field Types

- `string` - Text input
- `number` - Numeric input
- `boolean` - True/false
- `date` - Date picker
- `datetime` - Date and time picker
- `select` - Single choice dropdown
- `multiselect` - Multiple choice dropdown
- `email` - Email with validation
- `phone` - Phone number with validation
- `url` - URL with validation
- `textarea` - Long text input

## Usage Example

### Creating Contact Custom Fields

```typescript
// Create a lead score field
POST /api/customFields
{
  "name": "leadScore",
  "displayName": "Lead Score",
  "type": "number",
  "entityScope": "contact",
  "validation": { "min": 0, "max": 100 }
}

// Create an industry field
POST /api/customFields
{
  "name": "industry",
  "displayName": "Industry",
  "type": "select",
  "entityScope": "contact",
  "validation": {
    "options": [
      { "label": "Technology", "value": "tech" },
      { "label": "Healthcare", "value": "health" },
      { "label": "Finance", "value": "finance" }
    ]
  }
}

// Get all contact fields
GET /api/customFields?entityScope=contact
```

### Future Expansion

When adding opportunity custom fields:

```typescript
POST /api/customFields
{
  "name": "dealValue",
  "displayName": "Deal Value",
  "type": "number",
  "entityScope": "opportunity",  // ← Different scope
  "validation": { "min": 0 }
}
```

## Integration with Entities

### Contact API Integration

When fetching a contact, merge field definitions with contact data:

```typescript
// GET /api/contacts/:contactId
// Returns all defined fields (populated or null)
{
  "contactId": "con_123",
  "name": "John Doe",
  "email": "john@example.com",
  "leadScore": 85,        // Custom field with value
  "industry": "tech",     // Custom field with value
  "lastContact": null     // Custom field defined but not set
}
```

### Validation on Write

When updating entity, validate against field definitions:

```typescript
// POST /api/contacts/:contactId/manage
// Body: { "leadScore": 150 }
// ❌ Fails: leadScore max is 100

// Body: { "invalidField": "value" }
// ❌ Fails: invalidField not defined
```

## System Fields

System fields are pre-seeded on tenant creation and cannot be deleted or renamed.

Example contact system fields:
- `contactId` (string, required)
- `name` (string)
- `email` (email)
- `phoneNumber` (phone)
- `firstName` (string)
- `lastName` (string)

Mark fields as system when seeding:

```typescript
{
  name: 'email',
  displayName: 'Email Address',
  type: 'email',
  entityScope: 'contact',
  isSystemField: true,  // ← Cannot delete/rename
  isDefault: true       // ← Pre-populate on creation
}
```

## Authentication

This API supports dual authentication:

1. **Firebase JWT Token**
   ```bash
   Authorization: Bearer <firebase-id-token>
   ```

2. **API Key**
   ```bash
   Authorization: Bearer <api-key-id>.<api-key-secret>
   ```

Both methods automatically extract and set `req.tenantId` via the `authenticateEither` middleware.

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- `401` - Tenant ID not found (auth issue)
- `400` - Validation error (missing/invalid fields)
- `404` - Field not found
- `500` - Server error

## Field Groups

Field groups allow organizing custom fields into logical sections for better UX.

### GET /api/customFields/groups

Get all field groups for tenant.

**Query Parameters:**
- `entityScope` (optional): Filter by entity ('contact', 'opportunity', etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "tenantId": "ten_abc",
      "name": "sales_info",
      "displayName": "Sales Information",
      "description": "Sales-related fields",
      "entityScope": "contact",
      "order": 1,
      "isSystemGroup": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "count": 1
}
```

### POST /api/customFields/groups

Create new field group.

**Body:**
```json
{
  "name": "sales_info",
  "displayName": "Sales Information",
  "description": "Sales-related fields",
  "entityScope": "contact",
  "order": 1
}
```

**Validation:**
- `name` must be lowercase alphanumeric with underscores only
- `name` must be unique per entity scope
- Cannot create system groups via API

**Response:**
```json
{
  "success": true,
  "data": { /* Created FieldGroup */ },
  "message": "Field group created successfully"
}
```

### PUT /api/customFields/groups/:groupId

Update field group.

**Body:**
```json
{
  "displayName": "Updated Sales Info",
  "description": "New description",
  "order": 2
}
```

**Restrictions:**
- Cannot modify `name` or `entityScope`
- Cannot modify system groups

### DELETE /api/customFields/groups/:groupId

Delete field group with **automatic cleanup**.

**Behavior:**
1. Queries all fields using this group (by group name)
2. Removes group reference from all affected fields (sets `group` to empty string)
3. Deletes the group
4. Uses Firestore batch operations for atomicity (handles 500+ fields per batch)

**Restrictions:**
- Cannot delete system groups

**Example:**
```typescript
// BEFORE deletion:
// - Group "sales_info" exists
// - Fields: leadScore (group: "sales_info"), dealSize (group: "sales_info")

// DELETE /api/customFields/groups/uuid-123

// AFTER deletion:
// - Group "sales_info" deleted
// - leadScore (group: "")
// - dealSize (group: "")
// - Fields remain intact, just ungrouped
```

**Response:**
```json
{
  "success": true,
  "message": "Field group deleted successfully",
  "groupId": "uuid-123"
}
```

**Console Output:**
```
🗑️  Deleting field group uuid-123 for tenant ten_abc
🔍 Searching for fields using group "sales_info"...
📋 Found 2 field(s) using this group
🧹 Removing group reference from 2 field(s)...
   - Updating field: leadScore (Lead Score)
   - Updating field: dealSize (Deal Size)
💾 Committing 1 batch(es)...
   ✓ Batch 1/1 committed
✅ Field group "Sales Information" deleted successfully
   2 field(s) have been ungrouped
```
