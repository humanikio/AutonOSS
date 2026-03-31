/**
 * Tool: Call Get Subscriptions
 * Fetches active subscriptions for a given trigger type
 * Optionally filters subscriptions based on payload conditions
 */

import { triggerSubscriptionManager } from '../../triggerSubscriptionManager';
import { TriggerSubscription } from '../../../types';
import { evaluateConditions, evaluateConditionsWithLogging } from '../utils/evaluateConditions';

export interface GetSubscriptionsInput {
  tenantId: string;
  triggerType: string;
  payload?: Record<string, any>; // Optional: If provided, filters subscriptions by conditions
  verbose?: boolean; // Optional: Enable detailed condition logging
}

export interface GetSubscriptionsResult {
  success: boolean;
  subscriptions: TriggerSubscription[];
  count: number;
  filtered?: {
    total: number;
    matched: number;
    excluded: number;
  };
}

/**
 * Fetch active subscriptions for a trigger type
 * Optionally filters by payload conditions if payload is provided
 */
export async function callGetSubscriptions(
  input: GetSubscriptionsInput
): Promise<GetSubscriptionsResult> {
  const { tenantId, triggerType, payload, verbose = false } = input;

  console.log(`=📋 Fetching subscriptions for triggerType: ${triggerType}, tenant: ${tenantId}`);

  // Query for active subscriptions with this trigger type
  const allSubscriptions = await triggerSubscriptionManager.getSubscriptions(tenantId, {
    triggerType,
    enabled: true
  });

  console.log(`✅ Found ${allSubscriptions.length} active subscription(s)`);

  // If no payload provided, return all subscriptions (original behavior)
  if (!payload) {
    return {
      success: true,
      subscriptions: allSubscriptions,
      count: allSubscriptions.length
    };
  }

  // Filter subscriptions based on conditions.payload
  console.log(`🔍 Filtering subscriptions based on payload conditions...`);

  const filteredSubscriptions: TriggerSubscription[] = [];
  let excludedCount = 0;

  for (const subscription of allSubscriptions) {
    const conditions = subscription.conditions?.payload;

    if (verbose) {
      // Detailed logging for debugging
      const result = evaluateConditionsWithLogging(subscription.id, conditions, payload);
      if (result.match) {
        filteredSubscriptions.push(subscription);
      } else {
        excludedCount++;
        console.log(`   ⊘ Subscription ${subscription.id} excluded: ${result.reason}`);
      }
    } else {
      // Standard evaluation without verbose logging
      if (evaluateConditions(conditions, payload)) {
        filteredSubscriptions.push(subscription);
      } else {
        excludedCount++;
      }
    }
  }

  console.log(`✅ Filtered to ${filteredSubscriptions.length} matching subscription(s)`);
  if (excludedCount > 0) {
    console.log(`   ⊘ Excluded ${excludedCount} subscription(s) due to condition mismatch`);
  }

  return {
    success: true,
    subscriptions: filteredSubscriptions,
    count: filteredSubscriptions.length,
    filtered: {
      total: allSubscriptions.length,
      matched: filteredSubscriptions.length,
      excluded: excludedCount
    }
  };
}
