import { db } from '../../../config/firestore';
import { UpdateDomainData } from './types';

/**
 * Update a domain's metadata or connections
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @param updateData - Fields to update
 */
export async function updateDomain(
  tenantId: string,
  domainId: string,
  updateData: UpdateDomainData
): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('domains')
    .doc(domainId);

  // Verify domain exists
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error(`Domain ${domainId} not found`);
  }

  // Build update object
  const updates: any = {
    updatedAt: new Date()
  };

  if (updateData.displayName !== undefined) {
    updates.displayName = updateData.displayName;
  }

  if (updateData.description !== undefined) {
    updates.description = updateData.description;
  }

  if (updateData.isPrimary !== undefined) {
    updates.isPrimary = updateData.isPrimary;

    // If setting as primary, unset other primary domains
    if (updateData.isPrimary) {
      const otherDomainsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('domains')
        .where('isPrimary', '==', true)
        .get();

      const batch = db.batch();
      otherDomainsSnapshot.docs.forEach(otherDoc => {
        if (otherDoc.id !== domainId) {
          batch.update(otherDoc.ref, { isPrimary: false, updatedAt: new Date() });
        }
      });
      await batch.commit();
    }
  }

  if (updateData.verification) {
    const currentData = doc.data();
    updates.verification = {
      ...currentData?.verification,
      ...updateData.verification
    };
  }

  if (updateData.connections) {
    const currentData = doc.data();
    updates.connections = {
      ...currentData?.connections,
      ...updateData.connections
    };
  }

  await docRef.update(updates);

  console.log(`[DOMAIN] Updated domain ${domainId}`);
}
