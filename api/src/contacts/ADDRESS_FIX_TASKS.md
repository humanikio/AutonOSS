# Address Creation Fix - Implementation Tasks

## 📋 TASK CHECKLIST

### ✅ Phase 1: Create Utility Function

- [ ] **Create** `/contacts/utilities/ensureContactAddress.ts`
  - [ ] Import firestore, admin, uuidv4
  - [ ] Add JSDoc documentation
  - [ ] Implement normalization logic (lowercase email, strip phone formatting)
  - [ ] Check for existing address (prevent duplicates)
  - [ ] Check for existing primary (determine if new address should be primary)
  - [ ] Create address document with proper fields
  - [ ] Add console logging for debugging
  - [ ] Export function

### 🔧 Phase 2: Update CRM Services (User-Initiated)

- [ ] **Update** `/crm/email/services/sendEmail.ts`
  - [ ] Import `ensureContactAddress`
  - [ ] Add call after line 85 (after `findOrCreateConversation`)
  - [ ] Pass: `tenantId`, `contactId`, `'EMAIL'`, `request.to`
  - [ ] Test: Send email to contact without address
  - [ ] Verify: Address created with `is_primary: true`
  - [ ] Verify: Contact appears in conversations

- [ ] **Update** `/crm/sms/services/sendSms.ts`
  - [ ] Import `ensureContactAddress`
  - [ ] Add call after line 33 (after `findOrCreateConversation`)
  - [ ] Pass: `tenantId`, `contactId`, `'SMS'`, `request.to`
  - [ ] Test: Send SMS to contact without address
  - [ ] Verify: Address created with `is_primary: true`
  - [ ] Verify: Contact appears in conversations

### 🤖 Phase 3: Update Agent Communication Services

- [ ] **Update** `/agentCommunication/phone/services/startAgentPhoneCall.ts`
  - [ ] Import `ensureContactAddress`
  - [ ] Find line ~58 (after `findOrCreateConversation`)
  - [ ] Determine where to get contact phone number
  - [ ] Add call with: `tenantId`, `contactId`, `'SMS'`, `phoneNumber`
  - [ ] Test: Agent initiates phone call
  - [ ] Verify: Address created
  - [ ] Verify: Contact appears in conversations

- [ ] **Update** `/agentCommunication/sms/services/sendSms.ts`
  - [ ] Import `ensureContactAddress`
  - [ ] Add call after line ~56 (first `findOrCreateConversation`)
  - [ ] Add call after line ~265 (second `findOrCreateConversation`)
  - [ ] Pass: `tenantId`, `contactId`, `'SMS'`, `request.to`
  - [ ] Test: Agent sends SMS
  - [ ] Verify: Address created
  - [ ] Verify: Contact appears in conversations

- [ ] **Update** `/agentCommunication/sms/controllers/smsAgentController.ts`
  - [ ] Import `ensureContactAddress`
  - [ ] Find line ~174 (after `findOrCreateConversation`)
  - [ ] Find line ~672 (after `findOrCreateConversation`)
  - [ ] Determine recipient phone number variable name
  - [ ] Add calls at both locations
  - [ ] Test: Agent sends SMS via controller
  - [ ] Verify: Address created
  - [ ] Verify: Contact appears in conversations

### 📥 Phase 4: Verify Inbound Handlers

- [ ] **Check** `/inboundEvents/sms/services/newRequestHandler/manageConversation.ts`
  - [ ] Review code for address creation
  - [ ] Check if `findOrCreateContact` already creates addresses
  - [ ] If missing: Add `ensureContactAddress` call
  - [ ] Test: Receive inbound SMS
  - [ ] Verify: Address exists

- [ ] **Check** `/inboundEvents/email/mailgun/services/handleGlobalEmailInbound/saveEmailFirestore.ts`
  - [ ] Review code for address creation
  - [ ] Check if email inbound already creates addresses
  - [ ] If missing: Add `ensureContactAddress` call
  - [ ] Test: Receive inbound email
  - [ ] Verify: Address exists

### 🧪 Phase 5: Comprehensive Testing

#### Test Case 1: New Contact - Email
- [ ] Create contact via UI (should have address)
- [ ] Send email to NEW contact (never messaged before)
- [ ] Check Firestore: `contact_addresses` collection
- [ ] Verify: `is_primary: true` address exists
- [ ] Check UI: Contact appears in conversations list
- [ ] Check UI: Email message visible

#### Test Case 2: New Contact - SMS
- [ ] Create contact via UI
- [ ] Send SMS to NEW contact
- [ ] Check Firestore: `contact_addresses` collection
- [ ] Verify: `is_primary: true` address exists
- [ ] Check UI: Contact appears in conversations list
- [ ] Check UI: SMS message visible

#### Test Case 3: Existing Contact - No Address
- [ ] Manually create contact WITHOUT address (via Firestore Console)
- [ ] Send email to this contact
- [ ] Verify: Address auto-created
- [ ] Verify: `is_primary: true` set
- [ ] Check UI: Contact now appears

#### Test Case 4: Multiple Addresses
- [ ] Contact has existing primary phone address
- [ ] Send SMS to SAME contact with DIFFERENT phone
- [ ] Verify: New address created with `is_primary: false`
- [ ] Verify: Original address still `is_primary: true`

#### Test Case 5: Duplicate Prevention
- [ ] Send email to contact twice
- [ ] Check Firestore: Only ONE address exists
- [ ] Verify: No duplicate addresses created

#### Test Case 6: Agent Communication
- [ ] Agent sends SMS to contact without address
- [ ] Verify: Address created
- [ ] Contact appears in conversations
- [ ] Agent makes phone call to contact
- [ ] Verify: Address created (if didn't exist)

#### Test Case 7: Inbound Messages
- [ ] Receive inbound SMS from unknown number
- [ ] Verify: Contact created
- [ ] Verify: Address created with `is_primary: true`
- [ ] Contact appears in conversations
- [ ] Repeat for inbound email

### 📊 Phase 6: Validation & Monitoring

- [ ] **Add Metrics**
  - [ ] Log address creation events
  - [ ] Track addresses without `is_primary: true`
  - [ ] Monitor duplicate address creation attempts

- [ ] **Database Audit**
  - [ ] Query all contacts with conversations
  - [ ] Count contacts WITHOUT primary addresses
  - [ ] Generate report of affected contacts
  - [ ] Create migration script if needed

- [ ] **Frontend Validation**
  - [ ] Confirm all contacts in conversations have addresses
  - [ ] Check for any remaining "hidden" conversations
  - [ ] Validate phone numbers display correctly

### 🔄 Phase 7: Migration (If Needed)

- [ ] **Create Migration Script**
  - [ ] Query all contacts with conversations
  - [ ] Filter contacts without primary addresses
  - [ ] For each contact:
    - [ ] Extract phone from messages
    - [ ] Extract email from contact document
    - [ ] Create missing addresses
  - [ ] Run in batches with rate limiting
  - [ ] Log migration results

- [ ] **Backup First**
  - [ ] Export affected contacts
  - [ ] Export existing addresses
  - [ ] Store backup safely

- [ ] **Run Migration**
  - [ ] Test on staging environment first
  - [ ] Run on production
  - [ ] Verify results
  - [ ] Monitor for issues

### 📝 Phase 8: Documentation

- [ ] Update API documentation
- [ ] Add comments to modified files
- [ ] Update developer onboarding docs
- [ ] Create troubleshooting guide
- [ ] Document address architecture decisions

---

## 🎯 PRIORITY ORDER

### P0 - Critical (Do First)
1. Create `ensureContactAddress` utility
2. Update `/crm/email/services/sendEmail.ts`
3. Update `/crm/sms/services/sendSms.ts`
4. Test basic email/SMS sending

### P1 - High (Do Soon)
5. Update agent communication services
6. Verify inbound handlers
7. Run comprehensive tests

### P2 - Medium (Can Wait)
8. Create migration script for existing contacts
9. Add monitoring/metrics
10. Documentation updates

---

## 🚧 BLOCKERS & DEPENDENCIES

### Known Issues
- None currently

### Questions to Resolve
- [ ] What happens to contacts created via bulk import? Do they have addresses?
- [ ] Should we backfill addresses for existing contacts?
- [ ] Should we deprecate `contact.email` field in favor of addresses?

### External Dependencies
- None

---

## ✅ DEFINITION OF DONE

A task is considered complete when:
1. ✅ Code implemented and committed
2. ✅ Unit tests pass (if applicable)
3. ✅ Integration tests pass
4. ✅ Manually tested in dev environment
5. ✅ No console errors or warnings
6. ✅ Contacts appear in conversations list
7. ✅ Messages visible in UI
8. ✅ No duplicate addresses created
9. ✅ Proper logging in place
10. ✅ Code reviewed (if applicable)

---

## 📊 PROGRESS TRACKING

**Started:** [DATE]
**Expected Completion:** [DATE]
**Actual Completion:** [DATE]

**Completed Tasks:** 0 / [TOTAL]
**Progress:** 0%

---

**Last Updated:** 2025-12-03
**Assigned To:** [DEVELOPER]
**Status:** 🔴 NOT STARTED
