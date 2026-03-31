/**
 * Read a single trigger subscription by ID
 */

import { firestore } from '../../../../config/firebase';
import { TriggerSubscription } from '../../types';

/**
 * Get a trigger subscription by ID
 *
 * @param tenantId - Tenant identifier (REQUIRED)
 * @param subscriptionId - Subscription identifier (REQUIRED)
 * @returns Subscription document or null if not found
 */
export async function readSubscription(
  tenantId: string,
  subscriptionId: string
): Promise<TriggerSubscription | null> {
  // Validate required parameters
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  if (!subscriptionId) {
    throw new Error('subscriptionId is required');
  }

  // Get subscription document
  const subscriptionRef = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions').doc(subscriptionId);

  const doc = await subscriptionRef.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as TriggerSubscription;
}
