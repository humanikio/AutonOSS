# Contact Orchestrator Examples

## Overview
This document shows how to use the tools and utilities to orchestrate contact operations with custom fields.

## Architecture

```
Tools (API Wrappers)
├── fetchAllCustomFields() - Fetches custom field definitions from Custom Fields API

Utilities (Business Logic)
├── ResolveCustomFields.verify() - Validates fields for CREATE/UPDATE
└── ResolveCustomFields.merge() - Merges fields for READ operations

Services (Orchestrators)
├── createContacts.ts - Uses verify()
├── ManageContacts.ts - Uses verify() and merge()
```

---

## Example 1: CREATE Contact (Write Operation)

**File**: `createContacts.ts`

```typescript
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';

export async function createContact(tenantId: string, payload: any) {
  // 1. Fetch custom field definitions
  const customFields = await fetchAllCustomFields(tenantId, 'contact');

  // 2. Verify payload fields against definitions
  const validatedFields = ResolveCustomFields.verify(
    payload,        // { name: "John", email: "john@example.com", custom_lead_score: 85 }
    customFields,   // Custom field definitions from API
    'contact'       // Entity scope
  );
  // validatedFields = { name: "John", email: "john@example.com", custom_lead_score: 85 }
  // Throws error if payload contains undefined fields

  // 3. Add required system fields
  const contactData = {
    id: uuidv4(),
    tenant_id: tenantId,
    created_at: Timestamp.now(),
    ...validatedFields  // Sparse custom fields
  };

  // 4. Save to Firestore (sparse storage)
  await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactData.id)
    .set(contactData);

  return contactData;
}
```

**Key Points:**
- Only validated fields are saved (sparse storage)
- Invalid field names throw errors
- System fields (id, tenant_id, created_at) always added

---

## Example 2: UPDATE Contact (Write Operation)

**File**: `ManageContacts.ts`

```typescript
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';

export async function updateContact(
  tenantId: string,
  contactId: string,
  updates: Record<string, any>
) {
  // 1. Fetch custom field definitions
  const customFields = await fetchAllCustomFields(tenantId, 'contact');

  // 2. Verify update fields
  const validatedUpdates = ResolveCustomFields.verify(
    updates,        // { email: "newemail@example.com", custom_lead_score: 90 }
    customFields,
    'contact'
  );

  // 3. Add updated_at timestamp
  const updateData = {
    ...validatedUpdates,
    updated_at: Timestamp.now()
  };

  // 4. Update in Firestore (sparse - only changed fields)
  await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .update(updateData);

  return updateData;
}
```

**Key Points:**
- Only provided fields are validated and updated
- Sparse updates - unchanged fields not touched
- Invalid field names throw errors

---

## Example 3: GET Contact (Read Operation)

**File**: `ManageContacts.ts`

```typescript
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';

export async function getContact(tenantId: string, contactId: string) {
  // 1. Fetch sparse contact data from Firestore
  const contactDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .doc(contactId)
    .get();

  if (!contactDoc.exists) {
    throw new Error('Contact not found');
  }

  const contactData = contactDoc.data();
  // { id: "uuid", tenant_id: "tenant1", name: "John", custom_lead_score: 85 }
  // Note: email is NOT in document (sparse storage)

  // 2. Fetch phone from contact_addresses (if needed)
  const addressQuery = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contact_addresses')
    .where('contact_id', '==', contactId)
    .where('channel', '==', 'SMS')
    .where('is_primary', '==', true)
    .limit(1)
    .get();

  let phoneNumber = undefined;
  if (!addressQuery.empty) {
    phoneNumber = addressQuery.docs[0].data().address_norm;
  }

  // Merge phoneNumber into contact data
  const contactWithPhone = {
    ...contactData,
    phoneNumber
  };

  // 3. Fetch custom field definitions
  const customFields = await fetchAllCustomFields(tenantId, 'contact');

  // 4. Merge to get ALL possible fields (with values or undefined)
  const mergedFields = ResolveCustomFields.merge(
    contactWithPhone,   // Sparse contact data
    customFields,       // Custom field definitions
    'contact'
  );
  // Returns:
  // [
  //   { name: "id", value: "uuid", isSystemField: true, ... },
  //   { name: "name", value: "John", isSystemField: true, ... },
  //   { name: "email", value: undefined, isSystemField: true, ... },
  //   { name: "phoneNumber", value: "+1234567890", isSystemField: true, ... },
  //   { name: "lead_score", value: 85, isSystemField: false, ... },
  //   { name: "linkedin_url", value: undefined, isSystemField: false, ... }
  // ]

  // 5. Return complete field list for frontend
  return {
    contactId,
    fields: mergedFields
  };
}
```

**Key Points:**
- Returns ALL possible fields (populated + unpopulated)
- Frontend gets complete field list with values or undefined
- phoneNumber merged from external collection before merge

---

## Example 4: LIST Contacts (Read Operation)

**File**: `ManageContacts.ts`

```typescript
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';

export async function getAllContacts(tenantId: string) {
  // 1. Fetch all contacts (sparse data)
  const contactsSnapshot = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('contacts')
    .get();

  const contactsData = contactsSnapshot.docs.map(doc => doc.data());

  // 2. Fetch custom field definitions (once for all contacts)
  const customFields = await fetchAllCustomFields(tenantId, 'contact');

  // 3. Merge each contact with field definitions
  const contactsWithFields = contactsData.map((contactData) => {
    const mergedFields = ResolveCustomFields.merge(
      contactData,
      customFields,
      'contact'
    );

    return {
      contactId: contactData.id,
      fields: mergedFields
    };
  });

  return contactsWithFields;
}
```

**Key Points:**
- Fetch custom fields once, reuse for all contacts
- Each contact gets complete field list
- Efficient for list views

---

## Example 5: Error Handling

```typescript
import { fetchAllCustomFields } from '../tools';
import { ResolveCustomFields } from '../utilities';

export async function createContactWithValidation(
  tenantId: string,
  payload: any
) {
  try {
    // Fetch custom fields
    const customFields = await fetchAllCustomFields(tenantId, 'contact');

    // This will throw if invalid fields provided
    const validatedFields = ResolveCustomFields.verify(
      payload,
      customFields,
      'contact'
    );

    // ... save to Firestore
  } catch (error) {
    if (error.message.includes('Invalid field(s) provided')) {
      // Handle validation error
      return {
        success: false,
        error: error.message
      };
    }
    throw error; // Re-throw other errors
  }
}
```

---

## Utility Methods Summary

### `ResolveCustomFields.verify(payload, customFields, entityScope)`
- **Use Case**: CREATE and UPDATE operations
- **Purpose**: Validate incoming fields
- **Returns**: Validated sparse object
- **Throws**: Error if undefined field provided

### `ResolveCustomFields.merge(contactData, customFields, entityScope)`
- **Use Case**: GET operations
- **Purpose**: Build complete field list with values
- **Returns**: Array of all fields (populated or undefined)
- **Never Throws**: Always returns complete list

### `ResolveCustomFields.getAllDefinitions(customFields, entityScope)`
- **Use Case**: Building field picker UIs
- **Purpose**: Get list of all field definitions
- **Returns**: Array of field definitions (name, displayName, type, isSystemField)

---

## Data Flow Summary

### Write Flow (CREATE/UPDATE)
```
Payload → verify() → Valid Fields → Add System Fields → Save Sparse
```

### Read Flow (GET)
```
Fetch Sparse → Merge External (phone) → merge() → Complete Field List → Return
```

### Field Sources
```
System Fields (Registry) + Custom Fields (API) = All Possible Fields
```
