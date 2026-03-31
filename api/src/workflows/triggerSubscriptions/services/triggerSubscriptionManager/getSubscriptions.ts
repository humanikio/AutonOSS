/**
 * Query trigger subscriptions with filters
 * Uses indexed queries for performance
 */

import { firestore } from '../../../../config/firebase';
import { SubscriptionFilters, TriggerSubscription } from '../../types';

/**
 * Get trigger subscriptions with optional filters
 *
 * @param tenantId - Tenant identifier (REQUIRED)
 * @param filters - Optional filters for querying subscriptions
 * @returns Array of matching subscription documents
 */
export async function getSubscriptions(
  tenantId: string,
  filters: SubscriptionFilters = {}
): Promise<TriggerSubscription[]> {
  // Validate required parameter
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  // Start with base query
  let query: FirebaseFirestore.Query = firestore
    .collection('tenants').doc(tenantId)
    .collection('workflows').doc('main')
    .collection('triggerSubscriptions');

  // Apply filters using indexed fields
  // NOTE: Composite index required: (triggerType ASC, enabled ASC)

  if (filters.triggerType) {
    query = query.where('triggerType', '==', filters.triggerType);
  }

  if (filters.enabled !== undefined) {
    query = query.where('enabled', '==', filters.enabled);
  }

  // workflowId filter (though 1:1 relationship means this will return 0 or 1 result)
  if (filters.workflowId) {
    query = query.where('workflowId', '==', filters.workflowId);
  }

  // Order by priority (higher priority first)
  query = query.orderBy('priority', 'desc');

  // Execute query
  const snapshot = await query.get();

  // Map documents to TriggerSubscription objects
  return snapshot.docs.map(doc => doc.data() as TriggerSubscription);
}
