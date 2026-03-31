import { firestore } from './firebase';
import { 
  Tenant, 
  User, 
  BusinessInfo,
  CallAgent
} from '@/types';

// Export the firestore instance for direct use
export const db = firestore;

// Collection references for type safety
export const collections = {
  tenants: firestore.collection('tenants'),
  users: firestore.collection('users'),
  contacts: firestore.collection('contacts'),
  callAgents: firestore.collection('callAgents'),
  conversations: firestore.collection('conversations'),
  businessInfo: firestore.collection('businessInfo'),
  messageTemplates: firestore.collection('messageTemplates'),
  callScripts: firestore.collection('callScripts'),
  auditLogs: firestore.collection('auditLogs'),
} as const;

// Tenant-scoped collection helpers
export const getTenantCollection = (tenantId: string, collectionName: keyof typeof collections) => {
  return firestore.collection(collectionName).where('tenantId', '==', tenantId);
};

// Helper functions for common queries
export const firestoreHelpers = {
  // Get user by uid
  getUserByUid: (uid: string) => 
    collections.users.doc(uid).get(),

  // Get tenant by id
  getTenantById: (tenantId: string) => 
    collections.tenants.doc(tenantId).get(),

  // Get all call agents for a tenant
  getCallAgentsByTenant: (tenantId: string) => 
    getTenantCollection(tenantId, 'callAgents').get(),

  // Get all contacts for a tenant
  getContactsByTenant: (tenantId: string) => 
    getTenantCollection(tenantId, 'contacts').get(),

  // Get conversations for a contact
  getConversationsByContact: (tenantId: string, contactId: string) =>
    getTenantCollection(tenantId, 'conversations')
      .where('contactId', '==', contactId)
      .orderBy('updatedAt', 'desc')
      .get(),

  // Get active conversations for a call agent
  getActiveConversationsByCallAgent: (tenantId: string, callAgentId: string) =>
    getTenantCollection(tenantId, 'conversations')
      .where('callAgentId', '==', callAgentId)
      .where('status', '==', 'active')
      .get(),

  // Get business info for tenant
  getBusinessInfoByTenant: (tenantId: string) =>
    collections.businessInfo.doc(tenantId).get(),

  // Get message templates for tenant
  getMessageTemplatesByTenant: (tenantId: string) =>
    getTenantCollection(tenantId, 'messageTemplates').get(),

  // Get call scripts for tenant
  getCallScriptsByTenant: (tenantId: string) =>
    getTenantCollection(tenantId, 'callScripts').get(),
};

// Collection structure documentation
export const COLLECTION_STRUCTURE = {
  /*
  /tenants/{tenantId}
    - Basic tenant information
    - Settings and configuration
    - Usage tracking

  /users/{userId}
    - User profile data
    - Role and permissions
    - Linked to tenantId

  /contacts/{contactId}
    - Contact information
    - Scoped by tenantId
    - Status and stage tracking

  /callAgents/{callAgentId}
    - Call agent configuration
    - Performance metrics
    - Scoped by tenantId

  /conversations/{conversationId}
    - Conversation threads
    - Messages array
    - Scoped by tenantId

  /businessInfo/{tenantId}
    - Company information
    - Products and services
    - Brand guidelines

  /messageTemplates/{templateId}
    - SMS templates
    - Scoped by tenantId

  /callScripts/{scriptId}
    - Call scripts
    - Scoped by tenantId

  /auditLogs/{logId}
    - Activity tracking
    - Security logging
    - Scoped by tenantId
  */
} as const;