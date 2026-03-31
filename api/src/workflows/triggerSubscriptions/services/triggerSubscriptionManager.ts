/**
 * Trigger Subscription Manager Service
 * Central export for all CRUD operations
 */

import { createSubscription } from './triggerSubscriptionManager/createSubscription';
import { readSubscription } from './triggerSubscriptionManager/readSubscription';
import { getSubscriptions } from './triggerSubscriptionManager/getSubscriptions';
import { updateSubscription } from './triggerSubscriptionManager/updateSubscription';
import { deleteSubscription } from './triggerSubscriptionManager/deleteSubscription';

export const triggerSubscriptionManager = {
  createSubscription,
  readSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription
};
