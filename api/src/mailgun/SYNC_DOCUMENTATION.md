# Mailgun Domain Verification and Sync Documentation

## Overview

This document explains where Mailgun verification statuses are saved and how synchronization is maintained between Mailgun's API and our Firestore database.

## Data Storage Structure

### 1. Base Domain (`tenants/{tenantId}/domains/{domainId}`)

The base domain document tracks domain ownership and service connections:

```typescript
{
  domainId: string;                 // e.g., "mybusiness.com"
  tenantId: string;
  verification: {                   // DNS TXT verification for domain ownership
    method: 'dns-txt' | 'manual';
    status: 'pending' | 'verified' | 'failed';
    verificationToken: string;      // Random token
    verificationValue: string;      // Expected TXT value
    verifiedAt?: Date;
    lastCheckedAt?: Date;
  };
  connections: {
    mailgun: boolean;               // True if connected to Mailgun
  };
  dnsProvider?: string;             // Detected DNS provider
  displayName?: string;
  description?: string;
  isPrimary?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Mailgun Domain (`tenants/{tenantId}/mailgun/config/domains/{domainId}`)

The Mailgun-specific domain document tracks Mailgun configuration and DNS verification:

```typescript
{
  domainId: string;                 // e.g., "mybusiness.com"
  tenantId: string;
  state: string;                    // Mailgun state: 'active', 'unverified', 'disabled'
  status: string;                   // Internal: 'pending', 'verifying', 'active', 'failed', 'disabled'

  // DNS Records (transformed format)
  sendingDnsRecords: DnsRecord[];   // SPF, DKIM, etc.
  receivingDnsRecords: DnsRecord[]; // MX records

  // Verification Status (from verify endpoint)
  verification: {
    lastVerified: Date;
    allRecordsValid: boolean;
    sendingRecordsValid: boolean;
    receivingRecordsValid: boolean;
    sendingRecords: any[];          // Raw Mailgun format with 'valid' field
    receivingRecords: any[];        // Raw Mailgun format with 'valid' field
    state: string;
  };

  // SMTP credentials
  smtpLogin?: string;
  smtpPassword?: string;

  // Timestamps
  verifiedAt?: Date;                // When fully verified
  lastSyncedAt: Date;               // Last sync with Mailgun API
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
}
```

## Verification and Sync Flow

### When User Clicks "Verify" Button

1. **Frontend**: Calls `POST /api/mailgun/domains/:domainId/verify`
   - Location: `frontend/app/settings/domains/manage/[id]/page.tsx` → `handleVerifyMailgun()`
   - Service: `domainCrudService.verifyMailgunDomain()`

2. **Backend Controller**: Receives request at `/api/mailgun/domains/:domainId/verify`
   - Location: `backend/src/mailgun/controllers/mailgunDomainController.ts` → `verifyDomain()`
   - Calls: `mailgunDomainManager.verifyDomain(tenantId, domainId)`

3. **Mailgun Domain Manager**: `verifyDomain()` performs 3-step process
   - Location: `backend/src/mailgun/services/mailgunDomainManager/verifyDomain.ts`

   **Step 1: Verify DNS Records**
   - Calls Mailgun API: `PUT https://api.mailgun.net/v4/domains/{domainId}/verify`
   - Mailgun checks all DNS records and returns their validation status
   - Records: `{ record_type, valid, name, value, priority }`

   **Step 2: Sync Full Domain Data**
   - Calls Mailgun API: `GET https://api.mailgun.net/v4/domains/{domainId}`
   - Fetches complete domain state and DNS records
   - Transforms records to our `DnsRecord` format
   - Calculates overall `status` based on `state` and record validity

   **Step 3: Update Firestore**
   - Saves both verification data and synced state to Mailgun domain document
   - Updates: `verification`, `state`, `status`, `sendingDnsRecords`, `receivingDnsRecords`, `lastSyncedAt`

4. **Frontend**: Reloads domain data
   - Calls `loadDomainDetails()` to refresh both base domain and Mailgun domain
   - Displays updated verification status in UI

## Sync Maintenance

### Automatic Sync Points

1. **On Domain Creation** (`addDomain.ts`)
   - Creates Mailgun domain via API
   - Initial sync happens automatically

2. **On Verification** (`verifyDomain.ts`)
   - Verifies DNS records
   - Immediately syncs full domain data
   - **This is the primary sync point**

3. **Manual Sync** (`syncDomain()` endpoint)
   - Endpoint: `POST /api/mailgun/domains/:domainId/sync`
   - Calls: `syncMailgunDomainData()` utility
   - Fetches latest data from Mailgun without triggering verification

### Sync Utility: `syncMailgunDomainData()`

Location: `backend/src/mailgun/utils/syncMailgunDomainData.ts`

This utility:
- Fetches domain data from Mailgun API (GET endpoint)
- Transforms DNS records
- Calculates status based on state and record validity
- Updates Firestore with synced data
- Used by both manual sync endpoint and potentially by scheduled jobs

### Status Determination Logic

The `status` field is calculated based on Mailgun's `state` and DNS record validity:

```typescript
if (state === 'disabled') {
  status = 'disabled';
} else if (state === 'active' && allRecordsValid) {
  status = 'active';              // Fully verified and active
} else if (state === 'unverified') {
  if (sendingValid || receivingValid) {
    status = 'verifying';         // Partial verification
  } else {
    status = 'pending';           // No records verified yet
  }
} else {
  status = 'verifying';           // In progress
}
```

## Frontend Data Flow

### Domain Detail Page

Location: `frontend/app/settings/domains/manage/[id]/page.tsx`

```typescript
const loadDomainDetails = async () => {
  // 1. Load base domain
  const domainData = await domainCrudService.getDomain(domainId, tenantId, token);

  // 2. Load Mailgun domains
  const mailgunDomains = await domainCrudService.getMailgunDomains(tenantId, token);

  // 3. Find matching Mailgun domain
  const mailgunDomain = mailgunDomains.find(d => d.domainId === domainId);

  // 4. Display verification status from mailgunDomain.verification
};
```

### Verification Status Display

Location: `frontend/app/settings/domains/components/MailgunVerificationStatus.tsx`

Displays:
- Overall verification status (`allRecordsValid`, `sendingRecordsValid`, `receivingRecordsValid`)
- Individual DNS records with copy buttons
- Expandable sections for sending and receiving records
- Last verified timestamp

## API Endpoints

### Verification Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/mailgun/domains/:domainId/verify` | Verify DNS records and sync |
| POST | `/api/mailgun/domains/:domainId/sync` | Sync data without verification |
| GET | `/api/mailgun/domains?tenantId=X` | List all Mailgun domains |
| GET | `/api/mailgun/domains/:domainId?tenantId=X` | Get single Mailgun domain |

## Best Practices

1. **Always call verify for DNS checks** - Don't use sync endpoint for verification
2. **Sync happens automatically** - After verification, no need to manually sync
3. **Frontend reads from Mailgun domain** - Verification status is stored in Mailgun document
4. **Base domain tracks connection** - `connections.mailgun` boolean indicates if connected
5. **Status is calculated** - Not stored directly by Mailgun, we calculate it from state + DNS records

## Troubleshooting

### Verification not updating?

Check logs for the 3-step process:
```
[MAILGUN] Step 1: Calling verify API for example.com
[MAILGUN] Verification response for example.com: { state, sendingRecords, receivingRecords }
[MAILGUN] Step 2: Syncing full domain data for example.com
[MAILGUN] Synced domain state: { state, status, allValid }
[MAILGUN] Step 3: Updating Firestore with verification and synced data
[MAILGUN] ✓ Verification and sync completed for example.com. State: X, Status: Y
```

### DNS records not showing?

- Check `mailgunDomain.verification.sendingRecords` and `receivingRecords`
- Verify `verification.lastVerified` timestamp is recent
- Confirm Mailgun API returned records in the verify response

### Status stuck at 'pending'?

- DNS records may not have propagated yet (can take up to 48 hours)
- Check `state` field - if 'unverified', records aren't valid yet
- Use manual sync endpoint to refresh without re-verifying
