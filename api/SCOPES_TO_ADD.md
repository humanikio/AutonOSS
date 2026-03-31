# GHL Scopes Configuration

## Current Working Scopes
These are currently enabled and working:
- conversations.readonly
- conversations.write
- conversations/message.readonly
- conversations/message.write
- conversations/livechat.write
- conversations/reports.readonly
- locations.readonly
- locations/customFields.readonly
- locations/tags.readonly
- locations/customValues.readonly
- users.readonly
- oauth.readonly
- oauth.write

## Scopes to Add in GHL App Settings

Go to: https://marketplace.gohighlevel.com/ → My Apps → Your App → Advanced Settings → Auth → Select Scope

### High Priority (Add these first)
```
contacts.readonly
contacts.write
```
**Why**: Essential for contact management and linking GHL contacts to Pulseline

### Medium Priority (Add when ready)
```
opportunities.readonly
opportunities.write
calendars.readonly
calendars/events.readonly
workflows.readonly
campaigns.readonly
```

## After Adding Scopes

1. Check the boxes in GHL app settings
2. Click Save
3. Update code in `ghlOauthService.ts` lines 18-39 and 197-211
4. Add the new scopes to the arrays
5. Rebuild: `npm run build`
6. Deploy to production
7. Test OAuth flow again

## Full Scope List (Once All Are Added)

```typescript
const scopes = [
  // Contacts
  'contacts.readonly',
  'contacts.write',

  // Conversations
  'conversations.readonly',
  'conversations.write',
  'conversations/message.readonly',
  'conversations/message.write',
  'conversations/livechat.write',
  'conversations/reports.readonly',

  // Locations
  'locations.readonly',
  'locations/customFields.readonly',
  'locations/tags.readonly',
  'locations/customValues.readonly',

  // Users
  'users.readonly',

  // OAuth
  'oauth.readonly',
  'oauth.write',

  // Opportunities
  'opportunities.readonly',
  'opportunities.write',

  // Calendars
  'calendars.readonly',
  'calendars/events.readonly',

  // Workflows & Campaigns
  'workflows.readonly',
  'campaigns.readonly'
];
```
