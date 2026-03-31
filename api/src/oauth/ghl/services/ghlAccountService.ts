import { db } from '../../../config/firestore';

export interface GhlAccount {
  id: string;
  locationId: string;
  locationName: string;
  companyId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  scopes: string[];
  status: 'active' | 'inactive' | 'pending' | 'error';
  connectedAt: Date;
  updatedAt?: Date;
  userType?: string;
  // Additional metadata
  lastSync?: Date;
  syncEnabled: boolean;
}

export const ghlAccountService = {
  async createOrUpdateAccount(accountData: Partial<GhlAccount>) {
    const docRef = db
      .collection('tenants')
      .doc(accountData.tenantId!)
      .collection('ghlAccounts')
      .doc(accountData.locationId!);

    const existingDoc = await docRef.get();

    const data = {
      ...accountData,
      updatedAt: new Date(),
      syncEnabled: existingDoc.exists ? existingDoc.data()?.syncEnabled ?? true : true,
    };

    await docRef.set(data, { merge: true });
    return data;
  },

  async getAccount(tenantId: string, locationId: string): Promise<GhlAccount | null> {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
      .doc(locationId);

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
    } as GhlAccount;
  },

  async updateAccount(tenantId: string, locationId: string, updateData: Partial<GhlAccount>) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
      .doc(locationId);

    await docRef.update({
      ...updateData,
      updatedAt: new Date()
    });
  },

  async getAccountsByTenant(tenantId: string): Promise<GhlAccount[]> {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        connectedAt: data?.connectedAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
        lastSync: data?.lastSync?.toDate(),
        tokenExpiresAt: data?.tokenExpiresAt?.toDate() || null,
      } as GhlAccount;
    });
  },

  async removeAccount(tenantId: string, locationId: string) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
      .doc(locationId);

    await docRef.delete();
  },

  async updateSyncStatus(tenantId: string, locationId: string, syncEnabled: boolean) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
      .doc(locationId);

    await docRef.update({
      syncEnabled,
      updatedAt: new Date()
    });
  },

  async updateSyncStats(tenantId: string, locationId: string, stats: {
    lastSync?: Date;
  }) {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
      .doc(locationId);

    await docRef.update({
      ...stats,
      updatedAt: new Date()
    });
  },

  async getActiveAccounts(tenantId: string): Promise<GhlAccount[]> {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ghlAccounts')
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
      } as GhlAccount;
    });
  }
};
