import { 
  collections, 
  firestoreHelpers,
  getTenantCollection 
} from '../config/firestore';
import { 
  Tenant, 
  User, 
  BusinessInfo,
  CallAgent,
  TenantSettings,
  TenantUsage 
} from '@/types';

// Define missing types locally until they're added to shared types
interface Contact {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  callAgentId: string;
  status: 'active' | 'completed' | 'failed';
  metadata: {
    outcome?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CallScript {
  id: string;
  tenantId: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class FirestoreService {
  // ===== TENANT OPERATIONS =====
  async createTenant(tenantData: Omit<Tenant, 'id'>): Promise<string> {
    const tenantRef = collections.tenants.doc();
    const tenant: Tenant = {
      ...tenantData,
      id: tenantRef.id,
    };
    
    await tenantRef.set(tenant);
    return tenantRef.id;
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const doc = await firestoreHelpers.getTenantById(tenantId);
    return doc.exists ? (doc.data() as Tenant) : null;
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
    await collections.tenants.doc(tenantId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  // ===== USER OPERATIONS =====
  async createUser(userData: User): Promise<void> {
    await collections.users.doc(userData.uid).set(userData);
  }

  async getUser(uid: string): Promise<User | null> {
    const doc = await firestoreHelpers.getUserByUid(uid);
    return doc.exists ? (doc.data() as User) : null;
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    await collections.users.doc(uid).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    const snapshot = await collections.users.where('tenantId', '==', tenantId).get();
    return snapshot.docs.map(doc => doc.data() as User);
  }

  // ===== CONTACT OPERATIONS =====
  async createContact(contactData: Omit<Contact, 'id'>): Promise<string> {
    const contactRef = collections.contacts.doc();
    const contact: Contact = {
      ...contactData,
      id: contactRef.id,
    };
    
    await contactRef.set(contact);
    return contactRef.id;
  }

  async getContact(contactId: string): Promise<Contact | null> {
    const doc = await collections.contacts.doc(contactId).get();
    return doc.exists ? (doc.data() as Contact) : null;
  }

  async getContactsByTenant(tenantId: string): Promise<Contact[]> {
    const snapshot = await firestoreHelpers.getContactsByTenant(tenantId);
    return snapshot.docs.map(doc => doc.data() as Contact);
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<void> {
    await collections.contacts.doc(contactId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteContact(contactId: string): Promise<void> {
    await collections.contacts.doc(contactId).delete();
  }

  // ===== CALL AGENT OPERATIONS =====
  async createCallAgent(callAgentData: Omit<CallAgent, 'id'>): Promise<string> {
    const callAgentRef = collections.callAgents.doc();
    const callAgent: CallAgent = {
      ...callAgentData,
      id: callAgentRef.id,
    };
    
    await callAgentRef.set(callAgent);
    return callAgentRef.id;
  }

  async getCallAgent(callAgentId: string): Promise<CallAgent | null> {
    const doc = await collections.callAgents.doc(callAgentId).get();
    return doc.exists ? (doc.data() as CallAgent) : null;
  }

  async getCallAgentsByTenant(tenantId: string): Promise<CallAgent[]> {
    const snapshot = await firestoreHelpers.getCallAgentsByTenant(tenantId);
    return snapshot.docs.map(doc => doc.data() as CallAgent);
  }

  async updateCallAgent(callAgentId: string, updates: Partial<CallAgent>): Promise<void> {
    await collections.callAgents.doc(callAgentId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteCallAgent(callAgentId: string): Promise<void> {
    await collections.callAgents.doc(callAgentId).delete();
  }

  // ===== CONVERSATION OPERATIONS =====
  async createConversation(conversationData: Omit<Conversation, 'id'>): Promise<string> {
    const conversationRef = collections.conversations.doc();
    const conversation: Conversation = {
      ...conversationData,
      id: conversationRef.id,
    };
    
    await conversationRef.set(conversation);
    return conversationRef.id;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const doc = await collections.conversations.doc(conversationId).get();
    return doc.exists ? (doc.data() as Conversation) : null;
  }

  async getConversationsByContact(tenantId: string, contactId: string): Promise<Conversation[]> {
    const snapshot = await firestoreHelpers.getConversationsByContact(tenantId, contactId);
    return snapshot.docs.map(doc => doc.data() as Conversation);
  }

  async getActiveConversationsByCallAgent(tenantId: string, callAgentId: string): Promise<Conversation[]> {
    const snapshot = await firestoreHelpers.getActiveConversationsByCallAgent(tenantId, callAgentId);
    return snapshot.docs.map(doc => doc.data() as Conversation);
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    await collections.conversations.doc(conversationId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  // ===== BUSINESS INFO OPERATIONS =====
  async createOrUpdateBusinessInfo(businessInfo: BusinessInfo): Promise<void> {
    await collections.businessInfo.doc(businessInfo.tenantId).set({
      ...businessInfo,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async getBusinessInfo(tenantId: string): Promise<BusinessInfo | null> {
    const doc = await firestoreHelpers.getBusinessInfoByTenant(tenantId);
    return doc.exists ? (doc.data() as BusinessInfo) : null;
  }

  // ===== TEMPLATE OPERATIONS =====
  async createMessageTemplate(templateData: Omit<MessageTemplate, 'id'>): Promise<string> {
    const templateRef = collections.messageTemplates.doc();
    const template: MessageTemplate = {
      ...templateData,
      id: templateRef.id,
    };
    
    await templateRef.set(template);
    return templateRef.id;
  }

  async getMessageTemplatesByTenant(tenantId: string): Promise<MessageTemplate[]> {
    const snapshot = await firestoreHelpers.getMessageTemplatesByTenant(tenantId);
    return snapshot.docs.map(doc => doc.data() as MessageTemplate);
  }

  async updateMessageTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<void> {
    await collections.messageTemplates.doc(templateId).update(updates);
  }

  async deleteMessageTemplate(templateId: string): Promise<void> {
    await collections.messageTemplates.doc(templateId).delete();
  }

  // ===== CALL SCRIPT OPERATIONS =====
  async createCallScript(scriptData: Omit<CallScript, 'id'>): Promise<string> {
    const scriptRef = collections.callScripts.doc();
    const script: CallScript = {
      ...scriptData,
      id: scriptRef.id,
    };
    
    await scriptRef.set(script);
    return scriptRef.id;
  }

  async getCallScriptsByTenant(tenantId: string): Promise<CallScript[]> {
    const snapshot = await firestoreHelpers.getCallScriptsByTenant(tenantId);
    return snapshot.docs.map(doc => doc.data() as CallScript);
  }

  async updateCallScript(scriptId: string, updates: Partial<CallScript>): Promise<void> {
    await collections.callScripts.doc(scriptId).update(updates);
  }

  async deleteCallScript(scriptId: string): Promise<void> {
    await collections.callScripts.doc(scriptId).delete();
  }

  // ===== ANALYTICS & REPORTING =====
  async getTenantStats(tenantId: string) {
    const [callAgents, contacts, conversations] = await Promise.all([
      this.getCallAgentsByTenant(tenantId),
      this.getContactsByTenant(tenantId),
      getTenantCollection(tenantId, 'conversations').get(),
    ]);

    const activeCallAgents = callAgents.filter(a => a.status === 'active').length;
    const totalConversations = conversations.size;
    const activeConversations = conversations.docs
      .filter(doc => (doc.data() as Conversation).status === 'active').length;

    return {
      totalCallAgents: callAgents.length,
      activeCallAgents,
      totalContacts: contacts.length,
      totalConversations,
      activeConversations,
      conversionRate: this.calculateConversionRate(conversations.docs.map(d => d.data() as Conversation)),
    };
  }

  private calculateConversionRate(conversations: Conversation[]): number {
    const completed = conversations.filter(c => c.status === 'completed');
    const converted = completed.filter(c => 
      c.metadata.outcome && ['appointment', 'sale'].includes(c.metadata.outcome)
    );
    
    return completed.length > 0 ? (converted.length / completed.length) * 100 : 0;
  }
}

export const firestoreService = new FirestoreService();