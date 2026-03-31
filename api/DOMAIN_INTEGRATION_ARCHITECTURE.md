# Domain Integration Architecture

## Overview

A unified domain management system with **DNS TXT verification** and **Mailgun email** integration with automatic connection tracking.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│           BASE DOMAIN LAYER (Universal)             │
│    tenants/{tenantId}/domains/{domainId}            │
│                                                      │
│  - Domain ownership & verification                  │
│  - Connection tracking: { mailgun }                 │
│  - Verification method: dns-txt                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │
            ┌──────▼────────┐
            │ MAILGUN LAYER │
            │ /mailgun/...  │
            │               │
            │ - Email config│
            │ - DNS records │
            └───────────────┘
```

---

## Firestore Structure

### Base Domain
```
tenants/{tenantId}/domains/{domainId}
{
  domainId: "mybusiness.com",
  tenantId: "tenant123",
  displayName: "My Business",
  isPrimary: true,

  verification: {
    method: "dns-txt",
    status: "pending" | "verified" | "failed",
    verificationToken: "abc123...",
    verificationValue: "auton-verify=abc123...",
    verifiedAt: Timestamp,
    lastCheckedAt: Timestamp
  },

  connections: {
    mailgun: true
  },

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Mailgun Domain
```
tenants/{tenantId}/mailgun/config/domains/{domainId}
{
  domainId: "mybusiness.com",
  state: "active" | "unverified",
  smtpLogin: "postmaster@mybusiness.com",
  sendingDnsRecords: [...],
  receivingDnsRecords: [...]
}
```

---

## DNS TXT Verification

**Flow:**
1. User creates domain → System generates random token
2. User adds TXT record to their DNS: `auton-verify=abc123`
3. User clicks verify → Node.js performs DNS lookup
4. Status updates to `verified`

**Example:**
```typescript
// 1. Create domain
POST /api/domains
{
  "tenantId": "123",
  "domainId": "mybusiness.com"
}

// Response
{
  "verification": {
    "verificationValue": "auton-verify=abc123..."
  }
}

// 2. User adds DNS TXT record
// Host: @ or mybusiness.com
// Type: TXT
// Value: auton-verify=abc123...

// 3. Verify
POST /api/domains/mybusiness.com/verify
{ "tenantId": "123" }

// Response
{
  "verified": true,
  "message": "Domain verified successfully via DNS TXT record"
}
```

---

## Connection Tracking

### Mailgun Integration

**Add Domain to Mailgun:**
```typescript
// Step 1: Create base domain
POST /api/domains
{ "domainId": "mybusiness.com" }

// Step 2: Verify base domain (add DNS TXT record first)
POST /api/domains/mybusiness.com/verify

// Step 3: Connect to Mailgun (only works if verified)
POST /api/mailgun/domains
{ "domainId": "mybusiness.com" }

// Backend automatically:
// ✓ Validates domain is verified
// ✓ Creates Mailgun domain
// ✓ Updates base domain: connections.mailgun = true
```

**Remove from Mailgun:**
```typescript
DELETE /api/mailgun/domains/mybusiness.com

// Backend automatically:
// ✓ Removes from Mailgun API
// ✓ Removes Mailgun Firestore doc
// ✓ Updates base domain: connections.mailgun = false
```

---

## API Endpoints

### Base Domains
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/domains` | Create domain + generate DNS TXT token |
| `GET` | `/api/domains` | List domains (filter by verified, connections) |
| `GET` | `/api/domains/:id` | Get single domain |
| `PATCH` | `/api/domains/:id` | Update metadata |
| `DELETE` | `/api/domains/:id` | Remove (requires no connections) |
| `POST` | `/api/domains/:id/verify` | Verify via DNS TXT lookup |

### Mailgun Domains
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/mailgun/domains` | Connect domain to Mailgun |
| `GET` | `/api/mailgun/domains` | List Mailgun domains |
| `GET` | `/api/mailgun/domains/:id` | Get Mailgun domain |
| `PUT` | `/api/mailgun/domains/:id` | Update Mailgun settings |
| `DELETE` | `/api/mailgun/domains/:id` | Disconnect from Mailgun |
| `POST` | `/api/mailgun/domains/:id/sync` | Sync DNS verification status |

---

## Key Files

### Base Domain System
```
/backend/src/domains/
├── services/domainManager/
│   ├── types.ts                    # Domain types
│   ├── createDomain.ts             # Create + generate token
│   ├── getDomain.ts                # Fetch single
│   ├── getDomains.ts               # List with filters
│   ├── updateDomain.ts             # Update metadata
│   ├── removeDomain.ts             # Remove (safety checks)
│   └── verifyDomain.ts             # DNS TXT verification
├── services/domainManager.ts       # Main service export
├── utils/
│   ├── verifyDnsTxt.ts            # DNS TXT lookup utility
│   └── syncDomainConnections.ts   # Connection sync helpers
├── controllers/domainController.ts # HTTP handlers
└── routes/domainRoutes.ts          # API routes
```

### Mailgun Integration (Updated)
```
/backend/src/mailgun/services/mailgunDomainManager/
├── addDomain.ts                    # NOW: Checks base domain + syncs
└── removeDomain.ts                 # NOW: Disconnects base domain
```

---

## Environment Variables

```bash
# Mailgun (Required for email)
MAILGUN_SENDING_KEY=your_mailgun_api_key
MAILGUN_DEFAULT_DOMAIN=mail.example.com

# Domain verification
API_KEY_ENCRYPTION_SECRET=your_secret  # For alias generation
```

---

## Usage Example

### Complete Flow: Add Custom Domain to Mailgun

```typescript
// 1. Create base domain
const domain = await domainManager.createDomain({
  tenantId: 'tenant123',
  domainId: 'mybusiness.com'
});
// Returns: { verification: { verificationValue: 'auton-verify=abc123' } }

// 2. User adds DNS TXT record
// @ -> auton-verify=abc123

// 3. Verify
const result = await domainManager.verifyDomain('tenant123', 'mybusiness.com');
// { verified: true, method: 'dns-txt' }

// 4. Connect to Mailgun
const mailgunDomain = await mailgunDomainManager.addDomain({
  tenantId: 'tenant123',
  domainId: 'mybusiness.com'
});
// Base domain automatically updated: connections.mailgun = true
```

### Query Domains

```typescript
// Get all verified domains
GET /api/domains?tenantId=123&verified=true

// Get domains connected to Mailgun
GET /api/domains?tenantId=123&hasConnection=mailgun

// Get primary domain
GET /api/domains?tenantId=123&isPrimary=true
```

---

## Safety Features

✅ **Cannot delete domain with active connections**
```typescript
DELETE /api/domains/mybusiness.com
// Error: "Cannot remove domain with active connections. Disconnect from: mailgun"
```

✅ **Cannot connect unverified domain to Mailgun**
```typescript
POST /api/mailgun/domains
// Error: "Domain mybusiness.com is not verified. Please verify it first"
```

✅ **Auto-sync on add/remove**
- Mailgun add → `connections.mailgun = true`
- Mailgun remove → `connections.mailgun = false`

✅ **DNS verification via Node.js built-in**
- No external dependencies required

---

## Error Handling

**Common Error Messages:**

```typescript
// Domain not found
"Domain mybusiness.com not found. Please add it to your domains first at /api/domains"

// Not verified
"Domain mybusiness.com is not verified. Please verify it first at /api/domains/mybusiness.com/verify"

// Already connected
"Domain mybusiness.com already connected to Mailgun for this tenant"

// Has active connections (cannot delete)
"Cannot remove domain with active connections. Please disconnect from: mailgun"

// DNS TXT not found
"TXT record not found. Please add: auton-verify=abc123..."
```

---

## Testing Checklist

- [x] Create domain with DNS TXT method (default)
- [x] Verify domain via DNS lookup
- [x] Connect verified domain to Mailgun
- [x] Check `connections.mailgun = true` in base domain
- [x] Remove Mailgun domain
- [x] Check `connections.mailgun = false` in base domain
- [x] Try to delete domain with connections (should fail)
- [x] Try to connect unverified domain to Mailgun (should fail)
- [ ] Frontend: Domain management page
- [ ] Frontend: DNS verification wizard
- [ ] Frontend: Mailgun connection UI

---

## Architecture Benefits

✅ **Separation of Concerns**
- Base layer = ownership & verification
- Service layers = functionality (Mailgun)

✅ **DRY Principle**
- Single source of truth for domain verification
- Reusable DNS TXT utility

✅ **Type Safety**
- Full TypeScript types for all layers

✅ **Flexibility**
- Easy to add new services (Vercel, Cloudflare, AWS, etc.)
- DNS TXT verification works for any domain

✅ **Queryable**
- Filter domains by verification status
- Filter by service connections
- Find primary domain

---

## Next Steps

### Phase 1: Frontend UI ✨
- Domain management dashboard
- DNS verification wizard with copy-paste
- Connection status badges
- Mailgun connection button

### Phase 2: Custom Email Accounts 📧
- New account type: `customMailgun`
- Limit: 5 accounts per custom domain
- Sender selection in email composer

### Phase 3: Future Services 🚀
- Vercel integration (hosting)
- Cloudflare integration (CDN/DNS)
- AWS SES integration (email)

---

**Ready for frontend integration!** 🎉
