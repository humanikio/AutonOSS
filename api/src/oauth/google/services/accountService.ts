import { db } from '../../../config/firestore';

export interface EmailAccount {
  id: string;
  email: string;
  name: string;
  provider: 'gmail' | 'outlook' | 'mailgun';
  tenantId: string;
  accessToken?: string; // Optional for mailgun
  refreshToken?: string; // Optional for mailgun
  tokenExpiresAt?: Date | null; // Optional for mailgun
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: Date;
  updatedAt?: Date;
  lastSync?: Date;
  syncEnabled: boolean;
  foldersSynced: number;
  messagesCount: number;
}

export interface EmailConfig {
  defaultAccountId?: string;
  preferredProvider?: 'gmail' | 'outlook' | 'mailgun';
  enableAutoFallback?: boolean;
  fallbackOrder?: Array<'gmail' | 'outlook' | 'mailgun'>;
  dailySendLimit?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const accountService = {
  async createOrUpdateAccount(accountData: Partial<EmailAccount>) {
    const docRef = db
      .collection('tenants')
      .doc(accountData.tenantId!)
      .collection('emailAccounts')
      .doc(accountData.id!);
    
    const existingDoc = await docRef.get();
    
    const data = {
      ...accountData,
      updatedAt: new Date(),
      syncEnabled: existingDoc.exists ? existingDoc.data()?.syncEnabled ?? true : true,
      foldersSynced: existingDoc.exists ? existingDoc.data()?.foldersSynced ?? 0 : 0,
      messagesCount: existingDoc.exists ? existingDoc.data()?.messagesCount ?? 0 : 0,
    };

    await docRef.set(data, { merge: true });
    return data;
  },

  async getAccount(tenantId: string, accountId: string): Promise<EmailAccount | null> {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc(accountId);
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      ...data,
      connectedAt: data?.connectedAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate(),
      lastSync: data?.lastSync?.toDate(),
      tokenExpiresAt: data?.tokenExpiresAt?.toDate() || null,
    } as EmailAccount;
  },

  async updateAccount(tenantId: string, accountId: string, updateData: Partial<EmailAccount>) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc(accountId);
    
    await docRef.update({
      ...updateData,
      updatedAt: new Date()
    });
  },

  async getAccountsByTenant(tenantId: string): Promise<EmailAccount[]> {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        connectedAt: data?.connectedAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
        lastSync: data?.lastSync?.toDate(),
        tokenExpiresAt: data?.tokenExpiresAt?.toDate() || null,
      } as EmailAccount;
    });
  },

  async removeAccount(tenantId: string, accountId: string) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc(accountId);
    
    await docRef.delete();
  },

  async updateSyncStatus(tenantId: string, accountId: string, syncEnabled: boolean) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc(accountId);
    
    await docRef.update({
      syncEnabled,
      updatedAt: new Date()
    });
  },

  async updateSyncStats(tenantId: string, accountId: string, stats: {
    foldersSynced?: number;
    messagesCount?: number;
    lastSync?: Date;
  }) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc(accountId);
    
    await docRef.update({
      ...stats,
      updatedAt: new Date()
    });
  },

  async getActiveAccounts(tenantId: string): Promise<EmailAccount[]> {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .where('status', '==', 'active')
      .where('syncEnabled', '==', true)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        connectedAt: data?.connectedAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
        lastSync: data?.lastSync?.toDate(),
        tokenExpiresAt: data?.tokenExpiresAt?.toDate() || null,
      } as EmailAccount;
    });
  },

  // ============================================================
  // EMAIL CONFIG METHODS (for /main document)
  // ============================================================

  async getEmailConfig(tenantId: string): Promise<EmailConfig | null> {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc('main');

    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    } as EmailConfig;
  },

  async updateEmailConfig(tenantId: string, config: Partial<EmailConfig>): Promise<void> {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailAccounts')
      .doc('main');

    await docRef.set({
      ...config,
      updatedAt: new Date()
    }, { merge: true });
  },

  async getDefaultAccountId(tenantId: string): Promise<string | null> {
    const config = await this.getEmailConfig(tenantId);
    return config?.defaultAccountId || null;
  },

  async setDefaultAccountId(tenantId: string, accountId: string): Promise<void> {
    // Verify the account exists and is active
    const account = await this.getAccount(tenantId, accountId);

    if (!account) {
      throw new Error(`Email account ${accountId} not found for tenant ${tenantId}`);
    }

    if (account.status !== 'active') {
      throw new Error(`Email account ${accountId} is not active. Status: ${account.status}`);
    }

    // Set as default
    await this.updateEmailConfig(tenantId, {
      defaultAccountId: accountId,
      preferredProvider: account.provider
    });
  },

  async initializeEmailConfig(tenantId: string): Promise<void> {
    const existing = await this.getEmailConfig(tenantId);

    if (!existing) {
      await this.updateEmailConfig(tenantId, {
        enableAutoFallback: false,
        createdAt: new Date()
      });
    }
  }
};